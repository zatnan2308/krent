"use client";

import * as React from "react";

interface Props {
  /** Цена объекта в его валюте. */
  price: number;
  currency: string;
  locale: string;
}

function useMoney(currency: string, locale: string) {
  return React.useCallback(
    (n: number) => {
      try {
        return new Intl.NumberFormat(locale, {
          style: "currency",
          currency,
          maximumFractionDigits: 0,
        }).format(Math.round(n));
      } catch {
        return `${Math.round(n).toLocaleString("en-US")} ${currency}`;
      }
    },
    [currency, locale],
  );
}

/** Ипотечный калькулятор (клиент): первый взнос, срок, ставка → платёж.
 *  Индикативный расчёт от цены объекта; в БД ничего не пишет. */
export function MortgageCalculator({ price, currency, locale }: Props) {
  const [downPct, setDownPct] = React.useState(25);
  const [years, setYears] = React.useState(25);
  const [rate, setRate] = React.useState(4.5);
  const money = useMoney(currency, locale);

  const down = price * (downPct / 100);
  const loan = price - down;
  const r = rate / 100 / 12;
  const n = years * 12;
  const monthly = r > 0 ? (loan * r) / (1 - Math.pow(1 + r, -n)) : loan / n;

  return (
    <div
      className="ed-mort"
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "clamp(28px, 4vw, 56px)",
        alignItems: "center",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
        <Slider
          label="Down payment"
          value={downPct}
          min={20}
          max={80}
          step={5}
          suffix="%"
          onChange={setDownPct}
          note={money(down)}
        />
        <Slider
          label="Loan term"
          value={years}
          min={5}
          max={25}
          step={1}
          suffix=" yrs"
          onChange={setYears}
        />
        <Slider
          label="Interest rate"
          value={rate}
          min={2.5}
          max={7}
          step={0.1}
          suffix="%"
          fixed={1}
          onChange={setRate}
        />
      </div>

      <div
        style={{
          background: "var(--bg-secondary)",
          border: "1px solid var(--border-subtle)",
          padding: "clamp(24px, 3vw, 36px)",
          borderRadius: 14,
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-geist-mono), 'Geist Mono', monospace",
            fontSize: 10.5,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: "var(--text-tertiary)",
          }}
        >
          Estimated monthly
        </div>
        <div
          className="serif tnum"
          style={{
            fontSize: "clamp(2.25rem, 4.5vw, 3.25rem)",
            letterSpacing: "-0.03em",
            color: "var(--accent)",
            lineHeight: 1,
            marginTop: 10,
          }}
        >
          {money(monthly)}
        </div>
        <div
          style={{
            marginTop: 24,
            display: "flex",
            flexDirection: "column",
            gap: 12,
            fontSize: 13.5,
          }}
        >
          <MRow label="Loan amount" val={money(loan)} />
          <MRow label="Down payment" val={`${money(down)} · ${downPct}%`} />
          <MRow label="Total interest" val={money(monthly * n - loan)} />
          <MRow label="Total repayable" val={money(monthly * n)} />
        </div>
        <p
          style={{
            marginTop: 20,
            fontSize: 11,
            color: "var(--text-tertiary)",
            lineHeight: 1.5,
          }}
        >
          Indicative only. I introduce you to a whole-of-market mortgage broker —
          non-resident financing up to 50% LTV.
        </p>
      </div>

      <style>{`
        .ed-mort .ed-mort-range {
          -webkit-appearance: none; appearance: none; width: 100%; height: 4px;
          border-radius: 4px; outline: none; cursor: pointer;
        }
        .ed-mort .ed-mort-range::-webkit-slider-thumb {
          -webkit-appearance: none; appearance: none; width: 18px; height: 18px;
          border-radius: 50%; background: var(--bg-elevated);
          border: 1.5px solid var(--accent); cursor: grab;
          box-shadow: 0 2px 6px rgba(11,11,12,0.18);
        }
        .ed-mort .ed-mort-range::-moz-range-thumb {
          width: 18px; height: 18px; border-radius: 50%; background: var(--bg-elevated);
          border: 1.5px solid var(--accent); cursor: grab;
          box-shadow: 0 2px 6px rgba(11,11,12,0.18);
        }
        @media (max-width: 680px) {
          .ed-mort { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  suffix,
  onChange,
  note,
  fixed = 0,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix: string;
  onChange: (value: number) => void;
  note?: string;
  fixed?: number;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: 12,
        }}
      >
        <span
          style={{
            fontSize: 11,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: "var(--text-tertiary)",
          }}
        >
          {label}
        </span>
        <span
          className="serif tnum"
          style={{ fontSize: "1.25rem", color: "var(--text-primary)", letterSpacing: "-0.01em" }}
        >
          {value.toFixed(fixed)}
          {suffix}
          {note ? (
            <span style={{ fontSize: 12, color: "var(--text-tertiary)", marginLeft: 8 }}>
              {note}
            </span>
          ) : null}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="ed-mort-range"
        style={{
          background: `linear-gradient(to right, var(--accent) ${pct}%, var(--border-medium) ${pct}%)`,
        }}
      />
    </div>
  );
}

function MRow({ label, val }: { label: string; val: string }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        paddingBottom: 10,
        borderBottom: "1px solid var(--border-subtle)",
      }}
    >
      <span style={{ color: "var(--text-secondary)" }}>{label}</span>
      <span className="tnum" style={{ color: "var(--text-primary)" }}>
        {val}
      </span>
    </div>
  );
}
