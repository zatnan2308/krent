import type { OrganizationContext } from "@/server/organization-context";
import { hasPermission } from "@/server/permissions";

import type { Property } from "./types";

/**
 * Может ли пользователь редактировать объект.
 * Зеркалит SQL-функцию app_private.can_edit_property: назначенный агент,
 * со-агент или обладатель права properties.manage_all.
 */
export function canEditProperty(
  context: OrganizationContext,
  property: Pick<Property, "assigned_agent_id" | "co_agent_ids">,
): boolean {
  if (hasPermission(context, "properties.manage_all")) {
    return true;
  }
  return (
    property.assigned_agent_id === context.user.id ||
    property.co_agent_ids.includes(context.user.id)
  );
}
