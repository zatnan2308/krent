import { type NextRequest } from "next/server";

import { requireApiAuth } from "@/features/agency-api/auth";
import { createBookingRequestFromApi } from "@/features/agency-api/public-helpers";
import {
  respondError,
  respondJson,
  respondPreflight,
} from "@/features/agency-api/route-helpers";
import { createBookingRequestApiSchema } from "@/features/agency-api/schema";

export const dynamic = "force-dynamic";

export async function OPTIONS(request: NextRequest) {
  return respondPreflight(request);
}

export async function POST(request: NextRequest) {
  const auth = await requireApiAuth(request, "create:booking_request");
  if (!auth.ok) {
    return respondError(request, auth.status, auth.error);
  }
  const raw = await safeJson(request);
  const parsed = createBookingRequestApiSchema.safeParse(raw);
  if (!parsed.success) {
    return respondError(request, 422, "Invalid booking request payload.");
  }
  const result = await createBookingRequestFromApi(auth.auth, parsed.data);
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
