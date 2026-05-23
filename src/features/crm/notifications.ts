import {
  createNotificationEvent,
  resolveUserRecipient,
} from "@/features/notifications/dispatcher";
import { getClientEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/server";

interface NewLeadEvent {
  organizationId: string;
  leadId: string;
  contactName: string;
  leadType: string;
  source: string | null;
}

type Admin = ReturnType<typeof createAdminClient>;

/** Шаблон письма-подтверждения по источнику лида. */
function confirmationTemplate(source: string | null): string {
  if (source === "showing_request") {
    return "showing.confirmation";
  }
  if (source === "valuation_request") {
    return "valuation.confirmation";
  }
  return "contact.confirmation";
}

/**
 * Рассылает письма по новому лиду: подтверждение отправителю формы и
 * уведомление назначенному агенту.
 */
async function dispatchLeadEmails(
  admin: Admin,
  event: NewLeadEvent,
): Promise<void> {
  const { data: lead } = await admin
    .from("leads")
    .select("contact_id, property_id, assigned_agent_id")
    .eq("id", event.leadId)
    .maybeSingle();
  if (!lead) {
    return;
  }

  let propertyTitle = "";
  let propertyUrl = "";
  if (lead.property_id) {
    const { data: property } = await admin
      .from("properties")
      .select("title, slug")
      .eq("id", lead.property_id)
      .maybeSingle();
    if (property) {
      propertyTitle = property.title;
      propertyUrl = `${getClientEnv().NEXT_PUBLIC_SITE_URL}/properties/${property.slug}`;
    }
  }
  const variables = {
    property_title: propertyTitle,
    property_url: propertyUrl,
  };

  // Подтверждение отправителю формы.
  if (lead.contact_id) {
    const { data: contact } = await admin
      .from("contacts")
      .select("full_name, email")
      .eq("id", lead.contact_id)
      .maybeSingle();
    if (contact?.email) {
      await createNotificationEvent({
        organizationId: event.organizationId,
        eventType: confirmationTemplate(event.source),
        entityType: "lead",
        entityId: event.leadId,
        recipients: [{ email: contact.email, name: contact.full_name }],
        variables,
      });
    }
  }

  // Уведомление назначенному агенту.
  if (lead.assigned_agent_id) {
    const agent = await resolveUserRecipient(lead.assigned_agent_id);
    if (agent) {
      await createNotificationEvent({
        organizationId: event.organizationId,
        eventType: "lead.created",
        entityType: "lead",
        entityId: event.leadId,
        recipients: [
          {
            email: agent.email,
            name: agent.name,
            userId: lead.assigned_agent_id,
          },
        ],
        variables: { ...variables, agent_name: agent.name ?? "" },
      });
    }
  }
}

/**
 * Уведомление о новом лиде. Фиксирует событие в audit_logs и запускает
 * транзакционные письма через Notification Center.
 */
export async function notifyNewLead(event: NewLeadEvent): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin.from("audit_logs").insert({
      organization_id: event.organizationId,
      action: "lead.created",
      entity_type: "lead",
      entity_id: event.leadId,
      metadata: {
        contact_name: event.contactName,
        lead_type: event.leadType,
        source: event.source,
        notification: "dispatched",
      },
    });
    await dispatchLeadEmails(admin, event);
  } catch {
    // Логирование и письма не должны ломать отправку формы.
  }
}
