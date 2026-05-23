import { NextResponse } from "next/server";

import { setMarketingConsent } from "@/features/campaigns/consent";
import { createAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Простая HTML-страница ответа эндпоинта отписки. */
function htmlPage(title: string, message: string): NextResponse {
  const safe = (value: string) =>
    value.replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const body = [
    "<!DOCTYPE html>",
    '<html lang="en"><head><meta charset="utf-8"/>',
    '<meta name="viewport" content="width=device-width, initial-scale=1"/>',
    `<title>${safe(title)}</title></head>`,
    '<body style="margin:0;font-family:Arial,Helvetica,sans-serif;background:#f4f4f5;color:#18181b;">',
    '<div style="max-width:420px;margin:80px auto;background:#ffffff;border-radius:8px;padding:32px;text-align:center;">',
    `<h1 style="font-size:20px;margin:0 0 12px;">${safe(title)}</h1>`,
    `<p style="color:#71717a;font-size:14px;margin:0;">${safe(message)}</p>`,
    "</div></body></html>",
  ].join("");
  return new NextResponse(body, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

/**
 * Эндпоинт отписки от маркетинговых писем. Ссылка из письма несёт
 * персональный токен получателя; переход отзывает согласие на
 * маркетинг и фиксирует отписку. Операция идемпотентна.
 */
export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token");
  if (!token) {
    return htmlPage(
      "Invalid link",
      "This unsubscribe link is missing its token.",
    );
  }

  const admin = createAdminClient();
  const { data: recipient } = await admin
    .from("campaign_recipients")
    .select("organization_id, contact_id, campaign_id, email")
    .eq("unsubscribe_token", token)
    .maybeSingle();
  if (!recipient) {
    return htmlPage(
      "Invalid link",
      "This unsubscribe link is no longer valid.",
    );
  }

  const { data: existing } = await admin
    .from("email_unsubscribes")
    .select("id")
    .eq("organization_id", recipient.organization_id)
    .ilike("email", recipient.email.toLowerCase())
    .maybeSingle();

  if (!existing) {
    await admin.from("email_unsubscribes").insert({
      organization_id: recipient.organization_id,
      contact_id: recipient.contact_id,
      campaign_id: recipient.campaign_id,
      email: recipient.email,
      source: "unsubscribe_link",
    });
    if (recipient.contact_id) {
      await setMarketingConsent(
        admin,
        recipient.organization_id,
        recipient.contact_id,
        false,
        "unsubscribe_link",
      );
    }
    if (recipient.campaign_id) {
      const { data: report } = await admin
        .from("campaign_reports")
        .select("id, unsubscribed_count")
        .eq("campaign_id", recipient.campaign_id)
        .maybeSingle();
      if (report) {
        await admin
          .from("campaign_reports")
          .update({ unsubscribed_count: report.unsubscribed_count + 1 })
          .eq("id", report.id);
      }
    }
  }

  return htmlPage(
    "You are unsubscribed",
    "You will no longer receive marketing emails from this sender.",
  );
}
