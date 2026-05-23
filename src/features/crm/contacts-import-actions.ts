"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createAdminClient } from "@/lib/supabase/server";
import { requireOrganizationContext } from "@/server/organization-context";
import { hasPermission } from "@/server/permissions";

export type CsvImportResult =
  | { ok: true; inserted: number; skipped: number }
  | { ok: false; error: string };

const rowSchema = z.object({
  fullName: z.string().trim().min(1),
  email: z.email().nullable(),
  phone: z.string().trim().max(60).nullable(),
});

/** Парсит CSV-строку (поддерживает quoted values и переводы строк). */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        cell += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        row.push(cell);
        cell = "";
      } else if (ch === "\n" || ch === "\r") {
        if (ch === "\r" && text[i + 1] === "\n") i += 1;
        row.push(cell);
        cell = "";
        rows.push(row);
        row = [];
      } else {
        cell += ch;
      }
    }
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim().length > 0));
}

/**
 * Импортирует CSV: колонки name|full_name, email, phone (любая комбинация
 * порядка, заголовки регистронезависимы). Возвращает количество добавленных
 * и пропущенных строк.
 */
export async function importContactsCsv(csv: string): Promise<CsvImportResult> {
  const context = await requireOrganizationContext();
  if (!context.organization) return { ok: false, error: "No organization." };
  if (!hasPermission(context, "crm.manage")) {
    return { ok: false, error: "You cannot import contacts." };
  }
  const rows = parseCsv(csv);
  if (rows.length < 2) {
    return { ok: false, error: "CSV is empty or has no header row." };
  }
  const header = rows[0];
  if (!header) {
    return { ok: false, error: "Missing header row." };
  }
  const headers = header.map((h) => h.trim().toLowerCase());
  const nameIdx = headers.findIndex((h) =>
    ["name", "full_name", "fullname", "client", "contact"].includes(h),
  );
  const emailIdx = headers.findIndex((h) => h === "email" || h === "e-mail");
  const phoneIdx = headers.findIndex((h) =>
    ["phone", "tel", "mobile", "whatsapp"].includes(h),
  );
  if (nameIdx === -1) {
    return { ok: false, error: "Header must contain a name/full_name column." };
  }

  const admin = createAdminClient();
  let inserted = 0;
  let skipped = 0;
  for (let i = 1; i < rows.length; i += 1) {
    const row = rows[i];
    if (!row) {
      skipped += 1;
      continue;
    }
    const candidate = {
      fullName: (row[nameIdx] ?? "").trim(),
      email: emailIdx >= 0 ? (row[emailIdx] ?? "").trim() || null : null,
      phone: phoneIdx >= 0 ? (row[phoneIdx] ?? "").trim() || null : null,
    };
    const parsed = rowSchema.safeParse(candidate);
    if (!parsed.success) {
      skipped += 1;
      continue;
    }
    const data = parsed.data;
    if (data.email) {
      const { data: existing } = await admin
        .from("contacts")
        .select("id")
        .eq("organization_id", context.organization.id)
        .eq("email", data.email.toLowerCase())
        .maybeSingle();
      if (existing) {
        skipped += 1;
        continue;
      }
    }
    const { error } = await admin.from("contacts").insert({
      organization_id: context.organization.id,
      full_name: data.fullName,
      email: data.email ? data.email.toLowerCase() : null,
      phone: data.phone,
    });
    if (error) {
      skipped += 1;
    } else {
      inserted += 1;
    }
  }
  revalidatePath("/dashboard/crm/contacts");
  return { ok: true, inserted, skipped };
}
