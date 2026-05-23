import { type NextRequest, NextResponse } from "next/server";

import { buildWidgetScript } from "@/features/agency-api/widget-template";

export const dynamic = "force-dynamic";

/** Публичный JS-скрипт для вставки виджета. */
export function GET(request: NextRequest) {
  const baseUrl = `${request.nextUrl.protocol}//${request.nextUrl.host}`;
  const body = buildWidgetScript(baseUrl);
  return new NextResponse(body, {
    status: 200,
    headers: {
      "content-type": "application/javascript; charset=utf-8",
      "cache-control": "public, max-age=300",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
