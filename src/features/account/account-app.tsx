"use client";

import * as React from "react";
import Link from "next/link";

import { requestAccountDeletion } from "@/features/account/actions";
import { AccountMessageButton } from "@/features/account/account-message-button";
import type {
  AccountData,
  AccountPayment,
  AccountSaved,
  AccountTrip,
  TripStatus,
} from "@/features/account/queries";

const MONO = "'Geist Mono', ui-monospace, monospace";

type SectionKey = "trips" | "saved" | "messages" | "payments" | "profile";

type PillStyle = { label: string; fg: string; bg: string };

const STATUS_STYLE: Record<string, PillStyle> = {
  confirmed: { label: "Confirmed", fg: "#2f6b3a", bg: "rgba(125,195,131,0.16)" },
  pending: { label: "Payment due", fg: "#8a6d1f", bg: "rgba(201,169,97,0.18)" },
  past: { label: "Completed", fg: "var(--text-tertiary)", bg: "var(--bg-tertiary)" },
  cancelled: { label: "Cancelled", fg: "#9a4b40", bg: "rgba(154,75,64,0.14)" },
};

function tripPill(trip: AccountTrip): PillStyle {
  if (trip.status === "cancelled") return STATUS_STYLE.cancelled!;
  if (trip.status === "past") return STATUS_STYLE.past!;
  return trip.paid ? STATUS_STYLE.confirmed! : STATUS_STYLE.pending!;
}

function Pill({ style }: { style: PillStyle }) {
  return (
    <span
      style={{
        fontSize: 10.5,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: style.fg,
        background: style.bg,
        padding: "5px 10px",
        borderRadius: 999,
        fontWeight: 500,
        whiteSpace: "nowrap",
      }}
    >
      {style.label}
    </span>
  );
}

function fmtDate(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function daysAway(value: string): number {
  const ms = new Date(value).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / 86_400_000));
}

function propertyHref(slug: string | null): string {
  return slug ? `/en/properties/${slug}` : "#";
}

export function AccountApp({ data }: { data: AccountData }) {
  const [active, setActive] = React.useState<SectionKey>("trips");

  const upcoming = data.trips.filter((t) => t.status === "upcoming");
  const unread = data.conversations.filter((c) => c.hasUnread).length;
  const firstName = data.profile.name.split(/\s+/)[0] ?? data.profile.name;

  const views: Record<SectionKey, React.ReactNode> = {
    trips: <TripsView trips={data.trips} />,
    saved: <SavedView saved={data.saved} />,
    messages: <MessagesView conversations={data.conversations} />,
    payments: <PaymentsView payments={data.payments} />,
    profile: <ProfileView data={data} />,
  };

  return (
    <main style={{ background: "var(--bg-primary)", minHeight: "100vh" }}>
      {/* Greeting band */}
      <section style={{ paddingTop: 120, borderBottom: "1px solid var(--border-subtle)" }}>
        <div
          style={{
            maxWidth: "var(--max-w)",
            margin: "0 auto",
            padding: "0 var(--edge-d)",
          }}
        >
          <div style={{ padding: "8px 0 12px" }}>
            <span className="eyebrow" style={{ color: "var(--accent)" }}>
              <span className="dot" /> Client account
            </span>
            <h1
              className="serif"
              style={{
                fontSize: "clamp(2rem, 4vw, 3rem)",
                letterSpacing: "-0.03em",
                marginTop: 14,
                fontWeight: 400,
                lineHeight: 1,
              }}
            >
              Welcome back,{" "}
              <em style={{ fontStyle: "italic", color: "var(--accent)" }}>
                {firstName}.
              </em>
            </h1>
            <p
              className="tnum"
              style={{ marginTop: 12, fontSize: 14, color: "var(--text-secondary)" }}
            >
              {upcoming.length} upcoming {upcoming.length === 1 ? "trip" : "trips"} ·{" "}
              {data.saved.length} saved · {unread} unread
            </p>
          </div>

          <StatStrip
            upcoming={upcoming.length}
            saved={data.saved.length}
            payments={data.payments.length}
            unread={unread}
            setActive={setActive}
          />
        </div>
      </section>

      <section style={{ padding: "clamp(36px, 5vw, 56px) 0 clamp(64px,8vw,110px)" }}>
        <div
          style={{
            maxWidth: "var(--max-w)",
            margin: "0 auto",
            padding: "0 var(--edge-d)",
          }}
        >
          <div
            className="acct-layout"
            style={{
              display: "grid",
              gridTemplateColumns: "230px 1fr",
              gap: "clamp(32px, 4vw, 64px)",
              alignItems: "start",
            }}
          >
            <AcctSidebar
              active={active}
              setActive={setActive}
              upcoming={upcoming.length}
              unread={unread}
            />
            <div style={{ minWidth: 0 }}>{views[active]}</div>
          </div>
        </div>
      </section>

      <style>{`
        .trip-row:hover { box-shadow: 0 16px 40px -26px rgba(11,11,12,0.28); transform: translateY(-2px); }
        .stat-card:hover { transform: translateY(-3px); box-shadow: 0 16px 38px -24px rgba(11,11,12,0.26); border-color: var(--accent) !important; }
        @media (max-width: 920px) {
          .acct-layout { grid-template-columns: 1fr !important; }
          .acct-side { position: static !important; }
          .acct-side > div { flex-direction: row !important; flex-wrap: wrap; }
          .acct-hero { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 680px) {
          .saved-grid { grid-template-columns: 1fr !important; }
          .stat-strip { grid-template-columns: 1fr 1fr !important; }
          .trip-row { grid-template-columns: 84px 1fr !important; }
          .pay-head { display: none !important; }
          .pay-row { grid-template-columns: 1fr auto !important; row-gap: 4px !important; }
        }
      `}</style>
    </main>
  );
}

// ---------------- Stat strip ----------------

function StatStrip({
  upcoming,
  saved,
  payments,
  unread,
  setActive,
}: {
  upcoming: number;
  saved: number;
  payments: number;
  unread: number;
  setActive: (k: SectionKey) => void;
}) {
  const stats: { key: SectionKey; label: string; value: string; sub: string }[] = [
    { key: "trips", label: "Upcoming trips", value: String(upcoming), sub: upcoming ? "View itinerary" : "Nothing booked" },
    { key: "saved", label: "Saved", value: String(saved), sub: saved ? "Your shortlist" : "Nothing saved yet" },
    { key: "payments", label: "Payments", value: String(payments), sub: payments ? "View history" : "No payments yet" },
    { key: "messages", label: "Unread", value: String(unread), sub: unread ? "New messages" : "All caught up" },
  ];
  return (
    <div
      className="stat-strip"
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: 14,
        paddingBottom: 26,
      }}
    >
      {stats.map((s) => (
        <button
          key={s.key}
          type="button"
          onClick={() => setActive(s.key)}
          className="stat-card"
          style={{
            textAlign: "left",
            padding: "18px 20px",
            borderRadius: 14,
            border: "1px solid var(--border-subtle)",
            background: "var(--bg-elevated)",
            display: "flex",
            flexDirection: "column",
            gap: 8,
            cursor: "pointer",
            fontFamily: "inherit",
            transition:
              "transform 400ms var(--ease-out-expo), box-shadow 400ms var(--ease-out-expo), border-color 400ms",
          }}
        >
          <span
            style={{
              fontSize: 10.5,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "var(--text-tertiary)",
            }}
          >
            {s.label}
          </span>
          <span
            className="serif tnum"
            style={{
              fontSize: "clamp(1.375rem, 2.2vw, 1.75rem)",
              letterSpacing: "-0.02em",
              color: "var(--text-primary)",
              lineHeight: 1,
            }}
          >
            {s.value}
          </span>
          <span style={{ fontSize: 11.5, color: "var(--text-secondary)" }}>{s.sub}</span>
        </button>
      ))}
    </div>
  );
}

// ---------------- Sidebar ----------------

function AcctSidebar({
  active,
  setActive,
  upcoming,
  unread,
}: {
  active: SectionKey;
  setActive: (k: SectionKey) => void;
  upcoming: number;
  unread: number;
}) {
  const items: [SectionKey, string, number | null][] = [
    ["trips", "Trips", upcoming || null],
    ["saved", "Saved", null],
    ["messages", "Messages", unread || null],
    ["payments", "Payments", null],
    ["profile", "Account", null],
  ];
  return (
    <aside className="acct-side" style={{ position: "sticky", top: 104, alignSelf: "start" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {items.map(([key, label, badge]) => {
          const on = active === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setActive(key)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                padding: "13px 16px",
                textAlign: "left",
                borderRadius: 10,
                background: on ? "var(--bg-elevated)" : "transparent",
                border: `1px solid ${on ? "var(--border-subtle)" : "transparent"}`,
                boxShadow: on ? "0 1px 2px rgba(11,11,12,0.04)" : "none",
                cursor: "pointer",
                fontFamily: "inherit",
                transition: "all 300ms var(--ease-out-expo)",
              }}
            >
              <span
                style={{
                  fontSize: 14,
                  color: on ? "var(--text-primary)" : "var(--text-secondary)",
                  letterSpacing: "0.005em",
                }}
              >
                {label}
              </span>
              {badge ? (
                <span
                  className="tnum"
                  style={{
                    fontSize: 11,
                    minWidth: 20,
                    height: 20,
                    padding: "0 6px",
                    borderRadius: 999,
                    background: on ? "var(--accent)" : "var(--border-medium)",
                    color: on ? "var(--bg-primary)" : "var(--text-secondary)",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 600,
                  }}
                >
                  {badge}
                </span>
              ) : (
                <span style={{ fontSize: 13, color: on ? "var(--accent)" : "var(--text-quaternary)" }}>
                  →
                </span>
              )}
            </button>
          );
        })}
      </div>
      <form action="/api/auth/sign-out" method="post">
        <button
          type="submit"
          style={{
            display: "block",
            width: "100%",
            marginTop: 24,
            paddingTop: 20,
            borderTop: "1px solid var(--border-subtle)",
            fontSize: 12.5,
            color: "var(--text-tertiary)",
            letterSpacing: "0.02em",
            textAlign: "left",
            background: "transparent",
            border: "none",
            borderTopWidth: 1,
            borderTopStyle: "solid",
            borderTopColor: "var(--border-subtle)",
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          ← Sign out
        </button>
      </form>
    </aside>
  );
}

// ---------------- Trips ----------------

function TripsView({ trips }: { trips: AccountTrip[] }) {
  const [tab, setTab] = React.useState<TripStatus>("upcoming");
  const upcoming = trips
    .filter((t) => t.status === "upcoming")
    .sort((a, b) => a.checkIn.localeCompare(b.checkIn));
  const next = upcoming[0];
  const list = trips.filter((t) => t.status === tab);
  const tabs: [TripStatus, string][] = [
    ["upcoming", "Upcoming"],
    ["past", "Past"],
    ["cancelled", "Cancelled"],
  ];

  return (
    <div>
      {next ? (
        <div style={{ marginBottom: 40 }}>
          <SectionLabel>Your next stay</SectionLabel>
          <div
            className="acct-hero"
            style={{
              display: "grid",
              gridTemplateColumns: "1.1fr 1fr",
              borderRadius: 16,
              overflow: "hidden",
              border: "1px solid var(--border-subtle)",
              background: "var(--bg-elevated)",
              boxShadow:
                "0 1px 2px rgba(11,11,12,0.04), 0 24px 60px -34px rgba(11,11,12,0.26)",
            }}
          >
            <div style={{ position: "relative", minHeight: 260, background: "var(--bg-tertiary)" }}>
              {next.img ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={next.img}
                  alt={next.propertyTitle}
                  style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : null}
              <div style={{ position: "absolute", top: 16, left: 16 }}>
                <Pill style={tripPill(next)} />
              </div>
              <div
                className="tnum"
                style={{
                  position: "absolute",
                  bottom: 16,
                  left: 16,
                  background: "rgba(11,11,12,0.6)",
                  backdropFilter: "blur(8px)",
                  color: "#F5F4EE",
                  borderRadius: 999,
                  padding: "7px 14px",
                  fontSize: 12,
                  letterSpacing: "0.04em",
                }}
              >
                Check-in in {daysAway(next.checkIn)} days
              </div>
            </div>
            <div style={{ padding: "clamp(22px, 3vw, 34px)", display: "flex", flexDirection: "column" }}>
              <div
                style={{
                  fontFamily: MONO,
                  fontSize: 10.5,
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  color: "var(--text-tertiary)",
                }}
              >
                {next.reference}
              </div>
              <h3
                className="serif"
                style={{
                  fontSize: "clamp(1.5rem, 2.6vw, 2rem)",
                  letterSpacing: "-0.02em",
                  marginTop: 8,
                  fontWeight: 400,
                }}
              >
                {next.propertyTitle}
              </h3>
              {next.location ? (
                <div style={{ fontSize: 13.5, color: "var(--text-secondary)", marginTop: 6 }}>
                  {next.location}
                </div>
              ) : null}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginTop: 24 }}>
                <Field label="Check-in" value={fmtDate(next.checkIn)} />
                <Field label="Checkout" value={fmtDate(next.checkOut)} />
                <Field label="Guests" value={`${next.guests} guests`} />
                <Field label="Total" value={next.totalText} gold />
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: "auto", paddingTop: 26, flexWrap: "wrap" }}>
                <Link
                  href={propertyHref(next.propertySlug)}
                  className="btn-solid"
                  style={{ padding: "12px 20px", borderRadius: 10, fontSize: 12.5, letterSpacing: "0.04em", display: "flex" }}
                >
                  View property
                </Link>
                <AccountMessageButton
                  label="Message host"
                  className="btn btn-primary"
                  style={{ padding: "11px 18px", borderRadius: 10 }}
                />
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <SectionLabel>All bookings</SectionLabel>
      <div style={{ display: "flex", gap: 24, borderBottom: "1px solid var(--border-subtle)", marginBottom: 22 }}>
        {tabs.map(([k, l]) => {
          const on = tab === k;
          const c = trips.filter((t) => t.status === k).length;
          return (
            <button
              key={k}
              type="button"
              onClick={() => setTab(k)}
              style={{
                padding: "0 0 14px",
                marginBottom: -1,
                borderBottom: `2px solid ${on ? "var(--accent)" : "transparent"}`,
                color: on ? "var(--text-primary)" : "var(--text-secondary)",
                fontSize: 14,
                display: "flex",
                gap: 7,
                alignItems: "baseline",
                background: "transparent",
                border: "none",
                borderBottomWidth: 2,
                borderBottomStyle: "solid",
                borderBottomColor: on ? "var(--accent)" : "transparent",
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              {l}
              <span className="tnum" style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
                {c}
              </span>
            </button>
          );
        })}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {list.length ? (
          list.map((t) => <TripRow key={t.id} trip={t} />)
        ) : (
          <Empty label="Nothing here yet." />
        )}
      </div>
    </div>
  );
}

function TripRow({ trip }: { trip: AccountTrip }) {
  return (
    <Link
      href={propertyHref(trip.propertySlug)}
      className="acct-card trip-row"
      style={{
        display: "grid",
        gridTemplateColumns: "120px 1fr auto",
        gap: 20,
        alignItems: "center",
        padding: 14,
        borderRadius: 14,
        border: "1px solid var(--border-subtle)",
        background: "var(--bg-elevated)",
        textDecoration: "none",
        color: "inherit",
        transition:
          "box-shadow 400ms var(--ease-out-expo), transform 400ms var(--ease-out-expo)",
      }}
    >
      <div style={{ width: 120, height: 90, borderRadius: 10, overflow: "hidden", background: "var(--bg-tertiary)" }}>
        {trip.img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={trip.img} alt={trip.propertyTitle} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : null}
      </div>
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6, flexWrap: "wrap" }}>
          <Pill style={tripPill(trip)} />
          <span style={{ fontFamily: MONO, fontSize: 10.5, color: "var(--text-tertiary)", letterSpacing: "0.08em" }}>
            {trip.reference}
          </span>
        </div>
        <h4 className="serif" style={{ fontSize: "1.25rem", letterSpacing: "-0.015em", fontWeight: 400 }}>
          {trip.propertyTitle}
        </h4>
        <div className="tnum" style={{ fontSize: 12.5, color: "var(--text-secondary)", marginTop: 5 }}>
          {fmtDate(trip.checkIn)} → {fmtDate(trip.checkOut)} · {trip.nights} nights · {trip.guests} guests
        </div>
      </div>
      <div style={{ textAlign: "right", display: "flex", flexDirection: "column", gap: 10, alignItems: "flex-end" }}>
        <span className="serif tnum" style={{ fontSize: "1.25rem", color: "var(--accent)", letterSpacing: "-0.01em" }}>
          {trip.totalText}
        </span>
        <span className="btn-text" style={{ fontSize: 12, letterSpacing: "0.05em", textTransform: "uppercase" }}>
          View →
        </span>
      </div>
    </Link>
  );
}

// ---------------- Saved ----------------

function SavedView({ saved }: { saved: AccountSaved[] }) {
  return (
    <div>
      <SectionLabel>Saved properties</SectionLabel>
      {saved.length === 0 ? (
        <Empty label="No saved properties yet." />
      ) : (
        <div
          className="saved-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: "clamp(20px, 2.4vw, 28px)",
          }}
        >
          {saved.map((p) => (
            <Link
              key={p.propertyId}
              href={propertyHref(p.slug)}
              className="img-hover"
              style={{ display: "block", textDecoration: "none", color: "inherit" }}
            >
              <div
                style={{
                  aspectRatio: "4 / 3",
                  overflow: "hidden",
                  position: "relative",
                  background: "var(--bg-tertiary)",
                }}
              >
                {p.img ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.img} alt={p.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : null}
              </div>
              <div style={{ paddingTop: 14 }}>
                {p.location ? (
                  <div
                    style={{
                      fontSize: 11,
                      letterSpacing: "0.18em",
                      textTransform: "uppercase",
                      color: "var(--text-tertiary)",
                    }}
                  >
                    {p.location}
                  </div>
                ) : null}
                <h3
                  className="serif"
                  style={{
                    fontSize: "clamp(1.2rem, 1.8vw, 1.5rem)",
                    letterSpacing: "-0.025em",
                    lineHeight: 1.12,
                    fontWeight: 400,
                    marginTop: 8,
                  }}
                >
                  {p.title}
                </h3>
                {p.priceText ? (
                  <div
                    className="serif tnum"
                    style={{ marginTop: 10, fontSize: "1.25rem", color: "var(--accent)", letterSpacing: "-0.02em" }}
                  >
                    {p.priceText}
                  </div>
                ) : null}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------- Messages ----------------

function MessagesView({
  conversations,
}: {
  conversations: AccountData["conversations"];
}) {
  return (
    <div>
      <SectionLabel>Messages</SectionLabel>
      {conversations.length === 0 ? (
        <div style={{ display: "grid", gap: 16, justifyItems: "start" }}>
          <Empty label="No conversations yet." />
          <AccountMessageButton
            label="Message your agent"
            className="btn btn-primary"
            style={{ padding: "11px 18px", borderRadius: 10 }}
          />
        </div>
      ) : (
        <div
          style={{
            border: "1px solid var(--border-subtle)",
            borderRadius: 14,
            overflow: "hidden",
            background: "var(--bg-elevated)",
          }}
        >
          {conversations.map((c, i) => (
            <Link
              key={c.id}
              href={`/portal/messages?c=${c.id}`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                padding: "16px 20px",
                borderBottom:
                  i < conversations.length - 1 ? "1px solid var(--border-subtle)" : "none",
                textDecoration: "none",
                color: "inherit",
              }}
            >
              <span
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: "50%",
                  background: "var(--accent)",
                  color: "var(--bg-primary)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 12,
                  fontWeight: 600,
                  flexShrink: 0,
                }}
              >
                {c.title.charAt(0).toUpperCase()}
              </span>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
                  <span
                    style={{
                      fontSize: 14,
                      color: "var(--text-primary)",
                      fontWeight: c.hasUnread ? 600 : 400,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {c.title}
                  </span>
                  {c.lastMessageAt ? (
                    <span className="tnum" style={{ fontSize: 11, color: "var(--text-tertiary)", flexShrink: 0 }}>
                      {fmtDate(c.lastMessageAt)}
                    </span>
                  ) : null}
                </div>
                <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginTop: 3 }}>
                  Open in messages →
                </div>
              </div>
              {c.hasUnread ? (
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--accent)", flexShrink: 0 }} />
              ) : null}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------- Payments ----------------

function PaymentsView({ payments }: { payments: AccountPayment[] }) {
  if (payments.length === 0) {
    return (
      <div>
        <SectionLabel>Payment history</SectionLabel>
        <Empty label="No payments yet." />
      </div>
    );
  }
  return (
    <div>
      <SectionLabel>Payment history</SectionLabel>
      <div
        className="acct-card"
        style={{
          border: "1px solid var(--border-subtle)",
          borderRadius: 14,
          overflow: "hidden",
          background: "var(--bg-elevated)",
        }}
      >
        <div
          className="pay-head"
          style={{
            display: "grid",
            gridTemplateColumns: "120px 1fr 140px 120px",
            gap: 16,
            padding: "14px 22px",
            borderBottom: "1px solid var(--border-medium)",
            fontFamily: MONO,
            fontSize: 10,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "var(--text-tertiary)",
          }}
        >
          <span>Date</span>
          <span>Description</span>
          <span>Method</span>
          <span style={{ textAlign: "right" }}>Amount</span>
        </div>
        {payments.map((p, i) => (
          <div
            key={p.id}
            className="pay-row"
            style={{
              display: "grid",
              gridTemplateColumns: "120px 1fr 140px 120px",
              gap: 16,
              padding: "16px 22px",
              borderBottom: i < payments.length - 1 ? "1px solid var(--border-subtle)" : "none",
              alignItems: "center",
            }}
          >
            <span className="tnum" style={{ fontSize: 12.5, color: "var(--text-secondary)" }}>
              {fmtDate(p.date)}
            </span>
            <span style={{ fontSize: 13.5, color: "var(--text-primary)" }}>{p.description}</span>
            <span style={{ fontSize: 12.5, color: "var(--text-secondary)", textTransform: "capitalize" }}>
              {p.method}
            </span>
            <span className="serif tnum" style={{ fontSize: 15, color: "var(--text-primary)", textAlign: "right" }}>
              {p.amountText}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------- Profile ----------------

function ProfileView({ data }: { data: AccountData }) {
  const c = data.profile;
  return (
    <div>
      <SectionLabel>Account details</SectionLabel>
      <div
        className="acct-card"
        style={{
          border: "1px solid var(--border-subtle)",
          borderRadius: 16,
          background: "var(--bg-elevated)",
          padding: "clamp(24px, 3vw, 36px)",
          maxWidth: 640,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18, paddingBottom: 24, borderBottom: "1px solid var(--border-subtle)" }}>
          <span
            style={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              background: "var(--accent)",
              color: "var(--bg-primary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 22,
              fontWeight: 600,
              flexShrink: 0,
            }}
          >
            {c.initials}
          </span>
          <div>
            <h3 className="serif" style={{ fontSize: "1.5rem", letterSpacing: "-0.02em", fontWeight: 400 }}>
              {c.name}
            </h3>
            {c.memberSince ? (
              <div style={{ fontSize: 12.5, color: "var(--text-tertiary)", marginTop: 3 }}>
                Member since {c.memberSince}
              </div>
            ) : null}
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 22, marginTop: 24 }}>
          <Field label="Full name" value={c.name} />
          <Field label="Email" value={c.email ?? "—"} />
          <Field label="Phone" value={c.phone ?? "—"} />
          <Field label="Organization" value={data.organizationName ?? "—"} />
        </div>
      </div>

      {/* Danger zone */}
      <div
        className="acct-card"
        style={{
          marginTop: 20,
          border: "1px solid rgba(154,75,64,0.28)",
          borderRadius: 16,
          background: "rgba(154,75,64,0.04)",
          padding: "clamp(22px, 3vw, 30px)",
          maxWidth: 640,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
          <div>
            <h4 className="serif" style={{ fontSize: "1.125rem", letterSpacing: "-0.01em", fontWeight: 400, color: "#9a4b40" }}>
              Delete account
            </h4>
            <p style={{ marginTop: 6, fontSize: 13, color: "var(--text-secondary)", maxWidth: "46ch", lineHeight: 1.5 }}>
              Requests permanent removal of your profile and saved data. Active
              bookings cannot be deleted automatically — your agent confirms the
              request first.
            </p>
          </div>
          <DeleteAccount disabled={!data.hasClientAccount} />
        </div>
      </div>
    </div>
  );
}

function DeleteAccount({ disabled }: { disabled: boolean }) {
  const [confirming, setConfirming] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [done, setDone] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  if (done) {
    return (
      <span style={{ fontSize: 12.5, color: "#5a8a60", maxWidth: "30ch", lineHeight: 1.5 }}>
        {done}
      </span>
    );
  }

  if (!confirming) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
        <button
          type="button"
          disabled={disabled}
          onClick={() => setConfirming(true)}
          style={{
            padding: "11px 20px",
            borderRadius: 10,
            border: "1px solid #9a4b40",
            background: "transparent",
            color: "#9a4b40",
            fontSize: 12.5,
            letterSpacing: "0.04em",
            whiteSpace: "nowrap",
            cursor: disabled ? "not-allowed" : "pointer",
            opacity: disabled ? 0.5 : 1,
            fontFamily: "inherit",
          }}
        >
          Delete account
        </button>
        {error ? <span style={{ fontSize: 11.5, color: "#9a4b40" }}>{error}</span> : null}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <span style={{ fontSize: 12.5, color: "#9a4b40" }}>Sure?</span>
      <button
        type="button"
        disabled={pending}
        onClick={async () => {
          setPending(true);
          setError(null);
          const result = await requestAccountDeletion();
          setPending(false);
          if (result.ok) {
            setDone(result.message ?? "Request submitted.");
          } else {
            setError(result.error ?? "Could not submit.");
            setConfirming(false);
          }
        }}
        style={{
          padding: "11px 18px",
          borderRadius: 10,
          border: "none",
          background: "#9a4b40",
          color: "#fff",
          fontSize: 12.5,
          letterSpacing: "0.04em",
          whiteSpace: "nowrap",
          cursor: "pointer",
          fontFamily: "inherit",
          opacity: pending ? 0.7 : 1,
        }}
      >
        {pending ? "Sending…" : "Yes, request"}
      </button>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        style={{
          padding: "11px 16px",
          borderRadius: 10,
          border: "1px solid var(--border-medium)",
          background: "transparent",
          color: "var(--text-secondary)",
          fontSize: 12.5,
          cursor: "pointer",
          fontFamily: "inherit",
        }}
      >
        Cancel
      </button>
    </div>
  );
}

// ---------------- shared bits ----------------

function Field({ label, value, gold }: { label: string; value: string; gold?: boolean }) {
  return (
    <div>
      <div
        style={{
          fontSize: 10.5,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: "var(--text-tertiary)",
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <div
        className="serif tnum"
        style={{
          fontSize: "1.0625rem",
          letterSpacing: "-0.01em",
          color: gold ? "var(--accent)" : "var(--text-primary)",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2
      className="serif"
      style={{
        fontSize: "clamp(1.125rem, 1.8vw, 1.375rem)",
        letterSpacing: "-0.015em",
        fontWeight: 400,
        marginBottom: 18,
        color: "var(--text-primary)",
      }}
    >
      {children}
    </h2>
  );
}

function Empty({ label }: { label: string }) {
  return (
    <div style={{ padding: "48px 0", textAlign: "center", fontSize: 14, color: "var(--text-tertiary)" }}>
      {label}
    </div>
  );
}
