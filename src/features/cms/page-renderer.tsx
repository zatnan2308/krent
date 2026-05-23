import type { PageBlock, PageContent } from "@/features/cms/content";
import { cn } from "@/lib/utils";

const HEADING_SIZE: Record<1 | 2 | 3, string> = {
  1: "text-3xl",
  2: "text-2xl",
  3: "text-xl",
};

function BlockView({ block }: { block: PageBlock }) {
  switch (block.type) {
    case "heading": {
      const Tag: "h1" | "h2" | "h3" = `h${block.level}`;
      return (
        <Tag
          className={cn(
            "font-semibold tracking-tight",
            HEADING_SIZE[block.level],
          )}
        >
          {block.text}
        </Tag>
      );
    }
    case "text":
      return (
        <p className="leading-relaxed text-muted-foreground">{block.text}</p>
      );
    case "image":
      return (
        // CMS-контент: произвольный URL изображения, оптимизация next/image
        // не применяется намеренно.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={block.url}
          alt={block.alt}
          className="w-full rounded-lg border"
        />
      );
    default:
      return null;
  }
}

/**
 * Серверный рендерер контента страницы.
 * Рендерит блоки из page_translations.content. Новые типы блоков
 * добавляются в BlockView вместе с расширением схемы content.
 */
export function PageRenderer({ content }: { content: PageContent }) {
  if (content.blocks.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {content.blocks.map((block) => (
        <BlockView key={block.id} block={block} />
      ))}
    </div>
  );
}
