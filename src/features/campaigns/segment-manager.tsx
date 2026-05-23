"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import {
  createSegment,
  deleteSegment,
  refreshSegment,
} from "@/features/campaigns/actions";
import {
  SEGMENT_CHANNELS,
  SEGMENT_RULES,
  type SegmentRule,
} from "@/features/campaigns/constants";
import type { SegmentListItem } from "@/features/campaigns/queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const FIELD_CLASS =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const RULE_HINTS: Record<SegmentRule, string> = {
  all: "",
  lead_type: "e.g. buyer, seller, renter, guest, investor",
  channel: "",
  language: "e.g. en, fr, es",
  currency: "e.g. USD, EUR, AED",
  city: "City name from lead interest",
  property_type: "e.g. apartment, villa, house",
};

/** Конструктор и список сегментов контактов. */
export function SegmentManager({
  segments,
}: {
  segments: SegmentListItem[];
}) {
  const router = useRouter();
  const [name, setName] = React.useState("");
  const [rule, setRule] = React.useState<SegmentRule>("lead_type");
  const [value, setValue] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleCreate() {
    if (!name.trim()) {
      setError("Enter a segment name.");
      return;
    }
    setPending(true);
    setError(null);
    const result = await createSegment({
      name: name.trim(),
      description: null,
      rule,
      value: rule === "all" ? "" : value.trim(),
    });
    setPending(false);
    if (result.ok) {
      setName("");
      setValue("");
      router.refresh();
    } else {
      setError(result.error);
    }
  }

  async function handleRefresh(id: string) {
    setPending(true);
    setError(null);
    const result = await refreshSegment(id);
    setPending(false);
    if (result.ok) {
      router.refresh();
    } else {
      setError(result.error);
    }
  }

  async function handleDelete(id: string) {
    setPending(true);
    setError(null);
    const result = await deleteSegment(id);
    setPending(false);
    if (result.ok) {
      router.refresh();
    } else {
      setError(result.error);
    }
  }

  return (
    <div className="space-y-5">
      <div className="space-y-3 rounded-lg border p-4">
        <p className="text-sm font-medium">Create a segment</p>
        <div className="grid gap-2 sm:grid-cols-3">
          <Input
            value={name}
            placeholder="Segment name"
            aria-label="Segment name"
            onChange={(event) => setName(event.target.value)}
          />
          <select
            className={FIELD_CLASS}
            value={rule}
            aria-label="Segment rule"
            onChange={(event) => {
              setRule(event.target.value as SegmentRule);
              setValue("");
            }}
          >
            {SEGMENT_RULES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {rule === "all" ? (
            <div className="flex items-center text-sm text-muted-foreground">
              Every contact
            </div>
          ) : rule === "channel" ? (
            <select
              className={FIELD_CLASS}
              value={value}
              aria-label="Channel"
              onChange={(event) => setValue(event.target.value)}
            >
              <option value="">Select channel</option>
              {SEGMENT_CHANNELS.map((channel) => (
                <option key={channel.value} value={channel.value}>
                  {channel.label}
                </option>
              ))}
            </select>
          ) : (
            <Input
              value={value}
              placeholder={RULE_HINTS[rule]}
              aria-label="Segment value"
              onChange={(event) => setValue(event.target.value)}
            />
          )}
        </div>
        <Button type="button" size="sm" disabled={pending} onClick={handleCreate}>
          Create segment
        </Button>
        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
      </div>

      <ul className="divide-y rounded-lg border">
        {segments.map((segment) => (
          <li
            key={segment.id}
            className="flex flex-wrap items-center justify-between gap-3 p-3"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium">
                {segment.name}
                {segment.isSystem ? (
                  <span className="ml-2 text-xs text-muted-foreground">
                    System
                  </span>
                ) : null}
              </p>
              <p className="text-xs text-muted-foreground">
                {segment.memberCount} contact(s) · rule: {segment.rule}
                {segment.value ? ` = ${segment.value}` : ""}
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={pending}
                onClick={() => handleRefresh(segment.id)}
              >
                Refresh
              </Button>
              {!segment.isSystem ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-destructive"
                  disabled={pending}
                  onClick={() => handleDelete(segment.id)}
                >
                  Delete
                </Button>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
