import { createAdminClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database";

interface AuditInput {
  organizationId: string | null;
  userId: string | null;
  action: string;
  entityType?: string | null;
  entityId?: string | null;
  metadata?: Record<string, unknown> | null;
}

/**
 * Логирует чувствительное действие в audit_logs.
 * Ошибки глотаются — аудит не должен ломать основной flow.
 */
export async function logAudit(input: AuditInput): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin.from("audit_logs").insert({
      organization_id: input.organizationId,
      user_id: input.userId,
      action: input.action,
      entity_type: input.entityType ?? null,
      entity_id: input.entityId ?? null,
      metadata: (input.metadata ?? {}) as unknown as Json,
    });
  } catch {
    // intentionally silent: audit failures are not user-facing
  }
}
