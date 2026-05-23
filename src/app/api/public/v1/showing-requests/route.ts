import { type NextRequest } from "next/server";

import { requireApiAuth } from "@/features/agency-api/auth";
import { createShowingRequestFromApi } from "@/features/agency-api/public-helpers";
import {
  respondError,
  respondJson,
  respondPreflight,
} from "@/features/agency-api/route-helpers";
import { createShowingRequestApiSchema } from "@/features/agency-api/schema";

export const dynamic = "force-dynamic";

export async function OPTIONS(request: NextRequest) {
  return respondPreflight(request);
}

export async function POST(request: NextRequest) {
  const auth = await requireApiAuth(request, "create:showing_request");
  if (!auth.ok) {
    return respondError(request, auth.status, auth.error);
  }
  const raw = await safeJson(request);
  const parsed = createShowingRequestApiSchema.safeParse(raw);
  if (!parsed.success) {
    return respondError(request, 422, "Invalid showing request payload.");
  }
  const result = await createShowingRequestFromApi(auth.auth, parsed.data);
  if (!result.ok) {
    return respondError(request, result.status, result.error);
  }
  return respondJson(request, auth.auth, result.data, 201);
}

async function safeJson(request: NextRequest): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}
