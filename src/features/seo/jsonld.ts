/**
 * Билдеры структурированных данных schema.org (JSON-LD). Каждая функция
 * возвращает обычный объект — страница выводит его через <JsonLd/>.
 */

const CONTEXT = "https://schema.org";

/** schema.org Organization для сайта организации. */
export function organizationJsonLd(input: {
  name: string;
  url: string;
  logoUrl?: string | null;
  description?: string | null;
}): Record<string, unknown> {
  const data: Record<string, unknown> = {
    "@context": CONTEXT,
    "@type": "Organization",
    name: input.name,
    url: input.url,
  };
  if (input.logoUrl) {
    data.logo = input.logoUrl;
  }
  if (input.description) {
    data.description = input.description;
  }
  return data;
}

/** schema.org RealEstateAgent для агентства или агента. */
export function realEstateAgentJsonLd(input: {
  name: string;
  url: string;
  logoUrl?: string | null;
  imageUrl?: string | null;
  description?: string | null;
  areaServed?: string[];
}): Record<string, unknown> {
  const data: Record<string, unknown> = {
    "@context": CONTEXT,
    "@type": "RealEstateAgent",
    name: input.name,
    url: input.url,
  };
  if (input.logoUrl) {
    data.logo = input.logoUrl;
  }
  if (input.imageUrl) {
    data.image = input.imageUrl;
  }
  if (input.description) {
    data.description = input.description;
  }
  if (input.areaServed && input.areaServed.length > 0) {
    data.areaServed = input.areaServed;
  }
  return data;
}

/** schema.org RealEstateListing для страницы объекта. */
export function realEstateListingJsonLd(input: {
  name: string;
  url: string;
  description?: string | null;
  images: string[];
  price?: number | null;
  currency?: string | null;
  address?: string | null;
}): Record<string, unknown> {
  const data: Record<string, unknown> = {
    "@context": CONTEXT,
    "@type": "RealEstateListing",
    name: input.name,
    url: input.url,
  };
  if (input.description) {
    data.description = input.description;
  }
  if (input.images.length > 0) {
    data.image = input.images;
  }
  if (input.address) {
    data.address = input.address;
  }
  if (input.price !== null && input.price !== undefined && input.currency) {
    data.offers = {
      "@type": "Offer",
      price: input.price,
      priceCurrency: input.currency,
      availability: "https://schema.org/InStock",
      url: input.url,
    };
  }
  return data;
}

/** schema.org BreadcrumbList по списку «название + URL». */
export function breadcrumbJsonLd(
  items: { name: string; url: string }[],
): Record<string, unknown> {
  return {
    "@context": CONTEXT,
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

/** schema.org FAQPage по списку «вопрос + ответ». */
export function faqJsonLd(
  items: { question: string; answer: string }[],
): Record<string, unknown> {
  return {
    "@context": CONTEXT,
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}
