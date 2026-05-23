import type { Metadata } from "next";

import { buildAreaMetadata, renderAreaPage } from "@/features/seo/area-pages";

export const dynamic = "force-dynamic";

export function generateMetadata({
  params,
}: {
  params: { locale: string; city: string };
}): Promise<Metadata> {
  return buildAreaMetadata("luxury-homes", params.locale, params.city);
}

export default async function LuxuryHomesCityPage({
  params,
}: {
  params: { locale: string; city: string };
}) {
  return renderAreaPage("luxury-homes", params.locale, params.city);
}
