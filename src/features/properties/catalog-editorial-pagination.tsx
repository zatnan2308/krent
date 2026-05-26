import Link from "next/link";

interface Props {
  page: number;
  totalPages: number;
  getHref: (page: number) => string;
}

/** Editorial pagination: ← Previous · 01 02 03 · Next → */
export function CatalogEditorialPagination({ page, totalPages, getHref }: Props) {
  if (totalPages <= 1) return null;
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  const prevDisabled = page === 1;
  const nextDisabled = page === totalPages;

  const navStyle = (active: boolean): React.CSSProperties => ({
    fontSize: 13,
    letterSpacing: "0.06em",
    textTransform: "uppercase" as const,
    color: active ? "var(--text-primary)" : "var(--text-quaternary)",
    padding: "6px 0",
    textDecoration: "none",
    cursor: active ? "pointer" : "not-allowed",
  });

  return (
    <nav
      className="tnum"
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        gap: 24,
        padding: "80px 0 40px",
        flexWrap: "wrap",
      }}
      aria-label="Pagination"
    >
      {prevDisabled ? (
        <span style={navStyle(false)}>
          <span style={{ marginRight: 6 }}>←</span> Previous
        </span>
      ) : (
        <Link href={getHref(page - 1)} style={navStyle(true)}>
          <span style={{ marginRight: 6 }}>←</span> Previous
        </Link>
      )}

      <div
        style={{
          display: "flex",
          gap: 4,
          alignItems: "center",
          borderLeft: "1px solid var(--border-subtle)",
          borderRight: "1px solid var(--border-subtle)",
          padding: "0 24px",
        }}
      >
        {pages.map((p) => {
          const active = p === page;
          const cellStyle: React.CSSProperties = {
            width: 36,
            height: 36,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 13,
            color: active ? "var(--accent)" : "var(--text-secondary)",
            borderBottom: `1px solid ${active ? "var(--accent)" : "transparent"}`,
            textDecoration: "none",
          };
          return active ? (
            <span key={p} style={cellStyle}>
              {String(p).padStart(2, "0")}
            </span>
          ) : (
            <Link key={p} href={getHref(p)} style={cellStyle}>
              {String(p).padStart(2, "0")}
            </Link>
          );
        })}
      </div>

      {nextDisabled ? (
        <span style={navStyle(false)}>
          Next <span style={{ marginLeft: 6 }}>→</span>
        </span>
      ) : (
        <Link href={getHref(page + 1)} style={navStyle(true)}>
          Next <span style={{ marginLeft: 6 }}>→</span>
        </Link>
      )}
    </nav>
  );
}
