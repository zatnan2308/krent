import { type NextRequest } from "next/server";

import { requireApiAuth } from "@/features/agency-api/auth";
import { toPublicProperty } from "@/features/agency-api/feeds";
import {
  getAgentPropertyForApi,
  getPropertySyncSettings,
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
  { params }: { params: { propertyId: string } },
) {
  const auth = await requireApiAuth(request, "read:property_details");
  if (!auth.ok) {
    return respondError(request, auth.status, auth.error);
  }
  if (!auth.auth.agentId) {
    return respondError(
      request,
      403,
      "Property details require an agent-scoped key.",
    );
  }
  const locale = new URL(request.url).searchParams.get("locale") ?? "en";
  const record = await getAgentPropertyForApi({
    organizationId: auth.auth.organizationId,
    agentId: auth.auth.agentId,
    propertyId: params.propertyId,
    locale,
  });
  if (!record) {
    return respondError(request, 404, "Property not found.");
  }
  const settings = await getPropertySyncSettings(auth.auth.organizationId);
  const baseUrl =
    request.headers.get("x-forwarded-origin") ??
    request.headers.get("origin") ??
    `${request.nextUrl.protocol}//${request.nextUrl.host}`;
  const dto = toPublicProperty({ ...record, context: { settings, baseUrl } });
  return respondJson(request, auth.auth, dto);
}
