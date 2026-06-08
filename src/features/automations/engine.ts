import { sendEmail } from "@/features/notifications/email";
import {
  htmlToText,
  renderHtml,
  renderText,
  wrapEmailHtml,
} from "@/features/notifications/render";
import { createAdminClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";

import type { AutomationTrigger } from "./constants";

type Admin = ReturnType<typeof createAdminClient>;
type AutomationRun = Tables<"automation_runs">;

/** Данные субъекта-триггера для постановки run'а в очередь. */
export interface AutomationSubject {
  subjectType: string;
  subjectId: string;
  contactId: string | null;
  /** Переменные подстановки + служебный email получателя. */
  variables: Record<string, string>;
}

/**
 * Ставит run'ы для всех активных флоу организации с данным триггером.
 * Best-effort: вызывающий код не должен падать из-за ошибок автоматизаций.
 */
export async function enqueueAutomationFlows(
  admin: Admin,
  organizationId: string,
  trigger: AutomationTrigger,
  subject: AutomationSubject,
): Promise<void> {
  const { data: flows } = await admin
    .from("automation_flows")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("trigger_event", trigger)
    .eq("is_active", true);
  if (!flows || flows.length === 0) {
    return;
  }
  const nowIso = new Date().toISOString();
  const rows = flows.map((flow) => ({
    organization_id: organizationId,
    automation_flow_id: flow.id,
    trigger_event: trigger,
    subject_type: subject.subjectType,
    subject_id: subject.subjectId,
    contact_id: subject.contactId,
    status: "pending",
    step_index: 0,
    next_run_at: nowIso,
    context: subject.variables,
  }));
  await admin.from("automation_runs").insert(rows);
}

/** Продвигает один run на один шаг (delay → отложить, send_email → отправить). */
async function processRun(admin: Admin, run: AutomationRun): Promise<void> {
  const { data: steps } = await admin
    .from("automation_steps")
    .select("step_type, config, sort_order")
    .eq("automation_flow_id", run.automation_flow_id)
    .order("sort_order", { ascending: true });
  const list = steps ?? [];

  // Все шаги пройдены — завершаем.
  if (run.step_index >= list.length) {
    await admin
      .from("automation_runs")
      .update({ status: "completed" })
      .eq("id", run.id);
    return;
  }

  const step = list[run.step_index];
  if (!step) {
    await admin
      .from("automation_runs")
      .update({ status: "completed" })
      .eq("id", run.id);
    return;
  }
  const variables = (run.context ?? {}) as unknown as Record<string, string>;
  const nextIndex = run.step_index + 1;
  const finishedStatus = nextIndex >= list.length ? "completed" : "pending";

  try {
    if (step.step_type === "delay") {
      const config = (step.config ?? {}) as unknown as { minutes?: number };
      const minutes = Number(config.minutes) || 0;
      const nextRunAt = new Date(Date.now() + minutes * 60_000).toISOString();
      await admin
        .from("automation_runs")
        .update({
          step_index: nextIndex,
          next_run_at: nextRunAt,
          status: finishedStatus,
        })
        .eq("id", run.id);
      return;
    }

    if (step.step_type === "send_email") {
      const config = (step.config ?? {}) as unknown as {
        subject?: string;
        body?: string;
      };
      const toEmail = variables.email ?? "";
      if (toEmail) {
        const companyName = variables.company_name ?? "";
        const subject = renderText(config.subject ?? "", variables);
        const html = wrapEmailHtml(
          renderHtml(config.body ?? "", variables),
          companyName,
        );
        await sendEmail({
          organizationId: run.organization_id,
          notificationEventId: null,
          templateKey: "automation",
          toEmail,
          fromName: companyName || "Krent",
          subject,
          html,
          text: htmlToText(html),
        });
      }
      await admin
        .from("automation_runs")
        .update({
          step_index: nextIndex,
          next_run_at: new Date().toISOString(),
          status: finishedStatus,
        })
        .eq("id", run.id);
      return;
    }

    // Неизвестный тип шага — пропускаем.
    await admin
      .from("automation_runs")
      .update({
        step_index: nextIndex,
        next_run_at: new Date().toISOString(),
        status: finishedStatus,
      })
      .eq("id", run.id);
  } catch (error) {
    await admin
      .from("automation_runs")
      .update({
        status: "failed",
        last_error:
          error instanceof Error ? error.message.slice(0, 500) : "error",
      })
      .eq("id", run.id);
  }
}

/** Обрабатывает «созревшие» run'ы (status=pending, next_run_at<=now). */
export async function processDueAutomationRuns(
  limit = 50,
): Promise<{ processed: number }> {
  const admin = createAdminClient();
  const nowIso = new Date().toISOString();
  const { data: runs } = await admin
    .from("automation_runs")
    .select("*")
    .eq("status", "pending")
    .lte("next_run_at", nowIso)
    .order("next_run_at", { ascending: true })
    .limit(limit);
  let processed = 0;
  for (const run of runs ?? []) {
    await processRun(admin, run);
    processed += 1;
  }
  return { processed };
}
