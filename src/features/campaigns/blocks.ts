/**
 * Типы блоков письма кампании и их контент по умолчанию. Модуль
 * чистый — используется и на сервере, и в клиентском конструкторе.
 */

export const BLOCK_TYPES = [
  "header",
  "logo",
  "hero",
  "text",
  "button",
  "property_card",
  "property_grid",
  "agent_card",
  "testimonial",
  "divider",
  "footer",
  "unsubscribe",
] as const;

export type BlockType = (typeof BLOCK_TYPES)[number];

/** Один блок письма: тип и произвольный JSON-контент. */
export interface CampaignBlockData {
  type: BlockType;
  content: Record<string, unknown>;
}

/** Проверяет, что значение — поддерживаемый тип блока. */
export function isBlockType(value: string): value is BlockType {
  return (BLOCK_TYPES as readonly string[]).includes(value);
}

/** Контент блока по умолчанию при добавлении в конструкторе. */
export function defaultBlockContent(
  type: BlockType,
): Record<string, unknown> {
  switch (type) {
    case "header":
      return { text: "Heading" };
    case "logo":
      return { url: "", alt: "Logo" };
    case "hero":
      return { url: "", alt: "" };
    case "text":
      return { text: "Write your message here." };
    case "button":
      return { label: "Learn more", url: "" };
    case "property_card":
      return { propertyId: "" };
    case "property_grid":
      return { propertyIds: [] };
    case "agent_card":
      return { name: "", title: "", email: "", phone: "", photoUrl: "" };
    case "testimonial":
      return { quote: "", author: "" };
    case "divider":
      return {};
    case "footer":
      return { text: "" };
    case "unsubscribe":
      return {};
    default:
      return {};
  }
}
