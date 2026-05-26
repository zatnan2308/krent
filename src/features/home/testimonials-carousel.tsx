"use client";

import * as React from "react";

import type { HomeTestimonial } from "./queries";

interface Props {
  items: HomeTestimonial[];
}

/** Карусель отзывов: одна крупная цитата + пагинация 01/03. */
export function TestimonialsCarousel({ items }: Props) {
  const [idx, setIdx] = React.useState(0);
  if (items.length === 0) return null;
  const cur = items[idx]!;
  const next = () => setIdx((idx + 1) % items.length);
  const prev = () => setIdx((idx - 1 + items.length) % items.length);

  return (
    <div
      style={{
        maxWidth: 1080,
        margin: "60px auto 0",
        position: "relative",
      }}
    >
      {/* Большая прозрачная кавычка */}
      <span
        className="serif"
        aria-hidden
        style={{
          position: "absolute",
          top: -60,
          left: -12,
          fontSize: 180,
          lineHeight: 1,
          color: "var(--accent)",
          opacity: 0.18,
          fontStyle: "italic",
          pointerEvents: "none",
          userSelect: "none",
        }}
      >
        “
      </span>

      <blockquote
        key={cur.id}
        className="serif"
        style={{
          fontSize: "clamp(1.75rem, 3.5vw, 2.85rem)",
          lineHeight: 1.22,
          letterSpacing: "-0.025em",
          color: "var(--text-primary)",
          fontWeight: 350,
          margin: 0,
          textAlign: "left",
          animation: "ed-fade-quote 800ms var(--ease-out-expo)",
        }}
      >
        {cur.quote}
      </blockquote>

      <div
        key={`m-${cur.id}`}
        style={{
          marginTop: 56,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 24,
          flexWrap: "wrap",
          animation: "ed-fade-quote 800ms var(--ease-out-expo) 100ms backwards",
        }}
      >
        <div>
          {cur.author_name ? (
            <div
              style={{
                fontSize: 14,
                color: "var(--text-primary)",
                letterSpacing: "0.01em",
                marginBottom: 4,
              }}
            >
              {cur.author_name}
            </div>
          ) : null}
          {cur.deal_label ? (
            <div
              style={{
                fontSize: 12,
                letterSpacing: "0.06em",
                color: "var(--text-tertiary)",
                textTransform: "uppercase",
              }}
            >
              {cur.deal_label}
            </div>
          ) : null}
        </div>

        {items.length > 1 ? (
          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            <span
              className="tnum"
              style={{
                fontSize: 13,
                letterSpacing: "0.04em",
                color: "var(--text-tertiary)",
              }}
            >
              <span style={{ color: "var(--accent)" }}>
                {String(idx + 1).padStart(2, "0")}
              </span>{" "}
              / {String(items.length).padStart(2, "0")}
            </span>
            <div style={{ display: "flex", gap: 4 }}>
              <button
                type="button"
                onClick={prev}
                aria-label="Previous testimonial"
                style={{
                  width: 44,
                  height: 44,
                  border: "1px solid var(--border-medium)",
                  color: "var(--text-primary)",
                  fontSize: 16,
                  background: "transparent",
                  cursor: "pointer",
                  transition: "all 400ms var(--ease-out-expo)",
                }}
              >
                ←
              </button>
              <button
                type="button"
                onClick={next}
                aria-label="Next testimonial"
                style={{
                  width: 44,
                  height: 44,
                  border: "1px solid var(--border-medium)",
                  color: "var(--text-primary)",
                  fontSize: 16,
                  background: "transparent",
                  cursor: "pointer",
                  transition: "all 400ms var(--ease-out-expo)",
                }}
              >
                →
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
