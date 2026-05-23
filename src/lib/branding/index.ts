import type { CSSProperties } from "react";

/**
 * Брендинг организации (white-label).
 *
 * Тема построена на CSS-переменных, поэтому смена брендинга сводится к
 * подмене значений переменных. Реальные значения берутся из данных
 * организации позже — сейчас используется DEFAULT_BRANDING.
 */
export interface OrganizationBranding {
  appName: string;
  logoText: string;
  /** HSL-компоненты основного цвета в формате CSS-переменной: "H S% L%". */
  primary: string;
  primaryForeground: string;
}

export const DEFAULT_BRANDING: OrganizationBranding = {
  appName: "Krent",
  logoText: "Krent",
  primary: "222.2 47.4% 11.2%",
  primaryForeground: "210 40% 98%",
};

/**
 * Преобразует брендинг в набор CSS-переменных для inline-стиля контейнера.
 * Применяется к обёртке layout-а, чтобы переопределить тему для организации.
 */
export function brandingToCssVars(
  branding: OrganizationBranding,
): CSSProperties {
  // CSS-переменные не входят в тип CSSProperties (ограничение csstype).
  return {
    "--primary": branding.primary,
    "--primary-foreground": branding.primaryForeground,
  } as unknown as CSSProperties;
}
