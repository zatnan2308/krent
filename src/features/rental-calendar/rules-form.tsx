"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

import {
  deletePriceRule,
  saveAvailabilityRule,
  savePriceRule,
} from "@/features/rental-calendar/actions";
import { formatDateDisplay } from "@/features/rental-calendar/date-utils";
import type {
  RentalAvailabilityRule,
  RentalPriceRule,
} from "@/features/rental-calendar/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const DAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function toInt(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === "") {
    return null;
  }
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : null;
}

function toNum(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === "") {
    return null;
  }
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

interface RulesFormProps {
  propertyId: string;
  availabilityRule: RentalAvailabilityRule | null;
  priceRules: RentalPriceRule[];
}

/** Правила доступности и таблица правил цен календаря. */
export function RulesForm({
  propertyId,
  availabilityRule,
  priceRules,
}: RulesFormProps) {
  const router = useRouter();
  const [minStay, setMinStay] = React.useState(
    String(availabilityRule?.min_stay ?? 1),
  );
  const [maxStay, setMaxStay] = React.useState(
    availabilityRule?.max_stay != null
      ? String(availabilityRule.max_stay)
      : "",
  );
  const [checkInDays, setCheckInDays] = React.useState<Set<number>>(
    () => new Set(availabilityRule?.check_in_days ?? [0, 1, 2, 3, 4, 5, 6]),
  );
  const [checkOutDays, setCheckOutDays] = React.useState<Set<number>>(
    () => new Set(availabilityRule?.check_out_days ?? [0, 1, 2, 3, 4, 5, 6]),
  );
  const [bufferDays, setBufferDays] = React.useState(
    String(availabilityRule?.buffer_days ?? 0),
  );
  const [defaultPrice, setDefaultPrice] = React.useState(
    availabilityRule?.default_price != null
      ? String(availabilityRule.default_price)
      : "",
  );
  const [weekendPrice, setWeekendPrice] = React.useState(
    availabilityRule?.weekend_price != null
      ? String(availabilityRule.weekend_price)
      : "",
  );
  const [currency, setCurrency] = React.useState(
    availabilityRule?.currency ?? "",
  );
  const [rulePending, setRulePending] = React.useState(false);
  const [ruleMessage, setRuleMessage] = React.useState<string | null>(null);

  const [priceStart, setPriceStart] = React.useState("");
  const [priceEnd, setPriceEnd] = React.useState("");
  const [priceValue, setPriceValue] = React.useState("");
  const [priceCurrency, setPriceCurrency] = React.useState("");
  const [priceMinStay, setPriceMinStay] = React.useState("");
  const [pricePending, setPricePending] = React.useState(false);
  const [priceError, setPriceError] = React.useState<string | null>(null);

  function toggleDay(
    setter: React.Dispatch<React.SetStateAction<Set<number>>>,
    day: number,
  ) {
    setter((prev) => {
      const next = new Set(prev);
      if (next.has(day)) {
        next.delete(day);
      } else {
        next.add(day);
      }
      return next;
    });
  }

  async function handleSaveRule() {
    setRulePending(true);
    setRuleMessage(null);
    const result = await saveAvailabilityRule({
      propertyId,
      minStay: toInt(minStay) ?? 1,
      maxStay: toInt(maxStay),
      checkInDays: [...checkInDays],
      checkOutDays: [...checkOutDays],
      bufferDays: toInt(bufferDays) ?? 0,
      defaultPrice: toNum(defaultPrice),
      weekendPrice: toNum(weekendPrice),
      currency: currency.trim() || null,
    });
    setRulePending(false);
    if (result.ok) {
      setRuleMessage("Availability rules saved.");
      router.refresh();
    } else {
      setRuleMessage(result.error);
    }
  }

  async function handleAddPrice() {
    setPricePending(true);
    setPriceError(null);
    const result = await savePriceRule({
      propertyId,
      startDate: priceStart,
      endDate: priceEnd,
      price: toNum(priceValue) ?? 0,
      currency: priceCurrency.trim(),
      minStay: toInt(priceMinStay),
    });
    setPricePending(false);
    if (result.ok) {
      setPriceStart("");
      setPriceEnd("");
      setPriceValue("");
      setPriceCurrency("");
      setPriceMinStay("");
      router.refresh();
    } else {
      setPriceError(result.error);
    }
  }

  async function handleDeletePrice(ruleId: string) {
    setPricePending(true);
    await deletePriceRule(ruleId);
    setPricePending(false);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <label htmlFor="min-stay" className="text-sm font-medium">
              Minimum stay (nights)
            </label>
            <Input
              id="min-stay"
              type="number"
              min={1}
              value={minStay}
              onChange={(event) => setMinStay(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="max-stay" className="text-sm font-medium">
              Maximum stay (nights)
            </label>
            <Input
              id="max-stay"
              type="number"
              min={1}
              value={maxStay}
              onChange={(event) => setMaxStay(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="buffer-days" className="text-sm font-medium">
              Buffer days
            </label>
            <Input
              id="buffer-days"
              type="number"
              min={0}
              value={bufferDays}
              onChange={(event) => setBufferDays(event.target.value)}
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <span className="text-sm font-medium">Check-in days</span>
            <div className="flex flex-wrap gap-1.5">
              {DAY_LABELS.map((label, day) => (
                <label
                  key={`in-${day}`}
                  className="flex items-center gap-1 text-xs"
                >
                  <input
                    type="checkbox"
                    className="h-3.5 w-3.5 rounded border-input"
                    checked={checkInDays.has(day)}
                    onChange={() => toggleDay(setCheckInDays, day)}
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <span className="text-sm font-medium">Check-out days</span>
            <div className="flex flex-wrap gap-1.5">
              {DAY_LABELS.map((label, day) => (
                <label
                  key={`out-${day}`}
                  className="flex items-center gap-1 text-xs"
                >
                  <input
                    type="checkbox"
                    className="h-3.5 w-3.5 rounded border-input"
                    checked={checkOutDays.has(day)}
                    onChange={() => toggleDay(setCheckOutDays, day)}
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <label htmlFor="default-price" className="text-sm font-medium">
              Default nightly price
            </label>
            <Input
              id="default-price"
              type="number"
              min={0}
              step="any"
              value={defaultPrice}
              onChange={(event) => setDefaultPrice(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="weekend-price" className="text-sm font-medium">
              Weekend price
            </label>
            <Input
              id="weekend-price"
              type="number"
              min={0}
              step="any"
              value={weekendPrice}
              onChange={(event) => setWeekendPrice(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="rule-currency" className="text-sm font-medium">
              Currency
            </label>
            <Input
              id="rule-currency"
              value={currency}
              placeholder="USD"
              onChange={(event) => setCurrency(event.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button type="button" disabled={rulePending} onClick={handleSaveRule}>
            Save rules
          </Button>
          {ruleMessage ? (
            <p className="text-sm text-muted-foreground">{ruleMessage}</p>
          ) : null}
        </div>
      </div>

      <div className="space-y-3 border-t pt-4">
        <p className="text-sm font-medium">Seasonal price rules</p>
        {priceRules.length > 0 ? (
          <ul className="divide-y rounded-md border">
            {priceRules.map((rule) => (
              <li
                key={rule.id}
                className="flex items-center justify-between gap-3 p-3 text-sm"
              >
                <div>
                  <p className="font-medium">
                    {rule.price} {rule.currency}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDateDisplay(rule.start_date)} &rarr;{" "}
                    {formatDateDisplay(rule.end_date)}
                    {rule.min_stay
                      ? ` · min ${rule.min_stay} nights`
                      : ""}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 text-destructive"
                  disabled={pricePending}
                  aria-label="Delete price rule"
                  onClick={() => handleDeletePrice(rule.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No price rules yet.</p>
        )}

        <div className="grid gap-2 rounded-md border p-3 sm:grid-cols-5">
          <Input
            type="date"
            value={priceStart}
            aria-label="Price start date"
            onChange={(event) => setPriceStart(event.target.value)}
          />
          <Input
            type="date"
            value={priceEnd}
            aria-label="Price end date"
            onChange={(event) => setPriceEnd(event.target.value)}
          />
          <Input
            type="number"
            min={0}
            step="any"
            value={priceValue}
            placeholder="Price"
            aria-label="Price"
            onChange={(event) => setPriceValue(event.target.value)}
          />
          <Input
            value={priceCurrency}
            placeholder="USD"
            aria-label="Price currency"
            onChange={(event) => setPriceCurrency(event.target.value)}
          />
          <Input
            type="number"
            min={1}
            value={priceMinStay}
            placeholder="Min stay"
            aria-label="Minimum stay override"
            onChange={(event) => setPriceMinStay(event.target.value)}
          />
        </div>
        {priceError ? (
          <p className="text-sm text-destructive" role="alert">
            {priceError}
          </p>
        ) : null}
        <Button
          type="button"
          size="sm"
          disabled={pricePending}
          onClick={handleAddPrice}
        >
          Add price rule
        </Button>
      </div>
    </div>
  );
}
