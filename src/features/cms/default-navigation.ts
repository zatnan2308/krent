/**
 * Дефолтное меню сайта — ЕДИНЫЙ источник правды.
 *
 * Используется в двух местах, чтобы публичный сайт и редактор навигации были
 * синхронизированы:
 *   1) Публичные header/footer показывают этот набор, когда в БД ещё нет
 *      пунктов меню (свежая организация).
 *   2) Кнопка «Загрузить меню сайта» в редакторе засевает ровно этот набор в
 *      таблицу navigation_items — после чего сайт читает пункты из БД, а
 *      редактор ими управляет.
 *
 * Метки на английском (язык по умолчанию); переводы добавляются в редакторе
 * (content_translations). URL относительные — локализуются при рендере.
 */
export interface DefaultNavItem {
  label: string;
  url: string;
}

export const DEFAULT_NAV_MENUS: Record<string, DefaultNavItem[]> = {
  header: [
    { label: "Home", url: "/" },
    { label: "Properties", url: "/properties" },
    { label: "About", url: "/about" },
    { label: "Contact", url: "/contact" },
  ],
  footer_browse: [
    { label: "All properties", url: "/properties" },
    { label: "Buy", url: "/properties?purpose=sale" },
    { label: "Long-term rent", url: "/properties?purpose=long_term_rent" },
    { label: "Vacation rentals", url: "/properties?purpose=short_term_rental" },
  ],
  footer_areas: [
    { label: "Downtown Dubai", url: "/properties?area=Downtown Dubai" },
    { label: "Dubai Marina", url: "/properties?area=Dubai Marina" },
    { label: "Palm Jumeirah", url: "/properties?area=Palm Jumeirah" },
    { label: "Emirates Hills", url: "/properties?area=Emirates Hills" },
  ],
  footer: [
    { label: "About", url: "/about" },
    { label: "Contact", url: "/contact" },
  ],
  footer_legal: [
    { label: "Privacy policy", url: "/privacy" },
    { label: "Terms of service", url: "/terms" },
    { label: "Cookies", url: "/cookies" },
  ],
};

/** Ключи меню, которые засевает кнопка «Загрузить меню сайта». */
export const SEEDABLE_MENU_KEYS = Object.keys(DEFAULT_NAV_MENUS);
