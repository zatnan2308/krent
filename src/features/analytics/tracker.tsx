"use client";

import * as React from "react";
import Script from "next/script";
import { usePathname } from "next/navigation";

import { UTM_PARAM_NAMES } from "./constants";
import type { PublicTrackingConfig } from "./queries";
import type { UtmPayload } from "./schema";
import { trackPageView } from "./track";

/** Безопасное значение tracking ID для подстановки в inline-script. */
function safeId(value: string | null): string {
  return (value ?? "").replace(/[^A-Za-z0-9\-_]/g, "");
}

/** Читает UTM/click ID из window.location.search. */
function extractUtm(): UtmPayload | null {
  if (typeof window === "undefined") {
    return null;
  }
  const params = new URLSearchParams(window.location.search);
  const present = UTM_PARAM_NAMES.some((name) => params.has(name));
  if (!present) {
    return null;
  }
  return {
    utm_source: params.get("utm_source"),
    utm_medium: params.get("utm_medium"),
    utm_campaign: params.get("utm_campaign"),
    utm_content: params.get("utm_content"),
    utm_term: params.get("utm_term"),
    gclid: params.get("gclid"),
    gbraid: params.get("gbraid"),
    wbraid: params.get("wbraid"),
    fbclid: params.get("fbclid"),
    fbc: params.get("fbc"),
    fbp: params.get("fbp"),
    landing_page: window.location.pathname + window.location.search,
    referrer: document.referrer || null,
  };
}

/**
 * Корневой клиентский трекер: автоматически отправляет page_view,
 * захватывает UTM-параметры landing, инициализирует GA4 / GTM / Meta
 * Pixel и пробрасывает Google Ads настройки в track().
 */
export function AnalyticsTracker({
  config,
}: {
  config: PublicTrackingConfig;
}) {
  const pathname = usePathname();
  const ga4Id = safeId(config.ga4MeasurementId);
  const gtmId = safeId(config.gtmId);
  const pixelId = safeId(config.metaPixelId);

  React.useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    if (config.googleAdsConversionId) {
      window.__krent_ads_id = config.googleAdsConversionId;
      window.__krent_ads_labels = config.googleAdsLabels;
    }
  }, [config.googleAdsConversionId, config.googleAdsLabels]);

  React.useEffect(() => {
    trackPageView(extractUtm());
  }, [pathname]);

  return (
    <>
      {config.ga4Enabled && ga4Id ? (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${ga4Id}`}
            strategy="afterInteractive"
          />
          <Script id="ga4-init" strategy="afterInteractive">
            {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
window.gtag = gtag;
gtag('js', new Date());
${config.consentModeEnabled ? `gtag('consent', 'default', { analytics_storage: 'granted', ad_storage: 'granted' });` : ""}
gtag('config', '${ga4Id}');`}
          </Script>
        </>
      ) : null}

      {gtmId ? (
        <Script id="gtm-init" strategy="afterInteractive">
          {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${gtmId}');`}
        </Script>
      ) : null}

      {config.metaPixelEnabled && pixelId ? (
        <Script id="meta-pixel-init" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${pixelId}');
fbq('track', 'PageView');`}
        </Script>
      ) : null}
    </>
  );
}
