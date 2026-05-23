import type { Metadata } from "next";

import { buildAreaMetadata, renderAreaPage } from "@/features/seo/area-pages";

export const dynamic = "force-dynamic";

export function generateMetadata({
  params,
}: {
  params: { locale: string; city: string };
}): Promise<Metadata> {
  return buildAreaMetadata("homes-for-sale", params.locale, params.city);
}

export default async function HomesForSaleCityPage({
  params,
}: {
  params: { locale: string; city: string };
}) {
  return renderAreaPage("homes-for-sale", params.locale, params.city);
}
