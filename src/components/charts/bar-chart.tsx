"use client";

import * as React from "react";

interface BarChartProps {
  data: { label: string; value: number }[];
  height?: number;
  ariaLabel?: string;
}

/**
 * Лёгкий bar chart без зависимостей: чистый SVG с осями и tooltip
 * по hover. Достаточен для большинства dashboard-метрик.
 */
export function BarChart({ data, height = 180, ariaLabel }: BarChartProps) {
  if (data.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">No data for the period.</p>
    );
  }
  const max = Math.max(...data.map((d) => d.value), 1);
  const width = Math.max(data.length * 36, 240);
  const padding = 24;
  const barWidth = (width - padding * 2) / data.length - 6;

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        height={height}
        role="img"
        aria-label={ariaLabel ?? "Bar chart"}
      >
        {data.map((d, i) => {
          const x = padding + i * ((width - padding * 2) / data.length) + 3;
          const h = (d.value / max) * (height - padding - 24);
          const y = height - padding - h;
          return (
            <g key={`${d.label}-${i}`}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={Math.max(h, 1)}
                rx={3}
                className="fill-primary"
              >
                <title>{`${d.label}: ${d.value}`}</title>
              </rect>
              <text
                x={x + barWidth / 2}
                y={height - 8}
                textAnchor="middle"
                className="fill-muted-foreground text-[10px]"
              >
                {d.label.length > 6 ? `${d.label.slice(0, 5)}…` : d.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
