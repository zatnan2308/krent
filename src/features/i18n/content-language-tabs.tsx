"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { cn } from "@/lib/utils";

/**
 * Селектор «языка редактирования» контента для редакторов дашборда.
 * Управляет ?lang= в URL: серверная страница по нему грузит контент нужной
 * локали и пишет переводы в этот язык. Язык по умолчанию убирает ?lang=
 * (редактируется базовая строка). При одном языке ничего не рендерит.
 */
export function ContentLanguageTabs({
  languages,
  current,
  defaultLocale,
}: {
  languages: string[];
  current: string;
  defaultLocale: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (languages.length <= 1) {
    return null;
  }

  function select(code: string) {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    if (code === defaultLocale) {
      params.delete("lang");
    } else {
      params.set("lang", code);
    }
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border bg-muted/30 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground">
          Editing language
        </span>
        <div className="flex flex-wrap gap-1">
          {languages.map((code) => (
            <button
              key={code}
              type="button"
              onClick={() => select(code)}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-semibold uppercase transition-colors",
                code === current
                  ? "bg-foreground text-background"
                  : "bg-background text-muted-foreground hover:text-foreground",
              )}
            >
              {code}
              {code === defaultLocale ? " ·" : ""}
            </button>
          ))}
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        {current === defaultLocale
          ? "Default language — this is the base content shown when a translation is missing."
          : `Translating into ${current.toUpperCase()}. Empty fields fall back to ${defaultLocale.toUpperCase()}.`}
      </p>
    </div>
  );
}
