"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

import { captureAttribution } from "@/features/crm/attribution";

/**
 * Невидимый трекер атрибуции. На каждой навигации фиксирует UTM-метки,
 * click ID (gclid/gbraid/wbraid/fbclid), referrer и страницы в localStorage,
 * чтобы данные не потерялись к моменту отправки формы.
 */
export function AttributionTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window !== "undefined") {
      captureAttribution(window.location.href);
    }
  }, [pathname]);

  return null;
}
