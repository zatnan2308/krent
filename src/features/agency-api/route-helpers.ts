import { NextResponse } from "next/server";

import { corsHeadersFor, logApiUsage } from "./auth";
import type { ApiAuthContext } from "./types";

/** Стандартизированный JSON-ответ с CORS и логированием usage. */
export async function respondJson(
  request: Request,
  auth: ApiAuthContext | null,
  body: unknown,
  status = 200,
): Promise<NextResponse> {
  const cors = corsHeadersFor(
    request.headers.get("origin"),
    auth?.allowedDomains ?? [],
  );
  const response = NextResponse.json(body, { status, headers: cors });
  if (auth) {
    await logApiUsage(request, auth, status);
  }
  return response;
}

/** Ответ ошибкой по результату requireApiAuth (без logApiUsage — он уже там сделан). */
export function respondError(
  request: Request,
  status: number,
  message: string,
): NextResponse {
  const cors = corsHeadersFor(request.headers.get("origin"), []);
  return NextResponse.json({ error: message }, { status, headers: cors });
}

/** Pre-flight CORS. */
export function respondPreflight(request: Request): NextResponse {
  const cors = corsHeadersFor(request.headers.get("origin"), []);
  return new NextResponse(null, { status: 204, headers: cors });
}

/** Текстовый ответ (XML/CSV) с теми же CORS-заголовками. */
export async function respondText(
  request: Request,
  auth: ApiAuthContext | null,
  body: string,
  contentType: string,
  status = 200,
): Promise<NextResponse> {
  const cors = corsHeadersFor(
    request.headers.get("origin"),
    auth?.allowedDomains ?? [],
  );
  const response = new NextResponse(body, {
    status,
    headers: { "content-type": contentType, ...cors },
  });
  if (auth) {
    await logApiUsage(request, auth, status);
  }
  return response;
}
