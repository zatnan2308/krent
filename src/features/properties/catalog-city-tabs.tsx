"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";

interface Tab {
  /** Метка таба (Show all / Dubai / NY / …). */
  label: string;
  /** Значение параметра city (null = убрать фильтр). */
  city: string | null;
  active: boolean;
}

interface Props {
  action: string;
  tabs: Tab[];
}

/** Editorial-табы городов. Любой клик — soft-reload через router.replace.
 *  Сбрасывает page=N (всегда возвращаемся на 1-ю страницу нового фильтра). */
export function CatalogCityTabs({ action, tabs }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = React.useTransition();

  function setCity(city: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("page");
    if (city) params.set("city", city);
    else params.delete("city");
    const qs = params.toString();
    startTransition(() => {
      router.replace(qs ? `${action}?${qs}` : action, { scroll: false });
    });
  }

  return (
    <div
      className="ed-city-tabs"
      style={{
        marginTop: 48,
        display: "flex",
        gap: 36,
        flexWrap: "wrap",
        borderTop: "1px solid var(--border-subtle)",
        paddingTop: 24,
        opacity: pending ? 0.6 : 1,
        transition: "opacity 200ms var(--ease-out-expo)",
      }}
    >
      {tabs.map((tab) => (
        <button
          key={tab.label}
          type="button"
          onClick={() => setCity(tab.city)}
          style={{
            padding: "4px 0",
            fontSize: 14,
            letterSpacing: "0.01em",
            color: tab.active ? "var(--accent)" : "var(--text-secondary)",
            borderBottom: `1px solid ${
              tab.active ? "var(--accent)" : "transparent"
            }`,
            display: "inline-flex",
            alignItems: "baseline",
            gap: 8,
            background: "transparent",
            border: "none",
            borderBottomWidth: 1,
            borderBottomStyle: "solid",
            borderBottomColor: tab.active ? "var(--accent)" : "transparent",
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
