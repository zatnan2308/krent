import { createAdminClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";

type Admin = ReturnType<typeof createAdminClient>;

// ---- 1. Organizations list ---------------------------------

export interface OrganizationOverviewRow {
  id: string;
  name: string;
  slug: string;
  status: Tables<"organizations">["status"];
  type: Tables<"organizations">["type"];
  createdAt: string;
  memberCount: number;
  propertyCount: number;
  licenseStatus: Tables<"licenses">["status"] | null;
  licenseExpiresAt: string | null;
  installationType: Tables<"licenses">["installation_type"] | null;
  supportUntil: string | null;
  updatesUntil: string | null;
}

/** Сводный список организаций с количеством членов/объектов и активной лицензией. */
export async function listOrganizationOverviews(): Promise<
  OrganizationOverviewRow[]
> {
  const admin = createAdminClient();
  const { data: orgs } = await admin
    .from("organizations")
    .select("id, name, slug, status, type, created_at")
    .order("created_at", { ascending: false });
  if (!orgs || orgs.length === 0) {
    return [];
  }
  const ids = orgs.map((row) => row.id);
  const [members, properties, licenses] = await Promise.all([
    admin
      .from("organization_members")
      .select("organization_id")
      .in("organization_id", ids),
    admin
      .from("properties")
      .select("organization_id")
      .in("organization_id", ids),
    admin
      .from("licenses")
      .select(
        "organization_id, status, expires_at, issued_at, installation_type, support_until, updates_until",
      )
      .in("organization_id", ids),
  ]);
  const memberCount = countBy(members.data ?? [], "organization_id");
  const propertyCount = countBy(properties.data ?? [], "organization_id");
  type LicenseRow = NonNullable<typeof licenses.data>[number];
  const licensesByOrg = new Map<string, LicenseRow[]>();
  for (const row of licenses.data ?? []) {
    const list = licensesByOrg.get(row.organization_id) ?? [];
    list.push(row);
    licensesByOrg.set(row.organization_id, list);
  }
  return orgs.map((org) => {
    const orgLicenses = licensesByOrg.get(org.id) ?? [];
    const active =
      orgLicenses.find((row) => row.status === "active") ??
      orgLicenses[0] ??
      null;
    return {
      id: org.id,
      name: org.name,
      slug: org.slug,
      status: org.status,
      type: org.type,
      createdAt: org.created_at,
      memberCount: memberCount.get(org.id) ?? 0,
      propertyCount: propertyCount.get(org.id) ?? 0,
      licenseStatus: active?.status ?? null,
      licenseExpiresAt: active?.expires_at ?? null,
      installationType: active?.installation_type ?? null,
      supportUntil: active?.support_until ?? null,
      updatesUntil: active?.updates_until ?? null,
    };
  });
}

// ---- 2. Organization detail --------------------------------

export interface OrganizationDetail {
  organization: Tables<"organizations">;
  licenses: Tables<"licenses">[];
  enabledModules: { key: string; name: string; enabled: boolean }[];
  domains: Tables<"domains">[];
  members: { userId: string; roleId: string; status: string; createdAt: string }[];
  storage: { bucket: string; files: number; bytes: number }[];
  paymentProviders: {
    id: string;
    provider: string;
    mode: string;
    isEnabled: boolean;
    isDefault: boolean;
  }[];
  emailLogs: {
    id: string;
    createdAt: string;
    eventType: string;
    recipient: string;
    status: string;
  }[];
  integrations: {
    id: string;
    provider: string;
    status: string;
    accountId: string | null;
    displayName: string | null;
  }[];
  apiUsage: {
    totals: { requests: number; errors: number };
    series: { date: string; total: number; errors: number }[];
  };
  webhookLogs: Tables<"webhook_delivery_logs">[];
  health: {
    webhookEventsPending: number;
    notificationEventsPending: number;
    failedDeliveries24h: number;
  };
}

export async function getOrganizationDetail(
  organizationId: string,
): Promise<OrganizationDetail | null> {
  const admin = createAdminClient();
  const { data: organization } = await admin
    .from("organizations")
    .select("*")
    .eq("id", organizationId)
    .maybeSingle();
  if (!organization) {
    return null;
  }

  const [
    licenses,
    modulesAll,
    orgModules,
    domains,
    members,
    paymentProviders,
    integrations,
    integrationConnections,
    notificationLogs,
    webhookLogs,
  ] = await Promise.all([
    admin
      .from("licenses")
      .select("*")
      .eq("organization_id", organizationId)
      .order("starts_at", { ascending: false }),
    admin.from("modules").select("id, key, name"),
    admin
      .from("organization_modules")
      .select("module_id, enabled")
      .eq("organization_id", organizationId),
    admin
      .from("domains")
      .select("*")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false }),
    admin
      .from("organization_members")
      .select("user_id, role_id, status, created_at")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false }),
    admin
      .from("payment_providers")
      .select("id, provider, mode, is_enabled, is_default")
      .eq("organization_id", organizationId),
    admin
      .from("integration_connections")
      .select("id, provider, status, account_id, display_name")
      .eq("organization_id", organizationId),
    admin
      .from("integration_connections")
      .select("id")
      .eq("organization_id", organizationId),
    admin
      .from("notification_logs")
      .select("id, created_at, event_type, recipient_email, status")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .limit(25),
    admin
      .from("webhook_delivery_logs")
      .select("*")
      .eq("organization_id", organizationId)
      .order("attempted_at", { ascending: false })
      .limit(25),
  ]);

  void integrationConnections;

  const moduleNameById = new Map(
    (modulesAll.data ?? []).map((row) => [row.id, { key: row.key, name: row.name }]),
  );
  const enabledByModule = new Map(
    (orgModules.data ?? []).map((row) => [row.module_id, row.enabled]),
  );
  const enabledModules = (modulesAll.data ?? []).map((row) => ({
    key: row.key,
    name: row.name,
    enabled: enabledByModule.get(row.id) ?? false,
  }));

  const storage = await summarizeStorage(admin, organizationId);
  const apiUsage = await summarizeApiUsage(admin, organizationId, 14);
  const health = await summarizeHealth(admin, organizationId);

  void moduleNameById;

  return {
    organization,
    licenses: licenses.data ?? [],
    enabledModules,
    domains: domains.data ?? [],
    members: (members.data ?? []).map((row) => ({
      userId: row.user_id,
      roleId: row.role_id,
      status: row.status,
      createdAt: row.created_at,
    })),
    storage,
    paymentProviders: (paymentProviders.data ?? []).map((row) => ({
      id: row.id,
      provider: row.provider,
      mode: row.mode,
      isEnabled: row.is_enabled,
      isDefault: row.is_default,
    })),
    emailLogs: (notificationLogs.data ?? []).map((row) => ({
      id: row.id,
      createdAt: row.created_at,
      eventType: row.event_type,
      recipient: row.recipient_email,
      status: row.status,
    })),
    integrations: (integrations.data ?? []).map((row) => ({
      id: row.id,
      provider: row.provider,
      status: row.status,
      accountId: row.account_id,
      displayName: row.display_name,
    })),
    apiUsage,
    webhookLogs: webhookLogs.data ?? [],
    health,
  };
}

// ---- 7. Storage usage --------------------------------------

const TRACKED_BUCKETS = ["property-media", "chat-attachments", "branding"];

async function summarizeStorage(
  admin: Admin,
  organizationId: string,
): Promise<{ bucket: string; files: number; bytes: number }[]> {
  const result: { bucket: string; files: number; bytes: number }[] = [];
  for (const bucket of TRACKED_BUCKETS) {
    try {
      const { data } = await admin.storage
        .from(bucket)
        .list(organizationId, { limit: 1000 });
      let files = 0;
      let bytes = 0;
      for (const item of data ?? []) {
        if (item.metadata && typeof item.metadata.size === "number") {
          bytes += item.metadata.size;
        }
        files += 1;
      }
      result.push({ bucket, files, bytes });
    } catch {
      result.push({ bucket, files: 0, bytes: 0 });
    }
  }
  return result;
}

// ---- 11. API usage -----------------------------------------

async function summarizeApiUsage(
  admin: Admin,
  organizationId: string,
  days: number,
): Promise<OrganizationDetail["apiUsage"]> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const { data } = await admin
    .from("api_usage_logs")
    .select("status, occurred_at")
    .eq("organization_id", organizationId)
    .gte("occurred_at", since);
  let totalRequests = 0;
  let totalErrors = 0;
  const buckets = new Map<string, { total: number; errors: number }>();
  for (const row of data ?? []) {
    const day = row.occurred_at.slice(0, 10);
    const bucket = buckets.get(day) ?? { total: 0, errors: 0 };
    bucket.total += 1;
    if (row.status >= 400) {
      bucket.errors += 1;
      totalErrors += 1;
    }
    totalRequests += 1;
    buckets.set(day, bucket);
  }
  return {
    totals: { requests: totalRequests, errors: totalErrors },
    series: [...buckets.entries()]
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([date, b]) => ({ date, total: b.total, errors: b.errors })),
  };
}

// ---- 13. Health --------------------------------------------

async function summarizeHealth(
  admin: Admin,
  organizationId: string,
): Promise<OrganizationDetail["health"]> {
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const [pendingWebhooks, pendingNotifications, failedDeliveries] = await Promise.all(
    [
      admin
        .from("webhook_events")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", organizationId)
        .eq("status", "pending"),
      admin
        .from("notification_events")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", organizationId)
        .eq("status", "pending"),
      admin
        .from("webhook_delivery_logs")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", organizationId)
        .eq("status", "failed")
        .gte("attempted_at", dayAgo),
    ],
  );
  return {
    webhookEventsPending: pendingWebhooks.count ?? 0,
    notificationEventsPending: pendingNotifications.count ?? 0,
    failedDeliveries24h: failedDeliveries.count ?? 0,
  };
}

// ---- Global users list --------------------------------------

export interface PlatformUserRow {
  id: string;
  email: string | null;
  createdAt: string;
  lastSignInAt: string | null;
  memberships: { organizationId: string; organizationName: string }[];
}

/** Список всех пользователей платформы (через admin.auth.listUsers). */
export async function listPlatformUsers(limit = 50): Promise<PlatformUserRow[]> {
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: limit,
  });
  if (error || !data) {
    return [];
  }
  const userIds = data.users.map((user) => user.id);
  if (userIds.length === 0) {
    return [];
  }
  const { data: memberships } = await admin
    .from("organization_members")
    .select("user_id, organization_id, organizations(name)")
    .in("user_id", userIds);
  const byUser = new Map<
    string,
    { organizationId: string; organizationName: string }[]
  >();
  for (const row of memberships ?? []) {
    const arr = byUser.get(row.user_id) ?? [];
    const orgName =
      (row.organizations as { name: string | null } | null)?.name ?? "Unknown";
    arr.push({ organizationId: row.organization_id, organizationName: orgName });
    byUser.set(row.user_id, arr);
  }
  return data.users.map((user) => ({
    id: user.id,
    email: user.email ?? null,
    createdAt: user.created_at,
    lastSignInAt: user.last_sign_in_at ?? null,
    memberships: byUser.get(user.id) ?? [],
  }));
}

// ---- Global system health -----------------------------------

export interface SystemHealth {
  organizations: { total: number; active: number; suspended: number };
  users: { total: number };
  properties: { total: number; published: number };
  bookings: { total: number; confirmed: number };
  webhooks: { pending: number; failed24h: number };
  notifications: { pending: number; failed24h: number };
  apiUsage7d: { requests: number; errors: number };
}

export async function getSystemHealth(): Promise<SystemHealth> {
  const admin = createAdminClient();
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [
    orgsAll,
    orgsActive,
    orgsSuspended,
    propsAll,
    propsPublished,
    bookingsAll,
    bookingsConfirmed,
    webhooksPending,
    webhooksFailed,
    notifsPending,
    notifsFailed,
    apiUsage,
    memberUsers,
    portalUsers,
  ] = await Promise.all([
    admin.from("organizations").select("id", { count: "exact", head: true }),
    admin
      .from("organizations")
      .select("id", { count: "exact", head: true })
      .eq("status", "active"),
    admin
      .from("organizations")
      .select("id", { count: "exact", head: true })
      .eq("status", "suspended"),
    admin.from("properties").select("id", { count: "exact", head: true }),
    admin
      .from("properties")
      .select("id", { count: "exact", head: true })
      .eq("status", "active")
      .eq("visibility", "public"),
    admin.from("rental_bookings").select("id", { count: "exact", head: true }),
    admin
      .from("rental_bookings")
      .select("id", { count: "exact", head: true })
      .eq("status", "confirmed"),
    admin
      .from("webhook_events")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    admin
      .from("webhook_delivery_logs")
      .select("id", { count: "exact", head: true })
      .eq("status", "failed")
      .gte("attempted_at", dayAgo),
    admin
      .from("notification_events")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    admin
      .from("notification_logs")
      .select("id", { count: "exact", head: true })
      .eq("status", "failed")
      .gte("created_at", dayAgo),
    admin
      .from("api_usage_logs")
      .select("status, occurred_at")
      .gte("occurred_at", weekAgo),
    admin.from("organization_members").select("user_id"),
    admin.from("portal_accounts").select("user_id"),
  ]);

  let requests = 0;
  let errors = 0;
  for (const row of apiUsage.data ?? []) {
    requests += 1;
    if (row.status >= 400) errors += 1;
  }

  // Уникальные пользователи платформы: сотрудники (organization_members) +
  // активированные клиенты порталов (portal_accounts.user_id). Детерминированно,
  // в отличие от непроверенного GoTrue listUsers().total.
  const userIds = new Set<string>();
  for (const row of memberUsers.data ?? []) {
    if (row.user_id) userIds.add(row.user_id);
  }
  for (const row of portalUsers.data ?? []) {
    if (row.user_id) userIds.add(row.user_id);
  }
  const totalUsers = userIds.size;

  return {
    organizations: {
      total: orgsAll.count ?? 0,
      active: orgsActive.count ?? 0,
      suspended: orgsSuspended.count ?? 0,
    },
    users: { total: totalUsers },
    properties: {
      total: propsAll.count ?? 0,
      published: propsPublished.count ?? 0,
    },
    bookings: {
      total: bookingsAll.count ?? 0,
      confirmed: bookingsConfirmed.count ?? 0,
    },
    webhooks: {
      pending: webhooksPending.count ?? 0,
      failed24h: webhooksFailed.count ?? 0,
    },
    notifications: {
      pending: notifsPending.count ?? 0,
      failed24h: notifsFailed.count ?? 0,
    },
    apiUsage7d: { requests, errors },
  };
}

function countBy<T extends Record<string, string | number>>(
  rows: T[],
  key: keyof T,
): Map<string, number> {
  const map = new Map<string, number>();
  for (const row of rows) {
    const value = String(row[key]);
    map.set(value, (map.get(value) ?? 0) + 1);
  }
  return map;
}
