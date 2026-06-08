"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";

import {
  resolveOrgLocale,
  saveContentTranslation,
} from "@/lib/i18n/content-translations";
import { createAdminClient } from "@/lib/supabase/server";
import { requireOrganizationContext } from "@/server/organization-context";
import { hasPermission } from "@/server/permissions";

type ActionResult = { ok: true } | { ok: false; error: string };

const legalSchema = z.object({
  docKey: z.enum(["privacy", "terms", "cookies"]),
  title: z.string().trim().max(200).nullable(),
  body: z.string().trim().max(40000).nullable(),
});
export type LegalInput = z.infer<typeof legalSchema>;

export async function updateLegalDocument(
  input: LegalInput,
  locale?: string,
): Promise<ActionResult> {
  const parsed = legalSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Please check the form." };
  }
  const context = await requireOrganizationContext();
  if (!context.organization) return { ok: false, error: "No organization." };
  if (!hasPermission(context, "branding.manage")) {
    return { ok: false, error: "You cannot edit pages." };
  }
  const org = context.organization;
  const target = resolveOrgLocale(org, locale);

  if (target === org.default_language) {
    const admin = createAdminClient();
    const { error } = await admin.from("legal_documents").upsert(
      {
        organization_id: org.id,
        doc_key: parsed.data.docKey,
        title: parsed.data.title,
        body: parsed.data.body,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "organization_id,doc_key" },
    );
    if (error) return { ok: false, error: "Could not save the document." };
  } else {
    const ok = await saveContentTranslation(
      org.id,
      "legal_document",
      parsed.data.docKey,
      target,
      { title: parsed.data.title, body: parsed.data.body },
    );
    if (!ok) return { ok: false, error: "Could not save the document." };
  }
  revalidatePath("/dashboard/about");
  revalidateTag("legal-docs");
  return { ok: true };
}
