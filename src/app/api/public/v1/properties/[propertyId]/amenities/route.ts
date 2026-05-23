import { type NextRequest } from "next/server";

import { requireApiAuth } from "@/features/agency-api/auth";
import { getAgentPropertyForApi } from "@/features/agency-api/queries";
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
  const auth = await requireApiAuth(request, "read:property_amenities");
  if (!auth.ok) {
    return respondError(request, auth.status, auth.error);
  }
  if (!auth.auth.agentId) {
    return respondError(
      request,
      403,
      "Amenities require an agent-scoped key.",
    );
  }
  const record = await getAgentPropertyForApi({
    organizationId: auth.auth.organizationId,
    agentId: auth.auth.agentId,
    propertyId: params.propertyId,
    locale: "en",
  });
  if (!record) {
    return respondError(request, 404, "Property not found.");
  }
  return respondJson(request, auth.auth, {
    propertyId: params.propertyId,
    amenities: record.amenities,
  });
}
