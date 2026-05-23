/**
 * Основа управления доступом на основе ролей (RBAC).
 *
 * Роли делятся на три области:
 *  - platform:     действия во всех организациях (Super Admin).
 *  - organization: действия в рамках одной организации (граница арендатора).
 *  - client:       внешние пользователи, доступ только к порталам.
 */

export const ROLES = {
  superAdmin: "super_admin",
  orgOwner: "org_owner",
  orgAdmin: "org_admin",
  agent: "agent",
  staff: "staff",
  buyer: "buyer",
  seller: "seller",
  tenant: "tenant",
  guest: "guest",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const ROLE_SCOPES = {
  platform: ["super_admin"],
  organization: ["org_owner", "org_admin", "agent", "staff"],
  client: ["buyer", "seller", "tenant", "guest"],
} as const;

export type RoleScope = keyof typeof ROLE_SCOPES;

/** Больший ранг = больше полномочий. Для иерархических проверок в области. */
export const ROLE_RANK: Record<Role, number> = {
  super_admin: 100,
  org_owner: 80,
  org_admin: 60,
  agent: 40,
  staff: 20,
  seller: 10,
  buyer: 10,
  tenant: 10,
  guest: 0,
};

export function getRoleScope(role: Role): RoleScope {
  if ((ROLE_SCOPES.platform as readonly Role[]).includes(role)) {
    return "platform";
  }
  if ((ROLE_SCOPES.organization as readonly Role[]).includes(role)) {
    return "organization";
  }
  return "client";
}

export function isPlatformRole(role: Role): boolean {
  return getRoleScope(role) === "platform";
}

export function isOrganizationRole(role: Role): boolean {
  return getRoleScope(role) === "organization";
}

/**
 * Контекст авторизации, вычисляемый для каждого запроса к данным
 * организации. `organizationId` задаёт границу multi-tenant; он равен null
 * только для действий уровня платформы (Super Admin).
 */
export interface AccessContext {
  userId: string;
  organizationId: string | null;
  role: Role;
}
