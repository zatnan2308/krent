import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getOrganizationDetail } from "@/features/super-admin/queries";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { ROUTES } from "@/lib/constants/routes";
import { resolveUserNames } from "@/server/user-directory";

export const dynamic = "force-dynamic";

interface PageProps {
  params: { id: string };
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const detail = await getOrganizationDetail(params.id);
  return {
    title: detail
      ? `${detail.organization.name} · Super Admin`
      : "Organization · Super Admin",
  };
}

function bytesFormat(value: number): string {
  if (value === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let n = value;
  let i = 0;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i += 1;
  }
  return `${n.toFixed(n >= 10 ? 0 : 1)} ${units[i]}`;
}

export default async function OrganizationDetailPage({ params }: PageProps) {
  const detail = await getOrganizationDetail(params.id);
  if (!detail) {
    notFound();
  }

  const memberNames = await resolveUserNames(
    detail.members.map((row) => row.userId),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: "Organizations", href: ROUTES.superAdmin.organizations },
          { label: detail.organization.name },
        ]}
        title={detail.organization.name}
        actions={
          <Badge
            variant={
              detail.organization.status === "active" ? "default" : "secondary"
            }
          >
            {detail.organization.status}
          </Badge>
        }
      />
      <p className="-mt-3 text-sm text-muted-foreground">
        Slug: <code>{detail.organization.slug}</code> · Type:{" "}
        <span className="capitalize">{detail.organization.type}</span> ·
        Timezone: {detail.organization.timezone} · Created{" "}
        {new Date(detail.organization.created_at).toLocaleDateString()}
      </p>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* 3. Licenses */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Licenses</CardTitle>
          </CardHeader>
          <CardContent>
            {detail.licenses.length === 0 ? (
              <p className="text-sm text-muted-foreground">No license issued.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {detail.licenses.map((row) => (
                  <li key={row.id} className="rounded-md border p-2">
                    <p className="font-medium">
                      {row.client_name ?? "—"}{" "}
                      <span className="text-xs text-muted-foreground">
                        · {row.installation_type}
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Status: {row.status} · Issued{" "}
                      {new Date(row.issued_at).toLocaleDateString()}
                      {row.support_until
                        ? ` · Support until ${new Date(row.support_until).toLocaleDateString()}`
                        : ""}
                      {row.updates_until
                        ? ` · Updates until ${new Date(row.updates_until).toLocaleDateString()}`
                        : ""}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Domain: {row.domain ?? "—"} · Email:{" "}
                      {row.client_email ?? "—"} · Version:{" "}
                      {row.product_version ?? "—"}
                    </p>
                    <p className="break-all font-mono text-xs text-muted-foreground">
                      {row.license_key}
                    </p>
                    {row.notes ? (
                      <p className="mt-1 text-xs">{row.notes}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* 4. Enabled modules */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Enabled modules</CardTitle>
          </CardHeader>
          <CardContent>
            {detail.enabledModules.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No modules registered.
              </p>
            ) : (
              <ul className="grid grid-cols-1 gap-1 text-sm sm:grid-cols-2">
                {detail.enabledModules.map((row) => (
                  <li
                    key={row.key}
                    className="flex items-center justify-between gap-2 rounded-md border p-2"
                  >
                    <span>
                      <code className="text-xs">{row.key}</code> · {row.name}
                    </span>
                    <Badge variant={row.enabled ? "default" : "secondary"}>
                      {row.enabled ? "On" : "Off"}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* 5. Domains */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Domains</CardTitle>
          </CardHeader>
          <CardContent>
            {detail.domains.length === 0 ? (
              <p className="text-sm text-muted-foreground">No domains.</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {detail.domains.map((row) => (
                  <li
                    key={row.id}
                    className="flex items-center justify-between gap-2"
                  >
                    <code className="text-xs">{row.domain}</code>
                    <Badge variant={row.status === "verified" ? "default" : "secondary"}>
                      {row.status}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* 6. Users / members */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Members</CardTitle>
          </CardHeader>
          <CardContent>
            {detail.members.length === 0 ? (
              <p className="text-sm text-muted-foreground">No members.</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {detail.members.slice(0, 25).map((row) => (
                  <li
                    key={row.userId}
                    className="flex items-center justify-between gap-2"
                  >
                    <span>{memberNames.get(row.userId) ?? row.userId}</span>
                    <span className="text-xs text-muted-foreground">
                      {row.status}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* 7. Storage usage */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Storage usage</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1 text-sm">
              {detail.storage.map((row) => (
                <li
                  key={row.bucket}
                  className="flex items-center justify-between gap-2"
                >
                  <code className="text-xs">{row.bucket}</code>
                  <span className="text-xs text-muted-foreground">
                    {row.files} files · {bytesFormat(row.bytes)}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-muted-foreground">
              Approximate, based on first 1000 entries per bucket.
            </p>
          </CardContent>
        </Card>

        {/* 8. Payment providers status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Payment providers</CardTitle>
          </CardHeader>
          <CardContent>
            {detail.paymentProviders.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No payment providers configured.
              </p>
            ) : (
              <ul className="space-y-1 text-sm">
                {detail.paymentProviders.map((row) => (
                  <li
                    key={row.id}
                    className="flex items-center justify-between gap-2"
                  >
                    <span className="capitalize">
                      {row.provider} · {row.mode}
                    </span>
                    <span className="flex items-center gap-2">
                      {row.isDefault ? <Badge variant="outline">default</Badge> : null}
                      <Badge variant={row.isEnabled ? "default" : "secondary"}>
                        {row.isEnabled ? "Enabled" : "Disabled"}
                      </Badge>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* 10. Integration status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Integrations</CardTitle>
          </CardHeader>
          <CardContent>
            {detail.integrations.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No integrations connected.
              </p>
            ) : (
              <ul className="space-y-1 text-sm">
                {detail.integrations.map((row) => (
                  <li
                    key={row.id}
                    className="flex items-center justify-between gap-2"
                  >
                    <span>
                      <code className="text-xs">{row.provider}</code> ·{" "}
                      {row.displayName}
                    </span>
                    <Badge variant={row.status === "connected" ? "default" : "secondary"}>
                      {row.status}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* 13. Health summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Health</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p>
              Webhook events pending:{" "}
              <strong>{detail.health.webhookEventsPending}</strong>
            </p>
            <p>
              Notification events pending:{" "}
              <strong>{detail.health.notificationEventsPending}</strong>
            </p>
            <p>
              Failed webhook deliveries (24h):{" "}
              <strong>{detail.health.failedDeliveries24h}</strong>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 9. Email logs */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Email logs (recent 25)</CardTitle>
        </CardHeader>
        <CardContent>
          {detail.emailLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No email events yet.</p>
          ) : (
            <ul className="space-y-1 text-xs">
              {detail.emailLogs.map((row) => (
                <li
                  key={row.id}
                  className="flex flex-wrap items-center justify-between gap-2 border-b pb-1"
                >
                  <span>
                    <code>{row.eventType}</code> → {row.recipient}
                  </span>
                  <span className="text-muted-foreground">
                    {row.status} · {new Date(row.createdAt).toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* 11. API usage */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">API usage (14 days)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            Requests: <strong>{detail.apiUsage.totals.requests}</strong> · Errors:{" "}
            <strong>{detail.apiUsage.totals.errors}</strong>
          </p>
          {detail.apiUsage.series.length > 0 ? (
            <ul className="text-xs text-muted-foreground">
              {detail.apiUsage.series.slice(-7).map((row) => (
                <li key={row.date}>
                  {row.date}: {row.total} req · {row.errors} errors
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-muted-foreground">No traffic yet.</p>
          )}
        </CardContent>
      </Card>

      {/* 12. Webhook logs */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Webhook delivery logs (recent 25)</CardTitle>
        </CardHeader>
        <CardContent>
          {detail.webhookLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No deliveries yet.</p>
          ) : (
            <ul className="space-y-1 text-xs">
              {detail.webhookLogs.map((row) => (
                <li
                  key={row.id}
                  className="flex flex-wrap items-center justify-between gap-2 border-b pb-1"
                >
                  <span>
                    Attempt {row.attempt} ·{" "}
                    <span className="text-muted-foreground">{row.status}</span> ·
                    HTTP {row.response_code ?? "—"}
                  </span>
                  <span className="text-muted-foreground">
                    {new Date(row.attempted_at).toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
