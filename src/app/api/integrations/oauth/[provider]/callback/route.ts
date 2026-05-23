import { NextResponse, type NextRequest } from "next/server";

import { getIntegrationAdapter } from "@/features/integrations/adapters";
import type { IntegrationProvider } from "@/features/integrations/types";
import { encryptToken } from "@/lib/encryption";
import { createAdminClient } from "@/lib/supabase/server";
import { ROUTES } from "@/lib/constants/routes";

export const dynamic = "force-dynamic";

const ALLOWED: IntegrationProvider[] = ["gsc", "google_ads", "meta_ads"];

/**
 * OAuth callback: проверяет state из cookie, обменивает code на токен,
 * шифрует его и сохраняет в integration_tokens. Сразу после успеха
 * создаёт/обновляет integration_connections со статусом 'connected'.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { provider: string } },
) {
  if (!ALLOWED.includes(params.provider as IntegrationProvider)) {
    return new NextResponse("Unknown provider", { status: 404 });
  }
  const provider = params.provider as IntegrationProvider;
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieState = request.cookies.get(
    `krent_oauth_state_${provider}`,
  )?.value;
  if (!code || !state || !cookieState || state !== cookieState) {
    return new NextResponse("State mismatch", { status: 400 });
  }
  const organizationId = state.split(":")[0];
  if (!organizationId) {
    return new NextResponse("Bad state", { status: 400 });
  }

  const adapter = getIntegrationAdapter(provider);
  const exchange = await adapter.exchangeCode(code);
  if (!exchange) {
    return NextResponse.redirect(
      new URL(`${ROUTES.dashboard.integrations}?error=exchange`, request.url),
    );
  }

  const admin = createAdminClient();
  // Создаём/обновляем connection.
  const { data: existing } = await admin
    .from("integration_connections")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("provider", provider)
    .maybeSingle();
  let connectionId = existing?.id ?? null;
  if (connectionId) {
    await admin
      .from("integration_connections")
      .update({
        status: "connected",
        error_message: null,
        last_synced_at: new Date().toISOString(),
      })
      .eq("id", connectionId);
  } else {
    const { data: created } = await admin
      .from("integration_connections")
      .insert({
        organization_id: organizationId,
        provider,
        status: "connected",
        last_synced_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    connectionId = created?.id ?? null;
  }
  if (!connectionId) {
    return new NextResponse("Could not store connection", { status: 500 });
  }

  // Сохраняем зашифрованный токен. Старые токены этого connection удаляем.
  await admin
    .from("integration_tokens")
    .delete()
    .eq("integration_connection_id", connectionId);
  await admin.from("integration_tokens").insert({
    integration_connection_id: connectionId,
    organization_id: organizationId,
    token_type: "access_token",
    encrypted_value: encryptToken(exchange.accessToken),
    expires_at: exchange.expiresAt,
  });
  if (exchange.refreshToken) {
    await admin.from("integration_tokens").insert({
      integration_connection_id: connectionId,
      organization_id: organizationId,
      token_type: "refresh_token",
      encrypted_value: encryptToken(exchange.refreshToken),
      expires_at: null,
    });
  }

  const response = NextResponse.redirect(
    new URL(`${ROUTES.dashboard.integrations}?connected=1`, request.url),
  );
  response.cookies.delete(`krent_oauth_state_${provider}`);
  return response;
}
