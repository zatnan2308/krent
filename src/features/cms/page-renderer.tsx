import type { CSSProperties } from "react";

import type { PageBlock, PageContent } from "@/features/cms/content";

/** Размеры заголовков в editorial-тоне (serif, крупно, тонкий вес). */
const HEADING_FONT: Record<1 | 2 | 3, string> = {
  1: "clamp(1.75rem, 3vw, 2.5rem)",
  2: "clamp(1.4rem, 2.4vw, 2rem)",
  3: "clamp(1.2rem, 1.8vw, 1.5rem)",
};

function BlockView({ block }: { block: PageBlock }) {
  switch (block.type) {
    case "heading": {
      const Tag: "h1" | "h2" | "h3" = `h${block.level}`;
      const style: CSSProperties = {
        fontSize: HEADING_FONT[block.level],
        letterSpacing: "-0.02em",
        lineHeight: 1.12,
        fontWeight: 400,
        color: "var(--text-primary)",
      };
      return (
        <Tag className="serif" style={style}>
          {block.text}
        </Tag>
      );
    }
    case "text":
      return (
        <p
          style={{
            fontSize: "1.0625rem",
            lineHeight: 1.7,
            color: "var(--text-secondary)",
            maxWidth: "68ch",
            textWrap: "pretty",
          }}
        >
          {block.text}
        </p>
      );
    case "image":
      return (
        // CMS-контент: произвольный URL изображения, оптимизация next/image
        // не применяется намеренно.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={block.url}
          alt={block.alt}
          style={{
            width: "100%",
            border: "1px solid var(--border-subtle)",
          }}
        />
      );
    default:
      return null;
  }
}

/**
 * Серверный рендерер контента страницы в editorial-тоне (serif-заголовки,
 * читаемое тело, токены дизайн-системы) — чтобы generic CMS-страница не
 * выглядела «другим продуктом» внутри editorial header/footer.
 */
export function PageRenderer({ content }: { content: PageContent }) {
  if (content.blocks.length === 0) {
    return null;
  }

  return (
    <div
      style={{ display: "flex", flexDirection: "column", gap: "clamp(20px, 2.4vw, 32px)" }}
    >
      {content.blocks.map((block) => (
        <BlockView key={block.id} block={block} />
      ))}
    </div>
  );
}
