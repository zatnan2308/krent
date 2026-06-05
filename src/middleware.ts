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
const PROTECTED_PREFIXES = [
  "/dashboard",
  "/super-admin",
  "/portal",
  "/account",
];

/** Префиксы маршрутов без locale в URL (внутреннее приложение и API). */
const NON_LOCALIZED_PREFIXES = [
  "/dashboard",
  "/super-admin",
  "/account",
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

/** Locale-редирект для публичных маршрутов без префикса локали. */
function localeRedirect(request: NextRequest): NextResponse | null {
  const { pathname } = request.nextUrl;
  const isLocalized = !hasPrefix(pathname, NON_LOCALIZED_PREFIXES);
  if (!isLocalized || getLocaleFromPathname(pathname)) {
    return null;
  }
  const cookieLocale = request.cookies.get(LOCALE_COOKIE)?.value;
  const locale =
    cookieLocale && isLocale(cookieLocale)
      ? cookieLocale
      : matchLocale(request.headers.get("accept-language"));
  const url = request.nextUrl.clone();
  url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(url);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Сетевой Supabase Auth (getUser) нужен только защищённым маршрутам и
  // странице входа. Для публичных страниц, навигаций и prefetch его НЕ делаем —
  // иначе КАЖДЫЙ запрос ждёт round-trip к Supabase Auth (главная причина лагов).
  const needsAuth =
    hasPrefix(pathname, PROTECTED_PREFIXES) || pathname === ROUTES.auth.signIn;

  if (!needsAuth) {
    const redirectResponse = localeRedirect(request);
    if (redirectResponse) {
      return redirectResponse;
    }
    // Прокидываем текущий путь в RSC через заголовок (без сетевых вызовов) —
    // нужен [locale]/layout для path-preserving редиректа с выключенных языков.
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-pathname", pathname);
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // --- Защищённые маршруты / вход: рефреш сессии + проверка пользователя ---
  const { response, user } = await updateSession(request);

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

  return response;
}

export const config = {
  matcher: [
    // robots.txt, sitemap.xml и image-sitemap (.xml/.txt) исключены —
    // их обслуживают спец-файлы Next без locale-редиректа.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|xml|txt)$).*)",
  ],
};
