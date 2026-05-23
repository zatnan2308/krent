import { type NextRequest } from "next/server";

import { requireApiAuth } from "@/features/agency-api/auth";
import {
  getAgentPropertyForApi,
  getPropertyAvailabilityForApi,
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
  const auth = await requireApiAuth(request, "read:property_availability");
  if (!auth.ok) {
    return respondError(request, auth.status, auth.error);
  }
  if (!auth.auth.agentId) {
    return respondError(
      request,
      403,
      "Availability requires an agent-scoped key.",
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
  const url = new URL(request.url);
  const fromDate = url.searchParams.get("from") ?? today();
  const toDate = url.searchParams.get("to") ?? addDays(fromDate, 180);
  const events = await getPropertyAvailabilityForApi({
    organizationId: auth.auth.organizationId,
    propertyId: params.propertyId,
    fromDate,
    toDate,
  });
  return respondJson(request, auth.auth, {
    propertyId: params.propertyId,
    from: fromDate,
    to: toDate,
    events,
  });
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDays(base: string, days: number): string {
  const date = new Date(base);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
