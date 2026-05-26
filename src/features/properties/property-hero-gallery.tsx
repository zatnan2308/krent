"use client";

import * as React from "react";
import Link from "next/link";

interface GalleryImage {
  url: string;
  alt?: string | null;
}

interface Props {
  images: GalleryImage[];
  title: string;
  location: string;
  eyebrow: string[];
  badge?: string | null;
  backHref: string;
  backLabel: string;
}

/** Editorial property hero: 82vh full-bleed photo с навигацией, breadcrumb,
 *  заголовком и thumbnail strip снизу. Подсветка active-thumb и переключение
 *  по клавишам ← / →. */
export function PropertyHeroGallery({
  images,
  title,
  location,
  eyebrow,
  badge,
  backHref,
  backLabel,
}: Props) {
  const [idx, setIdx] = React.useState(0);
  const total = images.length;
  const cur = images[Math.min(idx, total - 1)] ?? images[0];

  const next = React.useCallback(() => {
    setIdx((i) => (i + 1) % Math.max(1, total));
  }, [total]);
  const prev = React.useCallback(() => {
    setIdx((i) => (i - 1 + Math.max(1, total)) % Math.max(1, total));
  }, [total]);

  // Стрелки клавиатуры — UX-плюс к photo-gallery.
  React.useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "ArrowRight") next();
      else if (event.key === "ArrowLeft") prev();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev]);

  if (!cur) {
    return (
      <section
        className="on-dark"
        style={{
          height: "60vh",
          minHeight: 400,
          background: "#0F0F12",
          marginTop: 80,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--text-secondary)",
        }}
      >
        No photos available
      </section>
    );
  }

  return (
    <section
      className="on-dark"
      style={{
        position: "relative",
        height: "82vh",
        minHeight: 620,
        background: "#0F0F12",
        overflow: "hidden",
        marginTop: 80,
      }}
    >
      <div
        key={cur.url}
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `url(${cur.url})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          animation: "edGalleryFade 900ms var(--ease-out-expo)",
          filter: "brightness(0.85)",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(180deg, rgba(11,11,12,0.4) 0%, rgba(11,11,12,0) 30%, rgba(11,11,12,0) 60%, rgba(11,11,12,0.85) 100%)",
        }}
      />

      {/* Top breadcrumb */}
      <div
        style={{
          position: "absolute",
          top: 32,
          left:
            "max(var(--edge-d), calc((100vw - var(--max-w))/2 + var(--edge-d)))",
          right:
            "max(var(--edge-d), calc((100vw - var(--max-w))/2 + var(--edge-d)))",
          display: "flex",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
          fontSize: 11,
          letterSpacing: "0.22em",
          color: "var(--text-secondary)",
          textTransform: "uppercase",
        }}
      >
        <div
          style={{ display: "flex", gap: 18, alignItems: "center", flexWrap: "wrap" }}
        >
          <Link
            href={backHref}
            style={{ color: "inherit", textDecoration: "none" }}
          >
            <span style={{ marginRight: 8 }}>←</span> {backLabel}
          </Link>
          {eyebrow.map((chip, i) => (
            <React.Fragment key={chip + i}>
              <span style={{ color: "var(--border-medium)" }}>·</span>
              <span style={{ color: "var(--text-primary)" }}>{chip}</span>
            </React.Fragment>
          ))}
        </div>
        {badge ? (
          <span
            style={{
              color: "var(--accent)",
              border: "1px solid var(--accent-line)",
              padding: "5px 10px",
              fontSize: 10,
            }}
          >
            {badge}
          </span>
        ) : null}
      </div>

      {/* Bottom content row */}
      <div
        style={{
          position: "absolute",
          left:
            "max(var(--edge-d), calc((100vw - var(--max-w))/2 + var(--edge-d)))",
          right:
            "max(var(--edge-d), calc((100vw - var(--max-w))/2 + var(--edge-d)))",
          bottom: 48,
          display: "flex",
          alignItems: "end",
          justifyContent: "space-between",
          gap: 40,
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1
            className="serif"
            style={{
              fontSize: "clamp(2.25rem, 5.5vw, 4.75rem)",
              letterSpacing: "-0.04em",
              lineHeight: 0.98,
              marginTop: 14,
              fontWeight: 400,
              maxWidth: "16ch",
              color: "var(--text-primary)",
            }}
          >
            {title}
          </h1>
          {location ? (
            <div
              style={{
                marginTop: 16,
                fontSize: 15,
                color: "var(--text-secondary)",
                letterSpacing: "0.005em",
              }}
            >
              {location}
            </div>
          ) : null}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 32,
            paddingBottom: 4,
            flexWrap: "wrap",
          }}
        >
          <span
            className="tnum"
            style={{
              fontSize: 13,
              letterSpacing: "0.06em",
              color: "var(--text-secondary)",
            }}
          >
            <span style={{ color: "var(--accent)" }}>
              {String(idx + 1).padStart(2, "0")}
            </span>{" "}
            <span style={{ color: "var(--text-tertiary)" }}>
              / {String(total).padStart(2, "0")}
            </span>
          </span>
          <div style={{ display: "flex", gap: 4 }}>
            <GalleryBtn onClick={prev} label="←" ariaLabel="Previous photo" />
            <GalleryBtn onClick={next} label="→" ariaLabel="Next photo" />
          </div>
        </div>
      </div>

      {/* Thumbnail strip */}
      {total > 1 ? (
        <div
          className="ed-thumb-strip"
          style={{
            position: "absolute",
            left:
              "max(var(--edge-d), calc((100vw - var(--max-w))/2 + var(--edge-d)))",
            bottom: -36,
            display: "flex",
            gap: 8,
            zIndex: 5,
          }}
        >
          {images.slice(0, 5).map((img, i) => (
            <button
              key={img.url + i}
              type="button"
              onClick={() => setIdx(i)}
              aria-label={`Photo ${i + 1}`}
              style={{
                width: 72,
                height: 72,
                backgroundImage: `url(${img.url})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                opacity: idx === i ? 1 : 0.5,
                border:
                  idx === i
                    ? "1px solid var(--accent)"
                    : "1px solid var(--border-medium)",
                boxShadow:
                  idx === i ? "0 6px 20px -8px rgba(11,11,12,0.4)" : "none",
                cursor: "pointer",
                padding: 0,
              }}
            />
          ))}
          {total > 5 ? (
            <button
              type="button"
              className="serif"
              onClick={() => setIdx(5)}
              style={{
                width: 72,
                height: 72,
                border: "1px solid var(--border-medium)",
                color: "var(--text-secondary)",
                background: "rgba(11,11,12,0.55)",
                backdropFilter: "blur(8px)",
                fontSize: 13,
                letterSpacing: "-0.02em",
                cursor: "pointer",
              }}
            >
              +{total - 5}
            </button>
          ) : null}
        </div>
      ) : null}

      <style>{`
        @keyframes edGalleryFade {
          from { opacity: 0.3; }
          to { opacity: 1; }
        }
        @media (max-width: 760px) {
          .ed-thumb-strip { display: none !important; }
        }
      `}</style>
    </section>
  );
}

function GalleryBtn({
  onClick,
  label,
  ariaLabel,
}: {
  onClick: () => void;
  label: string;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      style={{
        width: 42,
        height: 42,
        border: "1px solid var(--border-medium)",
        color: "var(--text-primary)",
        fontSize: 15,
        background: "rgba(11,11,12,0.25)",
        backdropFilter: "blur(8px)",
        cursor: "pointer",
        fontFamily: "inherit",
      }}
    >
      {label}
    </button>
  );
}
