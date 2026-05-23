import type { Metadata } from "next";

import { buildAreaMetadata, renderAreaPage } from "@/features/seo/area-pages";

export const dynamic = "force-dynamic";

export function generateMetadata({
  params,
}: {
  params: { locale: string; city: string; area: string };
}): Promise<Metadata> {
  return buildAreaMetadata(
    "homes-for-sale",
    params.locale,
    params.city,
    params.area,
  );
}

export default async function HomesForSaleAreaPage({
  params,
}: {
  params: { locale: string; city: string; area: string };
}) {
  return renderAreaPage(
    "homes-for-sale",
    params.locale,
    params.city,
    params.area,
  );
}
