import type { ReactNode } from "react";

/**
 * Рендерит markdown-lite тело юридической страницы в editorial-стиле:
 * строки "## …" — подзаголовки, "- …" — пункты списка, остальное — абзацы.
 */
export function LegalBody({ body }: { body: string }) {
  const blocks: ReactNode[] = [];
  let list: string[] = [];
  let key = 0;

  const flush = () => {
    if (list.length > 0) {
      const items = list;
      blocks.push(
        <ul
          key={`ul-${key++}`}
          style={{
            margin: "16px 0",
            paddingLeft: 22,
            color: "var(--text-secondary)",
            fontSize: 16,
            lineHeight: 1.7,
          }}
        >
          {items.map((item, i) => (
            <li key={i} style={{ marginBottom: 6 }}>
              {item}
            </li>
          ))}
        </ul>,
      );
      list = [];
    }
  };

  for (const raw of body.split("\n")) {
    const line = raw.trim();
    if (!line) {
      flush();
      continue;
    }
    if (line.startsWith("## ")) {
      flush();
      blocks.push(
        <h2
          key={`h-${key++}`}
          className="serif"
          style={{
            fontSize: "clamp(1.375rem, 2.2vw, 1.75rem)",
            letterSpacing: "-0.02em",
            marginTop: 44,
            marginBottom: 14,
            fontWeight: 400,
            color: "var(--text-primary)",
          }}
        >
          {line.slice(3)}
        </h2>,
      );
    } else if (line.startsWith("- ")) {
      list.push(line.slice(2));
    } else {
      flush();
      blocks.push(
        <p
          key={`p-${key++}`}
          style={{
            fontSize: 16,
            lineHeight: 1.7,
            color: "var(--text-secondary)",
            marginTop: 16,
            maxWidth: "68ch",
          }}
        >
          {line}
        </p>,
      );
    }
  }
  flush();

  return <>{blocks}</>;
}
