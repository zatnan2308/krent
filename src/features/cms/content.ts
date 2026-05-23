import { z } from "zod";

/**
 * Структура поля content jsonb страниц.
 *
 * content = { version, blocks[] }, где blocks — discriminated union.
 * Новые типы блоков добавляются в схему ниже без миграции БД —
 * это точка расширения под будущий landing-builder.
 */

const headingBlockSchema = z.object({
  id: z.string(),
  type: z.literal("heading"),
  level: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  text: z.string(),
});

const textBlockSchema = z.object({
  id: z.string(),
  type: z.literal("text"),
  text: z.string(),
});

const imageBlockSchema = z.object({
  id: z.string(),
  type: z.literal("image"),
  url: z.string(),
  alt: z.string(),
});

export const pageBlockSchema = z.discriminatedUnion("type", [
  headingBlockSchema,
  textBlockSchema,
  imageBlockSchema,
]);

export const pageContentSchema = z.object({
  version: z.number(),
  blocks: z.array(pageBlockSchema),
});

export type PageBlock = z.infer<typeof pageBlockSchema>;
export type PageBlockType = PageBlock["type"];
export type PageContent = z.infer<typeof pageContentSchema>;

export const EMPTY_PAGE_CONTENT: PageContent = { version: 1, blocks: [] };

/** Безопасно приводит произвольный JSON из БД к PageContent. */
export function parsePageContent(value: unknown): PageContent {
  const result = pageContentSchema.safeParse(value);
  return result.success ? result.data : EMPTY_PAGE_CONTENT;
}

/** Создаёт пустой блок указанного типа со свежим id. */
export function createBlock(type: PageBlockType): PageBlock {
  const id = crypto.randomUUID();
  switch (type) {
    case "heading":
      return { id, type: "heading", level: 2, text: "" };
    case "text":
      return { id, type: "text", text: "" };
    case "image":
      return { id, type: "image", url: "", alt: "" };
    default:
      return { id, type: "text", text: "" };
  }
}
