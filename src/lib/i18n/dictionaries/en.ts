/** Эталонный словарь UI. Тип Dictionary выводится из него. */
export const en = {
  common: {
    signIn: "Sign in",
    openDashboard: "Open dashboard",
    backToHome: "Back to home",
    language: "Language",
    currency: "Currency",
  },
  nav: {
    properties: "Properties",
    rentals: "Rentals",
    about: "About",
    contact: "Contact",
  },
  home: {
    badge: "Real estate platform",
    title: "The white-label platform for agencies and realtors",
    subtitle:
      "Property sales, long-term and short-term rentals, direct booking, CRM and marketing on one multi-tenant foundation.",
  },
  footer: {
    rights: "All rights reserved.",
  },
};

export type Dictionary = typeof en;

/** Глубоко-частичный словарь: перевод локали может быть НЕполным —
 *  недостающие ключи берутся из английского (см. getDictionary / mergeDict).
 *  Это позволяет наполнять ru/uk/fr/de постепенно, не ломая typecheck. */
export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};
