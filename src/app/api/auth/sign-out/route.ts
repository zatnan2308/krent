import { NextResponse } from "next/server";

import { ROUTES } from "@/lib/constants/routes";
import { createClient } from "@/lib/supabase/server";

/** POST /api/auth/sign-out — гасит сессию Supabase и редиректит на главную.
 *  Вызывается формой из header dropdown. */
export async function POST(request: Request): Promise<NextResponse> {
  const supabase = createClient();
  await supabase.auth.signOut();
  const url = new URL(ROUTES.public.home, request.url);
  return NextResponse.redirect(url, { status: 303 });
}
