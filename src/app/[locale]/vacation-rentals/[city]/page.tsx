import type { Metadata } from "next";

import { buildAreaMetadata, renderAreaPage } from "@/features/seo/area-pages";

export const dynamic = "force-dynamic";

export function generateMetadata({
  params,
}: {
  params: { locale: string; city: string };
}): Promise<Metadata> {
  return buildAreaMetadata("vacation-rentals", params.locale, params.city);
}

export default async function VacationRentalsCityPage({
  params,
}: {
  params: { locale: string; city: string };
}) {
  return renderAreaPage("vacation-rentals", params.locale, params.city);
}
