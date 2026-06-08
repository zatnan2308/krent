"use client";

import * as React from "react";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

import {
  createBlock,
  EMPTY_PAGE_CONTENT,
  type PageBlock,
  type PageContent,
} from "@/features/cms/content";
import { deletePage, savePage } from "@/features/cms/page-actions";
import type { SavePageInput } from "@/features/cms/schema";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ROUTES } from "@/lib/constants/routes";
import { useI18n } from "@/lib/i18n/provider";

const FIELD_CLASS =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const PAGE_TYPES: SavePageInput["type"][] = [
  "home",
  "about",
  "buy",
  "sell",
  "rent",
  "contact",
  "custom",
  "landing",
];

/** Контент одной локали страницы (заголовок/SEO/блоки). */
export interface PageLocaleBuffer {
  title: string;
  seoTitle: string;
  seoDescription: string;
  content: PageContent;
}

export interface PageEditorInitial {
  id?: string;
  slug: string;
  type: SavePageInput["type"];
  status: SavePageInput["status"];
  /** Контент локали по умолчанию (стартовый показ). */
  title: string;
  seoTitle: string;
  seoDescription: string;
  content: PageContent;
  /** Все переводы по локали (для мультиязычного редактора). */
  translations?: Record<string, PageLocaleBuffer>;
}

function BlockEditor({
  block,
  onChange,
  onRemove,
}: {
  block: PageBlock;
  onChange: (block: PageBlock) => void;
  onRemove: () => void;
}) {
  const { dict } = useI18n();
  const t = dict.pageEditor;
  return (
    <div className="space-y-2 rounded-md border p-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase text-muted-foreground">
          {block.type}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={onRemove}
          aria-label={t.removeBlock}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {block.type === "heading" ? (
        <div className="flex gap-2">
          <select
            className={`${FIELD_CLASS} w-20`}
            value={block.level}
            onChange={(event) =>
              onChange({
                ...block,
                level: Number(event.target.value) as 1 | 2 | 3,
              })
            }
          >
            <option value={1}>H1</option>
            <option value={2}>H2</option>
            <option value={3}>H3</option>
          </select>
          <Input
            value={block.text}
            placeholder={t.headingText}
            onChange={(event) =>
              onChange({ ...block, text: event.target.value })
            }
          />
        </div>
      ) : null}

      {block.type === "text" ? (
        <Textarea
          value={block.text}
          placeholder={t.paragraphText}
          onChange={(event) => onChange({ ...block, text: event.target.value })}
        />
      ) : null}

      {block.type === "image" ? (
        <div className="space-y-2">
          <Input
            value={block.url}
            placeholder={t.imageUrl}
            onChange={(event) =>
              onChange({ ...block, url: event.target.value })
            }
          />
          <Input
            value={block.alt}
            placeholder={t.altText}
            onChange={(event) =>
              onChange({ ...block, alt: event.target.value })
            }
          />
        </div>
      ) : null}
    </div>
  );
}

export function PageEditor({
  initial,
  locales = [],
  defaultLocale,
}: {
  initial: PageEditorInitial;
  /** Включённые языки организации. */
  locales?: string[];
  defaultLocale: string;
}) {
  const router = useRouter();
  const { dict } = useI18n();
  const t = dict.pageEditor;
  // Языки редактора: default всегда первым, затем остальные включённые.
  const localeList = React.useMemo(
    () => Array.from(new Set([defaultLocale, ...locales])),
    [defaultLocale, locales],
  );

  // Буферы контента по локали (page-уровень — slug/type/status — общий).
  const buffersRef = React.useRef<Record<string, PageLocaleBuffer>>(
    (() => {
      const base =
        initial.translations ??
        ({
          [defaultLocale]: {
            title: initial.title,
            seoTitle: initial.seoTitle,
            seoDescription: initial.seoDescription,
            content: initial.content,
          },
        } as Record<string, PageLocaleBuffer>);
      const out: Record<string, PageLocaleBuffer> = {};
      for (const l of localeList) {
        out[l] = base[l] ?? {
          title: "",
          seoTitle: "",
          seoDescription: "",
          content: EMPTY_PAGE_CONTENT,
        };
      }
      return out;
    })(),
  );

  const [locale, setLocale] = React.useState(defaultLocale);
  const startBuf = buffersRef.current[defaultLocale] ?? {
    title: "",
    seoTitle: "",
    seoDescription: "",
    content: EMPTY_PAGE_CONTENT,
  };
  const [slug, setSlug] = React.useState(initial.slug);
  const [type, setType] = React.useState<SavePageInput["type"]>(initial.type);
  const [status, setStatus] = React.useState<SavePageInput["status"]>(
    initial.status,
  );
  const [title, setTitle] = React.useState(startBuf.title);
  const [seoTitle, setSeoTitle] = React.useState(startBuf.seoTitle);
  const [seoDescription, setSeoDescription] = React.useState(
    startBuf.seoDescription,
  );
  const [blocks, setBlocks] = React.useState<PageBlock[]>(
    startBuf.content.blocks,
  );
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  function currentVersion(): number {
    return (
      buffersRef.current[locale]?.content.version ?? EMPTY_PAGE_CONTENT.version
    );
  }

  function switchLocale(next: string) {
    if (next === locale) return;
    // Сохраняем текущую локаль в буфер, загружаем целевую.
    buffersRef.current[locale] = {
      title,
      seoTitle,
      seoDescription,
      content: { version: currentVersion(), blocks },
    };
    const target = buffersRef.current[next] ?? {
      title: "",
      seoTitle: "",
      seoDescription: "",
      content: EMPTY_PAGE_CONTENT,
    };
    setTitle(target.title);
    setSeoTitle(target.seoTitle);
    setSeoDescription(target.seoDescription);
    setBlocks(target.content.blocks);
    setLocale(next);
  }

  async function handleSave() {
    setPending(true);
    setError(null);
    const result = await savePage({
      id: initial.id,
      title,
      slug,
      type,
      status,
      seoTitle: seoTitle || undefined,
      seoDescription: seoDescription || undefined,
      content: { version: currentVersion(), blocks },
      locale,
    });
    setPending(false);
    if (result.ok) {
      // Запоминаем сохранённый буфер локали (на случай дальнейшего переключения).
      buffersRef.current[locale] = {
        title,
        seoTitle,
        seoDescription,
        content: { version: currentVersion(), blocks },
      };
      router.push(ROUTES.dashboard.pages);
      router.refresh();
    } else {
      setError(result.error);
    }
  }

  async function handleDelete() {
    if (!initial.id) {
      return;
    }
    setPending(true);
    await deletePage(initial.id);
    router.push(ROUTES.dashboard.pages);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t.pageSettings}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {localeList.length > 1 ? (
            <div className="space-y-2">
              <label htmlFor="page-locale" className="text-sm font-medium">
                {t.contentLanguage}
              </label>
              <select
                id="page-locale"
                className={`${FIELD_CLASS} sm:w-48`}
                value={locale}
                onChange={(event) => switchLocale(event.target.value)}
              >
                {localeList.map((code) => (
                  <option key={code} value={code}>
                    {code.toUpperCase()}
                    {code === defaultLocale ? t.defaultSuffix : ""}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                {t.perLanguageHint}
              </p>
            </div>
          ) : null}
          <div className="space-y-2">
            <label htmlFor="page-title" className="text-sm font-medium">
              {t.title}
            </label>
            <Input
              id="page-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <label htmlFor="page-slug" className="text-sm font-medium">
                {t.slug}
              </label>
              <Input
                id="page-slug"
                value={slug}
                onChange={(event) => setSlug(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="page-type" className="text-sm font-medium">
                {t.type}
              </label>
              <select
                id="page-type"
                className={FIELD_CLASS}
                value={type}
                onChange={(event) =>
                  setType(event.target.value as SavePageInput["type"])
                }
              >
                {PAGE_TYPES.map((pageType) => (
                  <option key={pageType} value={pageType}>
                    {pageType}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label htmlFor="page-status" className="text-sm font-medium">
                {t.status}
              </label>
              <select
                id="page-status"
                className={FIELD_CLASS}
                value={status}
                onChange={(event) =>
                  setStatus(event.target.value as SavePageInput["status"])
                }
              >
                <option value="draft">draft</option>
                <option value="published">published</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t.seo}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="seo-title" className="text-sm font-medium">
              {t.seoTitle}
            </label>
            <Input
              id="seo-title"
              value={seoTitle}
              onChange={(event) => setSeoTitle(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="seo-description" className="text-sm font-medium">
              {t.seoDescription}
            </label>
            <Textarea
              id="seo-description"
              value={seoDescription}
              onChange={(event) => setSeoDescription(event.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t.content}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {blocks.map((block) => (
            <BlockEditor
              key={block.id}
              block={block}
              onChange={(updated) =>
                setBlocks((prev) =>
                  prev.map((item) =>
                    item.id === updated.id ? updated : item,
                  ),
                )
              }
              onRemove={() =>
                setBlocks((prev) =>
                  prev.filter((item) => item.id !== block.id),
                )
              }
            />
          ))}
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setBlocks((prev) => [...prev, createBlock("heading")])
              }
            >
              {t.addHeading}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setBlocks((prev) => [...prev, createBlock("text")])
              }
            >
              {t.addText}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setBlocks((prev) => [...prev, createBlock("image")])
              }
            >
              {t.addImage}
            </Button>
          </div>
        </CardContent>
      </Card>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex items-center gap-3">
        <Button type="button" onClick={handleSave} disabled={pending}>
          {pending ? t.saving : t.savePage}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push(ROUTES.dashboard.pages)}
          disabled={pending}
        >
          {t.cancel}
        </Button>
        {initial.id ? (
          <Button
            type="button"
            variant="destructive"
            className="ml-auto"
            onClick={handleDelete}
            disabled={pending}
          >
            {t.deleteBtn}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
