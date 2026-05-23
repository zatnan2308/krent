import { type NextRequest } from "next/server";

import { requireApiAuth } from "@/features/agency-api/auth";
import {
  toPublicProperty,
  type PublicPropertyShape,
} from "@/features/agency-api/feeds";
import {
  getPropertySyncSettings,
  listAgentPropertiesForApi,
  findAgentConnectionByAgent,
} from "@/features/agency-api/queries";
import {
  respondError,
  respondJson,
  respondPreflight,
} from "@/features/agency-api/route-helpers";

export const dynamic = "force-dynamic";

export async function OPTIONS(request: NextRequest) {
  return respondPreflight(request);
}

export async function GET(
  request: NextRequest,
  { params }: { params: { agentId: string } },
) {
  const auth = await requireApiAuth(request, "read:properties");
  if (!auth.ok) {
    return respondError(request, auth.status, auth.error);
  }
  if (auth.auth.agentId && auth.auth.agentId !== params.agentId) {
    return respondError(
      request,
      403,
      "Key not authorized for this agent.",
    );
  }
  const url = new URL(request.url);
  const limit = clampNumber(url.searchParams.get("limit"), 50, 1, 200);
  const offset = clampNumber(url.searchParams.get("offset"), 0, 0, 10_000);
  const locale = url.searchParams.get("locale") ?? "en";

  const connection = await findAgentConnectionByAgent(
    auth.auth.organizationId,
    params.agentId,
  );

  const records = await listAgentPropertiesForApi({
    organizationId: auth.auth.organizationId,
    agentId: params.agentId,
    locale,
    limit,
    offset,
    agentWebsiteConnectionId: connection?.id ?? null,
  });

  const settings = await getPropertySyncSettings(auth.auth.organizationId);
  const baseUrl = inferBaseUrl(request);
  const items: PublicPropertyShape[] = records.map((record) =>
    toPublicProperty({ ...record, context: { settings, baseUrl } }),
  );
  return respondJson(request, auth.auth, {
    agentId: params.agentId,
    count: items.length,
    items,
  });
}

function clampNumber(
  value: string | null,
  fallback: number,
  min: number,
  max: number,
): number {
  if (!value) return fallback;
  const num = Number.parseInt(value, 10);
  if (Number.isNaN(num)) return fallback;
  return Math.max(min, Math.min(max, num));
}

function inferBaseUrl(request: NextRequest): string {
  const origin =
    request.headers.get("x-forwarded-origin") ??
    request.headers.get("origin") ??
    `${request.nextUrl.protocol}//${request.nextUrl.host}`;
  return origin.replace(/\/$/, "");
}
