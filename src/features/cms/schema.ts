import { z } from "zod";

import { pageContentSchema } from "./content";

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Схема формы сохранения страницы (page + перевод на язык по умолчанию). */
export const savePageSchema = z.object({
  id: z.uuid().optional(),
  title: z.string().min(1).max(200),
  slug: z
    .string()
    .regex(SLUG_PATTERN, "Use lowercase letters, numbers and dashes."),
  type: z.enum([
    "home",
    "about",
    "buy",
    "sell",
    "rent",
    "contact",
    "custom",
    "landing",
  ]),
  status: z.enum(["draft", "published"]),
  seoTitle: z.string().max(200).optional(),
  seoDescription: z.string().max(400).optional(),
  content: pageContentSchema,
});

export type SavePageInput = z.infer<typeof savePageSchema>;

/** Результат server action сохранения страницы. */
export type SavePageResult = { ok: true; id: string } | { ok: false; error: string };
