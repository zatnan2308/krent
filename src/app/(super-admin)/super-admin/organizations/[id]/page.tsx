import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { OrganizationStatusButtons } from "@/features/super-admin/organization-status-buttons";
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
import { getServerDictionary } from "@/lib/i18n/runtime";

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
  const dict = await getServerDictionary();
  const t = dict.superAdmin;

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: t.organizations, href: ROUTES.superAdmin.organizations },
          { label: detail.organization.name },
        ]}
        title={detail.organization.name}
        actions={
          <div className="flex items-center gap-3">
            <Badge
              variant={
                detail.organization.status === "active"
                  ? "default"
                  : "secondary"
              }
            >
              {detail.organization.status}
            </Badge>
            <OrganizationStatusButtons
              id={detail.organization.id}
              status={detail.organization.status}
            />
          </div>
        }
      />
      <p className="-mt-3 text-sm text-muted-foreground">
        {t.colSlug}: <code>{detail.organization.slug}</code> · {t.colType}:{" "}
        <span className="capitalize">{detail.organization.type}</span> ·{" "}
        {t.lblTimezone}: {detail.organization.timezone} · {t.colCreated}{" "}
        {new Date(detail.organization.created_at).toLocaleDateString()}
      </p>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* 3. Licenses */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{dict.adminNav.licenses}</CardTitle>
          </CardHeader>
          <CardContent>
            {detail.licenses.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t.noLicenseIssued}</p>
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
                      {t.colStatus}: {row.status} · {t.lblIssued}{" "}
                      {new Date(row.issued_at).toLocaleDateString()}
                      {row.support_until
                        ? ` · ${t.lblSupportUntil} ${new Date(row.support_until).toLocaleDateString()}`
                        : ""}
                      {row.updates_until
                        ? ` · ${t.lblUpdatesUntil} ${new Date(row.updates_until).toLocaleDateString()}`
                        : ""}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t.lblDomain}: {row.domain ?? "—"} · {t.lblEmail}:{" "}
                      {row.client_email ?? "—"} · {t.lblVersion}:{" "}
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
            <CardTitle className="text-base">{t.secEnabledModules}</CardTitle>
          </CardHeader>
          <CardContent>
            {detail.enabledModules.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t.noModulesRegistered}
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
                      {row.enabled ? t.onWord : t.offWord}
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
            <CardTitle className="text-base">{t.secDomains}</CardTitle>
          </CardHeader>
          <CardContent>
            {detail.domains.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t.noDomains}</p>
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
            <CardTitle className="text-base">{t.members}</CardTitle>
          </CardHeader>
          <CardContent>
            {detail.members.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t.noMembers}</p>
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
            <CardTitle className="text-base">{t.secStorageUsage}</CardTitle>
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
                    {row.files} {t.filesWord} · {bytesFormat(row.bytes)}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-muted-foreground">
              {t.storageApprox}
            </p>
          </CardContent>
        </Card>

        {/* 8. Payment providers status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t.secPaymentProviders}</CardTitle>
          </CardHeader>
          <CardContent>
            {detail.paymentProviders.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t.noPaymentProviders}
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
                      {row.isDefault ? <Badge variant="outline">{t.providerDefault}</Badge> : null}
                      <Badge variant={row.isEnabled ? "default" : "secondary"}>
                        {row.isEnabled ? t.enabledWord : t.disabledWord}
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
            <CardTitle className="text-base">{dict.adminNav.integrations}</CardTitle>
          </CardHeader>
          <CardContent>
            {detail.integrations.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t.noIntegrations}
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
            <CardTitle className="text-base">{t.secHealth}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p>
              {t.webhookEventsPending}:{" "}
              <strong>{detail.health.webhookEventsPending}</strong>
            </p>
            <p>
              {t.notificationEventsPending}:{" "}
              <strong>{detail.health.notificationEventsPending}</strong>
            </p>
            <p>
              {t.failedWebhook24h}:{" "}
              <strong>{detail.health.failedDeliveries24h}</strong>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 9. Email logs */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t.secEmailLogs}</CardTitle>
        </CardHeader>
        <CardContent>
          {detail.emailLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t.noEmailEvents}</p>
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
          <CardTitle className="text-base">{t.secApiUsage}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            {t.rowRequests}: <strong>{detail.apiUsage.totals.requests}</strong> · {t.rowErrors}:{" "}
            <strong>{detail.apiUsage.totals.errors}</strong>
          </p>
          {detail.apiUsage.series.length > 0 ? (
            <ul className="text-xs text-muted-foreground">
              {detail.apiUsage.series.slice(-7).map((row) => (
                <li key={row.date}>
                  {row.date}: {row.total} {t.reqAbbrev} · {row.errors} {t.errorsWord}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-muted-foreground">{t.noTraffic}</p>
          )}
        </CardContent>
      </Card>

      {/* 12. Webhook logs */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t.secWebhookLogs}</CardTitle>
        </CardHeader>
        <CardContent>
          {detail.webhookLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t.noDeliveries}</p>
          ) : (
            <ul className="space-y-1 text-xs">
              {detail.webhookLogs.map((row) => (
                <li
                  key={row.id}
                  className="flex flex-wrap items-center justify-between gap-2 border-b pb-1"
                >
                  <span>
                    {t.attemptWord} {row.attempt} ·{" "}
                    <span className="text-muted-foreground">{row.status}</span> ·{" "}
                    {t.httpWord} {row.response_code ?? "—"}
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
