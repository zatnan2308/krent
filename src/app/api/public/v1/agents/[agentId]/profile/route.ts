import { type NextRequest } from "next/server";

import { requireApiAuth } from "@/features/agency-api/auth";
import { getAgentProfileForApi } from "@/features/agency-api/public-helpers";
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
  const auth = await requireApiAuth(request, "read:agent_profile");
  if (!auth.ok) {
    return respondError(request, auth.status, auth.error);
  }
  if (auth.auth.agentId && auth.auth.agentId !== params.agentId) {
    return respondError(request, 403, "Key not authorized for this agent.");
  }
  const profile = await getAgentProfileForApi(
    auth.auth.organizationId,
    params.agentId,
  );
  if (!profile) {
    return respondError(request, 404, "Agent not found.");
  }
  return respondJson(request, auth.auth, profile);
}
