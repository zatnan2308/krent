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

/** Жёсткий лимит строк на один импорт и размеры пакетов запросов. */
const MAX_IMPORT_ROWS = 1000;
const LOOKUP_CHUNK = 200;
const INSERT_CHUNK = 200;

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

  const dataRows = rows.slice(1);
  if (dataRows.length > MAX_IMPORT_ROWS) {
    return {
      ok: false,
      error: `Too many rows (${dataRows.length}). Import at most ${MAX_IMPORT_ROWS} contacts per file.`,
    };
  }

  const admin = createAdminClient();
  const organizationId = context.organization.id;
  let skipped = 0;

  // 1) Валидируем строки и дедуплицируем по email внутри самого файла.
  const seenEmails = new Set<string>();
  const candidates: { fullName: string; email: string | null; phone: string | null }[] =
    [];
  for (const row of dataRows) {
    if (!row) {
      skipped += 1;
      continue;
    }
    const parsed = rowSchema.safeParse({
      fullName: (row[nameIdx] ?? "").trim(),
      email: emailIdx >= 0 ? (row[emailIdx] ?? "").trim() || null : null,
      phone: phoneIdx >= 0 ? (row[phoneIdx] ?? "").trim() || null : null,
    });
    if (!parsed.success) {
      skipped += 1;
      continue;
    }
    const email = parsed.data.email ? parsed.data.email.toLowerCase() : null;
    if (email) {
      if (seenEmails.has(email)) {
        skipped += 1;
        continue;
      }
      seenEmails.add(email);
    }
    candidates.push({
      fullName: parsed.data.fullName,
      email,
      phone: parsed.data.phone,
    });
  }

  // 2) Пакетно (чанками) находим уже существующие email в организации.
  const existing = new Set<string>();
  const emails = [...seenEmails];
  for (let i = 0; i < emails.length; i += LOOKUP_CHUNK) {
    const { data } = await admin
      .from("contacts")
      .select("email")
      .eq("organization_id", organizationId)
      .in("email", emails.slice(i, i + LOOKUP_CHUNK));
    for (const c of data ?? []) {
      if (c.email) existing.add(c.email.toLowerCase());
    }
  }

  // 3) Отбрасываем дубликаты по существующим email и готовим строки.
  const toInsert = candidates
    .filter((c) => {
      if (c.email && existing.has(c.email)) {
        skipped += 1;
        return false;
      }
      return true;
    })
    .map((c) => ({
      organization_id: organizationId,
      full_name: c.fullName,
      email: c.email,
      phone: c.phone,
    }));

  // 4) Пакетная вставка; при ошибке чанка — построчно, чтобы не терять счёт.
  let inserted = 0;
  for (let i = 0; i < toInsert.length; i += INSERT_CHUNK) {
    const chunk = toInsert.slice(i, i + INSERT_CHUNK);
    const { error } = await admin.from("contacts").insert(chunk);
    if (!error) {
      inserted += chunk.length;
      continue;
    }
    for (const oneRow of chunk) {
      const { error: rowError } = await admin.from("contacts").insert(oneRow);
      if (rowError) skipped += 1;
      else inserted += 1;
    }
  }

  revalidatePath("/dashboard/crm/contacts");
  return { ok: true, inserted, skipped };
}
