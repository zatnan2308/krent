import Link from "next/link";

import type { SiteContactInfo } from "@/components/layout/public-layout";
import { DEFAULT_NAV_MENUS } from "@/features/cms/default-navigation";
import type { Locale } from "@/lib/i18n";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { buildLocalizedPath } from "@/lib/seo";

interface PublicFooterProps {
  locale: Locale;
  dictionary: Dictionary;
  siteName: string;
  contact: SiteContactInfo;
  footerNav: { label: string; href: string }[];
  /** Колонки футера из БД; пустые/отсутствующие → встроенные дефолты ниже. */
  browseNav?: { label: string; href: string }[];
  areasNav?: { label: string; href: string }[];
  legalNav?: { label: string; href: string }[];
  /** Языки/валюты организации для нижней строки; пустые → дефолты. */
  locales?: string[];
  currencies?: string[];
}

const DEFAULT_TAGLINE =
  "Independent RERA-licensed realtor. Premium residential, investment and relocation — Dubai only, known block by block.";
const DEFAULT_NEWSLETTER_TITLE = "Quarterly market reports";
const DEFAULT_NEWSLETTER_BLURB =
  "Four issues per year. No filler, no unsubscribe traps.";

/** Инициалы бренда для монограммы (из названия сайта). */
function initialsFrom(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .map((word) => word.charAt(0))
      .slice(0, 2)
      .join("")
      .toUpperCase() || "K"
  );
}

function Monogram({
  size = 56,
  gold = false,
  initials = "AK",
}: {
  size?: number;
  gold?: boolean;
  initials?: string;
}) {
  return (
    <span
      className="serif"
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        border: `1px solid ${gold ? "var(--accent)" : "var(--border-medium)"}`,
        color: gold ? "var(--accent)" : "var(--text-primary)",
        fontSize: size * 0.42,
        letterSpacing: "-0.02em",
        fontWeight: 400,
        lineHeight: 1,
        fontStyle: "italic",
        flexShrink: 0,
      }}
    >
      {initials}
    </span>
  );
}

function Col({
  title,
  items,
}: {
  title: string;
  items: { label: string; href: string }[];
}) {
  return (
    <div>
      <span className="eyebrow">{title}</span>
      <ul
        style={{
          listStyle: "none",
          marginTop: 24,
          padding: 0,
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        {items.map((it) => (
          <li key={it.href + it.label}>
            <Link
              href={it.href}
              style={{
                fontSize: 14,
                color: "var(--text-secondary)",
                transition: "color 300ms var(--ease-out-expo)",
                textDecoration: "none",
              }}
            >
              {it.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function PublicFooter({
  locale,
  dictionary,
  siteName,
  contact,
  footerNav,
  browseNav,
  areasNav,
  legalNav,
  locales,
  currencies,
}: PublicFooterProps) {
  const { email: supportEmail, phone: supportPhone } = contact;
  // Нижняя строка: языки + валюты организации (фолбэк — дефолтный набор).
  const localeLabels = (
    locales && locales.length > 0 ? locales : ["en", "ar", "ru"]
  ).map((code) => code.toUpperCase());
  const currencyLabels =
    currencies && currencies.length > 0
      ? currencies.map((code) => code.toUpperCase())
      : ["USD", "AED", "EUR"];
  const bottomStrip = [...localeLabels, ...currencyLabels].join(" · ");
  // Дефолтные колонки футера — из единого источника (default-navigation.ts),
  // тот же набор, что засевает кнопка «Загрузить меню сайта» в редакторе.
  const fromDefault = (key: string) =>
    (DEFAULT_NAV_MENUS[key] ?? []).map((item) => ({
      label: item.label,
      href: buildLocalizedPath(locale, item.url),
    }));
  const colBrowse =
    browseNav && browseNav.length > 0 ? browseNav : fromDefault("footer_browse");
  const colMarkets =
    areasNav && areasNav.length > 0 ? areasNav : fromDefault("footer_areas");
  const colCompany =
    footerNav.length > 0 ? footerNav : fromDefault("footer");
  const colLegal =
    legalNav && legalNav.length > 0 ? legalNav : fromDefault("footer_legal");

  return (
    <footer
      style={{
        background: "var(--bg-primary)",
        padding: "120px 0 40px",
        borderTop: "1px solid var(--border-subtle)",
        position: "relative",
      }}
    >
      <div
        style={{
          maxWidth: "var(--max-w)",
          margin: "0 auto",
          padding: "0 var(--edge-d)",
        }}
      >
        {/* Top: monogram + tagline + newsletter inline */}
        <div
          className="ed-ft-top"
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 60,
            paddingBottom: 80,
            borderBottom: "1px solid var(--border-subtle)",
            alignItems: "end",
          }}
        >
          <div>
            <Link
              href={buildLocalizedPath(locale, "/")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
                textDecoration: "none",
                color: "inherit",
              }}
            >
              <Monogram size={56} gold initials={initialsFrom(siteName)} />
              <span
                className="serif"
                style={{
                  fontSize: "clamp(2rem, 4vw, 3rem)",
                  letterSpacing: "-0.03em",
                  fontWeight: 350,
                  lineHeight: 1,
                  color: "var(--text-primary)",
                }}
              >
                {siteName}
              </span>
            </Link>
            <p
              style={{
                marginTop: 24,
                fontSize: 15,
                color: "var(--text-secondary)",
                maxWidth: "44ch",
                lineHeight: 1.55,
              }}
            >
              {contact.footerTagline ?? DEFAULT_TAGLINE}
            </p>
            {supportEmail || supportPhone ? (
              <div
                style={{
                  marginTop: 20,
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 24,
                  fontSize: 14,
                  color: "var(--text-secondary)",
                }}
              >
                {supportEmail ? (
                  <a
                    href={`mailto:${supportEmail}`}
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {supportEmail}
                  </a>
                ) : null}
                {supportPhone ? (
                  <a
                    href={`tel:${supportPhone.replace(/\s+/g, "")}`}
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {supportPhone}
                  </a>
                ) : null}
              </div>
            ) : null}
          </div>

          {/* Newsletter inline */}
          <div>
            <span className="eyebrow gold">
              {contact.newsletterTitle ?? DEFAULT_NEWSLETTER_TITLE}
            </span>
            <p
              style={{
                marginTop: 14,
                fontSize: 14,
                color: "var(--text-secondary)",
                marginBottom: 24,
                maxWidth: "38ch",
              }}
            >
              {contact.newsletterBlurb ?? DEFAULT_NEWSLETTER_BLURB}
            </p>
            <form
              action={buildLocalizedPath(locale, "/contact")}
              method="get"
              style={{
                display: "flex",
                gap: 12,
                borderBottom: "1px solid var(--border-medium)",
                paddingBottom: 8,
              }}
            >
              <input
                type="email"
                name="email"
                placeholder="your@email.com"
                style={{
                  flex: 1,
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  color: "var(--text-primary)",
                  fontSize: 15,
                  fontFamily: "inherit",
                  padding: "8px 0",
                }}
              />
              <button
                type="submit"
                className="btn-text"
                style={{
                  fontSize: 12,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: "var(--accent)",
                  whiteSpace: "nowrap",
                }}
              >
                Subscribe <span className="arrow">→</span>
              </button>
            </form>
          </div>
        </div>

        {/* Link columns */}
        <div
          className="ed-ft-cols"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 60,
            padding: "80px 0",
          }}
        >
          <Col title="Browse" items={colBrowse} />
          <Col title="Areas" items={colMarkets} />
          <Col title="Company" items={colCompany} />
          <Col title="Legal" items={colLegal} />
        </div>

        {/* Bottom strip */}
        <div
          className="ed-ft-bottom tnum"
          style={{
            paddingTop: 32,
            borderTop: "1px solid var(--border-subtle)",
            display: "grid",
            gridTemplateColumns: "1fr auto 1fr",
            gap: 40,
            alignItems: "center",
            fontSize: 11.5,
            color: "var(--text-tertiary)",
            letterSpacing: "0.04em",
          }}
        >
          <div>
            © {new Date().getFullYear()} {siteName}. {dictionary.footer.rights}
          </div>
          <div style={{ display: "flex", gap: 28, justifyContent: "center" }}>
            {contact.socials.map((s) => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "var(--text-secondary)" }}
              >
                {s.label}
              </a>
            ))}
          </div>
          <div style={{ textAlign: "right" }}>{bottomStrip}</div>
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .ed-ft-top { grid-template-columns: 1fr !important; gap: 48px !important; }
          .ed-ft-cols { grid-template-columns: 1fr 1fr !important; gap: 40px !important; }
          .ed-ft-bottom { grid-template-columns: 1fr !important; text-align: left !important; }
          .ed-ft-bottom > * { text-align: left !important; }
        }
      `}</style>
    </footer>
  );
}
