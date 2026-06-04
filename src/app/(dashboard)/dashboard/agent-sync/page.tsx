import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { AgentConnectionsSection } from "@/features/agency-api/agent-connections-section";
import { ApiKeysSection } from "@/features/agency-api/api-keys-section";
import {
  API_SCOPE_DESCRIPTIONS,
  API_SCOPE_KEYS,
  WEBHOOK_EVENT_DESCRIPTIONS,
  WEBHOOK_EVENT_TYPES,
} from "@/features/agency-api/constants";
import {
  getApiUsageSummary,
  getPropertySyncSettings,
  listAgentConnections,
  listApiKeys,
  listRecentDeliveryLogs,
  listRecentWebhookEvents,
  listWebhookEndpoints,
} from "@/features/agency-api/queries";
import { SyncSettingsForm } from "@/features/agency-api/sync-settings-form";
import { WebhookEndpointsSection } from "@/features/agency-api/webhook-endpoints-section";
import { WidgetSnippet } from "@/features/agency-api/widget-snippet";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { ROUTES } from "@/lib/constants/routes";
import { requireOrganizationContext } from "@/server/organization-context";
import { hasPermission } from "@/server/permissions";

export const metadata: Metadata = {
  title: "Agent Sync",
};

export const dynamic = "force-dynamic";

function inferBaseUrl(): string {
  const host = headers().get("host");
  const proto = headers().get("x-forwarded-proto") ?? "https";
  if (!host) {
    return "https://example.com";
  }
  return `${proto}://${host}`;
}

export default async function AgentSyncPage() {
  const context = await requireOrganizationContext();
  if (!context.organization) {
    return null;
  }
  if (!hasPermission(context, "analytics.view")) {
    redirect(ROUTES.dashboard.root);
  }
  const organizationId = context.organization.id;

  const [
    apiKeys,
    connections,
    endpoints,
    events,
    deliveries,
    syncSettings,
    usage,
  ] = await Promise.all([
    listApiKeys(organizationId),
    listAgentConnections(organizationId),
    listWebhookEndpoints(organizationId),
    listRecentWebhookEvents(organizationId, 25),
    listRecentDeliveryLogs(organizationId, 25),
    getPropertySyncSettings(organizationId),
    getApiUsageSummary(organizationId, 14),
  ]);

  const baseUrl = inferBaseUrl();
  const firstAgentConnection = connections[0] ?? null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Agent Sync"
        description="Connect agent websites to the agency CRM. Share properties via API, JSON/XML feeds or a drop-in widget. Webhooks deliver real-time updates."
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Property sync settings</CardTitle>
        </CardHeader>
        <CardContent>
          <SyncSettingsForm initial={syncSettings} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Agent website connections</CardTitle>
        </CardHeader>
        <CardContent>
          <AgentConnectionsSection connections={connections} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">API keys</CardTitle>
        </CardHeader>
        <CardContent>
          <ApiKeysSection keys={apiKeys} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Webhook endpoints</CardTitle>
        </CardHeader>
        <CardContent>
          <WebhookEndpointsSection endpoints={endpoints} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Feed URLs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {firstAgentConnection ? (
            <>
              <p className="text-xs text-muted-foreground">
                Replace the agent ID with the one from the list above. Send the
                API key via <code>Authorization: Bearer …</code>.
              </p>
              <pre className="overflow-x-auto whitespace-pre-wrap break-all rounded-md border bg-muted/30 p-3 text-xs">
                {[
                  `GET ${baseUrl}/api/public/v1/agents/${firstAgentConnection.agent_id}/properties`,
                  `GET ${baseUrl}/api/public/v1/agents/${firstAgentConnection.agent_id}/feed?format=json`,
                  `GET ${baseUrl}/api/public/v1/agents/${firstAgentConnection.agent_id}/feed?format=xml`,
                  `GET ${baseUrl}/api/public/v1/agents/${firstAgentConnection.agent_id}/feed?format=csv`,
                ].join("\n")}
              </pre>
            </>
          ) : (
            <p className="text-muted-foreground">
              Add an agent connection above to see feed URLs.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Widget embed</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {firstAgentConnection ? (
            <WidgetSnippet
              baseUrl={baseUrl}
              agentId={firstAgentConnection.agent_id}
            />
          ) : (
            <p className="text-muted-foreground">
              Add an agent connection above to generate a widget snippet.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">API documentation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div>
            <p className="font-medium">Authentication</p>
            <p className="text-xs text-muted-foreground">
              Send the API key in either <code>Authorization: Bearer …</code> or
              <code> x-api-key</code> header. Rate limit is enforced per minute.
            </p>
          </div>
          <div>
            <p className="font-medium">Scopes</p>
            <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
              {API_SCOPE_KEYS.map((scope) => (
                <li key={scope}>
                  <code>{scope}</code> — {API_SCOPE_DESCRIPTIONS[scope]}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="font-medium">Webhook events</p>
            <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
              {WEBHOOK_EVENT_TYPES.map((type) => (
                <li key={type}>
                  <code>{type}</code> — {WEBHOOK_EVENT_DESCRIPTIONS[type]}
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">API usage (14 days)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              Total requests: <strong>{usage.totals.requests}</strong>
            </p>
            <p>
              Errors (4xx/5xx): <strong>{usage.totals.errors}</strong>
            </p>
            {usage.series.length === 0 ? (
              <p className="text-xs text-muted-foreground">No traffic yet.</p>
            ) : (
              <ul className="text-xs text-muted-foreground">
                {usage.series.slice(-7).map((row) => (
                  <li key={row.date}>
                    {row.date}: {row.total} req · {row.errors} errors
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent webhook events</CardTitle>
          </CardHeader>
          <CardContent>
            {events.length === 0 ? (
              <p className="text-xs text-muted-foreground">No events yet.</p>
            ) : (
              <ul className="space-y-1 text-xs">
                {events.map((event) => (
                  <li key={event.id} className="flex justify-between gap-2">
                    <span>
                      <code>{event.event_type}</code>
                    </span>
                    <span className="text-muted-foreground">
                      {event.status}
                    </span>
                    <span className="text-muted-foreground">
                      {new Date(event.created_at).toLocaleString()}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent delivery attempts</CardTitle>
        </CardHeader>
        <CardContent>
          {deliveries.length === 0 ? (
            <p className="text-xs text-muted-foreground">No deliveries yet.</p>
          ) : (
            <ul className="space-y-1 text-xs">
              {deliveries.map((row) => (
                <li
                  key={row.id}
                  className="flex flex-wrap items-center justify-between gap-2"
                >
                  <span>
                    Attempt {row.attempt} ·{" "}
                    <span className="text-muted-foreground">{row.status}</span>{" "}
                    · HTTP {row.response_code ?? "—"}
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
