"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { moveDeal } from "@/features/crm/actions";
import type { DealListItem } from "@/features/crm/queries";
import type { DealStage } from "@/features/crm/types";
import { EmptyState } from "@/components/ui/empty-state";
import { ROUTES } from "@/lib/constants/routes";
import {
  DEFAULT_CURRENCY,
  isCurrencyCode,
} from "@/lib/currency/config";
import { formatCurrency } from "@/lib/currency/format";
import { useI18n } from "@/lib/i18n/provider";

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

/**
 * Воронка сделок: колонки по стадиям. Перенос — drag-and-drop (нативный HTML5)
 * с резервным `<select>` для клавиатуры/мобильных.
 */
export function DealBoard({ stages, deals, canManage }: DealBoardProps) {
  const router = useRouter();
  const { dict } = useI18n();
  const t = dict.dashCrm;
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [draggingId, setDraggingId] = React.useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = React.useState<string | null>(null);

  async function handleMove(dealId: string, stageId: string) {
    setPending(true);
    setError(null);
    const result = await moveDeal(dealId, stageId);
    setPending(false);
    if (result.ok) {
      router.refresh();
    } else {
      // Перенос не прошёл — показываем причину; select откатится на refresh.
      setError(result.error);
      router.refresh();
    }
  }

  function handleDrop(stageId: string) {
    const dealId = draggingId;
    setDraggingId(null);
    setDragOverStage(null);
    if (!dealId) return;
    const deal = deals.find((item) => item.id === dealId);
    if (deal && deal.stageId !== stageId) {
      void handleMove(dealId, stageId);
    }
  }

  if (deals.length === 0) {
    return (
      <EmptyState
        title={t.noDealsTitle}
        description={t.noDealsDesc}
      />
    );
  }

  return (
    <div className="space-y-2">
      {error ? (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {error}
        </p>
      ) : null}
      <div className="flex gap-4 overflow-x-auto pb-2">
        {stages.map((stage) => {
        const stageDeals = deals.filter((deal) => deal.stageId === stage.id);
        const isDropTarget = canManage && dragOverStage === stage.id;
        return (
          <div
            key={stage.id}
            className={`w-72 shrink-0 space-y-3 rounded-lg border p-3 transition-colors ${
              isDropTarget
                ? "border-primary bg-primary/5"
                : "bg-muted/30"
            }`}
            onDragOver={
              canManage
                ? (event) => {
                    event.preventDefault();
                    event.dataTransfer.dropEffect = "move";
                    if (dragOverStage !== stage.id) {
                      setDragOverStage(stage.id);
                    }
                  }
                : undefined
            }
            onDragLeave={
              canManage
                ? (event) => {
                    // Сброс подсветки только при выходе за пределы колонки.
                    if (
                      !event.currentTarget.contains(
                        event.relatedTarget as Node | null,
                      )
                    ) {
                      setDragOverStage((current) =>
                        current === stage.id ? null : current,
                      );
                    }
                  }
                : undefined
            }
            onDrop={canManage ? () => handleDrop(stage.id) : undefined}
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
                  draggable={canManage && !pending}
                  onDragStart={
                    canManage
                      ? (event) => {
                          setDraggingId(deal.id);
                          event.dataTransfer.effectAllowed = "move";
                          event.dataTransfer.setData("text/plain", deal.id);
                        }
                      : undefined
                  }
                  onDragEnd={
                    canManage
                      ? () => {
                          setDraggingId(null);
                          setDragOverStage(null);
                        }
                      : undefined
                  }
                  className={`space-y-2 rounded-md border bg-background p-3 ${
                    canManage ? "cursor-grab active:cursor-grabbing" : ""
                  } ${draggingId === deal.id ? "opacity-50" : ""}`}
                >
                  <Link
                    href={`${ROUTES.dashboard.crm}/deals/${deal.id}`}
                    className="block text-sm font-medium hover:underline"
                  >
                    {deal.title}
                  </Link>
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
                      aria-label={t.moveDealAria}
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
              <p className="text-xs text-muted-foreground">{t.noDealsCol}</p>
            ) : null}
          </div>
        );
        })}
      </div>
    </div>
  );
}
