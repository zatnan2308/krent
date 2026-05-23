import type { Metadata } from "next";

import {
  buildCatalogMetadata,
  renderCatalog,
} from "@/features/properties/catalog-view";

export const dynamic = "force-dynamic";

interface CatalogPageProps {
  params: { locale: string };
  searchParams: { [key: string]: string | string[] | undefined };
}

export function generateMetadata(props: CatalogPageProps): Promise<Metadata> {
  return buildCatalogMetadata("vacation-rentals", props);
}

export default async function VacationRentalsPage(props: CatalogPageProps) {
  return renderCatalog({ variant: "vacation-rentals", ...props });
}
