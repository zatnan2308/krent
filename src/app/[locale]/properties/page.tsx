import { redirect } from "next/navigation";

// Каталог объектов переехал на /listings (см. ЭТАП 8).
export const dynamic = "force-dynamic";

export default function PropertiesIndexPage({
  params,
}: {
  params: { locale: string };
}) {
  redirect(`/${params.locale}/listings`);
}
