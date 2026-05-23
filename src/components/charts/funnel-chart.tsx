"use client";

import * as React from "react";

interface FunnelRow {
  step: string;
  count: number;
}

export function FunnelChart({ data }: { data: FunnelRow[] }) {
  if (data.length === 0) {
    return <p className="text-xs text-muted-foreground">No data.</p>;
  }
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <ul className="space-y-2">
      {data.map((row) => {
        const widthPct = Math.max(8, Math.round((row.count / max) * 100));
        return (
          <li key={row.step}>
            <div className="flex items-center justify-between gap-2 text-xs">
              <span>{row.step}</span>
              <strong>{row.count}</strong>
            </div>
            <div className="mt-1 h-3 w-full rounded-full bg-muted">
              <div
                className="h-3 rounded-full bg-primary"
                style={{ width: `${widthPct}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
