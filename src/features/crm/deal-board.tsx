"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { moveDeal } from "@/features/crm/actions";
import type { DealListItem } from "@/features/crm/queries";
import type { DealStage } from "@/features/crm/types";
import { EmptyState } from "@/components/ui/empty-state";
import {
  DEFAULT_CURRENCY,
  isCurrencyCode,
} from "@/lib/currency/config";
import { formatCurrency } from "@/lib/currency/format";

const FIELD_CLASS =
  "flex h-9 w-full rounded-md border border-input bg-background px-2 text-xs ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function dealAmount(deal: DealListItem): string | null {
  if (deal.amount === null) {
    return null;
  }
  const currency =
    deal.currency && isCurrencyCode(deal.currency)
      ? deal.currency
      : DEFAULT_CURRENCY;
  return formatCurrency(deal.amount, currency, "en");
}

interface DealBoardProps {
  stages: DealStage[];
  deals: DealListItem[];
  canManage: boolean;
}

/** Базовая воронка сделок: колонки по стадиям, перенос через select. */
export function DealBoard({ stages, deals, canManage }: DealBoardProps) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);

  async function handleMove(dealId: string, stageId: string) {
    setPending(true);
    await moveDeal(dealId, stageId);
    setPending(false);
    router.refresh();
  }

  if (deals.length === 0) {
    return (
      <EmptyState
        title="No deals yet"
        description="Convert a lead into a deal to start the pipeline."
      />
    );
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-2">
      {stages.map((stage) => {
        const stageDeals = deals.filter((deal) => deal.stageId === stage.id);
        return (
          <div
            key={stage.id}
            className="w-72 shrink-0 space-y-3 rounded-lg border bg-muted/30 p-3"
          >
            <p className="text-sm font-semibold">
              {stage.name}{" "}
              <span className="text-muted-foreground">
                ({stageDeals.length})
              </span>
            </p>
            {stageDeals.map((deal) => {
              const amount = dealAmount(deal);
              return (
                <div
                  key={deal.id}
                  className="space-y-2 rounded-md border bg-background p-3"
                >
                  <p className="text-sm font-medium">{deal.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {deal.contactName}
                  </p>
                  {amount ? (
                    <p className="text-sm font-semibold text-primary">
                      {amount}
                    </p>
                  ) : null}
                  {deal.propertyTitle ? (
                    <p className="text-xs text-muted-foreground">
                      {deal.propertyTitle}
                    </p>
                  ) : null}
                  {canManage ? (
                    <select
                      className={FIELD_CLASS}
                      value={deal.stageId ?? ""}
                      disabled={pending}
                      aria-label="Move deal to stage"
                      onChange={(event) =>
                        handleMove(deal.id, event.target.value)
                      }
                    >
                      {stages.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.name}
                        </option>
                      ))}
                    </select>
                  ) : null}
                </div>
              );
            })}
            {stageDeals.length === 0 ? (
              <p className="text-xs text-muted-foreground">No deals</p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
