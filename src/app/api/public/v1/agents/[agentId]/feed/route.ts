import { type NextRequest } from "next/server";

import { requireApiAuth } from "@/features/agency-api/auth";
import {
  serializeCsvFeed,
  serializeJsonFeed,
  serializeXmlFeed,
  toPublicProperty,
  type PublicPropertyShape,
} from "@/features/agency-api/feeds";
import {
  findAgentConnectionByAgent,
  getPropertySyncSettings,
  listAgentPropertiesForApi,
} from "@/features/agency-api/queries";
import {
  respondError,
  respondPreflight,
  respondText,
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
    return respondError(request, 403, "Key not authorized for this agent.");
  }

  const url = new URL(request.url);
  const format = (url.searchParams.get("format") ?? "json").toLowerCase();
  if (!["json", "xml", "csv"].includes(format)) {
    return respondError(request, 400, "format must be json, xml or csv");
  }
  const locale = url.searchParams.get("locale") ?? "en";

  const connection = await findAgentConnectionByAgent(
    auth.auth.organizationId,
    params.agentId,
  );
  const records = await listAgentPropertiesForApi({
    organizationId: auth.auth.organizationId,
    agentId: params.agentId,
    locale,
    limit: 500,
    offset: 0,
    agentWebsiteConnectionId: connection?.id ?? null,
  });
  const settings = await getPropertySyncSettings(auth.auth.organizationId);
  const baseUrl =
    request.headers.get("x-forwarded-origin") ??
    request.headers.get("origin") ??
    `${request.nextUrl.protocol}//${request.nextUrl.host}`;

  const items: PublicPropertyShape[] = records.map((record) =>
    toPublicProperty({ ...record, context: { settings, baseUrl } }),
  );

  if (format === "xml") {
    return respondText(
      request,
      auth.auth,
      serializeXmlFeed(items),
      "application/xml; charset=utf-8",
    );
  }
  if (format === "csv") {
    return respondText(
      request,
      auth.auth,
      serializeCsvFeed(items),
      "text/csv; charset=utf-8",
    );
  }
  return respondText(
    request,
    auth.auth,
    serializeJsonFeed(items),
    "application/json; charset=utf-8",
  );
}
