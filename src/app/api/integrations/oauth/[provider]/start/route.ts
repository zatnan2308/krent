import { randomBytes } from "node:crypto";

import { NextResponse, type NextRequest } from "next/server";

import { getIntegrationAdapter } from "@/features/integrations/adapters";
import type { IntegrationProvider } from "@/features/integrations/types";
import { ROUTES } from "@/lib/constants/routes";
import { requireOrganizationContext } from "@/server/organization-context";
import { hasPermission } from "@/server/permissions";

export const dynamic = "force-dynamic";

const ALLOWED: IntegrationProvider[] = ["gsc", "google_ads", "meta_ads"];

/**
 * Старт OAuth-flow: генерирует CSRF-state, сохраняет его в cookie и
 * редиректит на authorize_url провайдера. Без OAuth-credentials в env
 * возвращает 503 с текстом «Requires API credentials».
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { provider: string } },
) {
  if (!ALLOWED.includes(params.provider as IntegrationProvider)) {
    return new NextResponse("Unknown provider", { status: 404 });
  }
  const provider = params.provider as IntegrationProvider;
  const context = await requireOrganizationContext();
  if (!context.organization) {
    return NextResponse.redirect(new URL(ROUTES.auth.signIn, request.url));
  }
  if (!hasPermission(context, "analytics.view")) {
    return new NextResponse("Forbidden", { status: 403 });
  }
  const adapter = getIntegrationAdapter(provider);
  const status = adapter.getStatus();
  if (!status.ready) {
    return new NextResponse(status.reason, { status: 503 });
  }
  const state = `${context.organization.id}:${randomBytes(16).toString("hex")}`;
  const authorizeUrl = adapter.getAuthorizationUrl(state);
  if (!authorizeUrl) {
    return new NextResponse("OAuth is not available.", { status: 503 });
  }
  const response = NextResponse.redirect(authorizeUrl);
  response.cookies.set(`krent_oauth_state_${provider}`, state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  return response;
}
