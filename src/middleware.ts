import { NextResponse, type NextRequest } from "next/server";

import { ROUTES } from "@/lib/constants/routes";
import {
  getLocaleFromPathname,
  isLocale,
  LOCALE_COOKIE,
  matchLocale,
} from "@/lib/i18n";
import { updateSession } from "@/lib/supabase/middleware";

/** Префиксы маршрутов, требующих аутентификации. */
const PROTECTED_PREFIXES = ["/dashboard", "/super-admin", "/portal"];

/** Префиксы маршрутов без locale в URL (внутреннее приложение и API). */
const NON_LOCALIZED_PREFIXES = [
  "/dashboard",
  "/super-admin",
  "/login",
  "/api",
  "/portal",
  "/widget",
];

function hasPrefix(pathname: string, prefixes: string[]): boolean {
  return prefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export async function middleware(request: NextRequest) {
  const { response, user } = await updateSession(request);
  const { pathname } = request.nextUrl;

  // --- Защита внутренних маршрутов ---------------------------
  if (hasPrefix(pathname, PROTECTED_PREFIXES) && !user) {
    const url = request.nextUrl.clone();
    url.pathname = ROUTES.auth.signIn;
    url.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(url);
  }

  if (user && pathname === ROUTES.auth.signIn) {
    const url = request.nextUrl.clone();
    url.pathname = ROUTES.dashboard.root;
    return NextResponse.redirect(url);
  }

  // --- Locale routing для публичных маршрутов ----------------
  const isLocalized = !hasPrefix(pathname, NON_LOCALIZED_PREFIXES);
  if (isLocalized && !getLocaleFromPathname(pathname)) {
    const cookieLocale = request.cookies.get(LOCALE_COOKIE)?.value;
    const locale =
      cookieLocale && isLocale(cookieLocale)
        ? cookieLocale
        : matchLocale(request.headers.get("accept-language"));

    const url = request.nextUrl.clone();
    url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    // robots.txt, sitemap.xml и image-sitemap (.xml/.txt) исключены —
    // их обслуживают спец-файлы Next без locale-редиректа.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|xml|txt)$).*)",
  ],
};
