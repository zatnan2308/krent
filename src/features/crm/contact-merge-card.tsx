"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import {
  mergeContact,
  searchContactsForMerge,
  type MergeTargetOption,
} from "@/features/crm/actions";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/constants/routes";
import { useI18n } from "@/lib/i18n/provider";

/**
 * Слияние дубликата контакта в другой: ищем цель, подтверждаем, мержим.
 * Текущий контакт — secondary (удаляется), выбранный — primary (остаётся).
 */
export function ContactMergeCard({
  contactId,
  contactName,
}: {
  contactId: string;
  contactName: string;
}) {
  const router = useRouter();
  const { dict } = useI18n();
  const t = dict.dashCrm;
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<MergeTargetOption[]>([]);
  const [selected, setSelected] = React.useState<MergeTargetOption | null>(null);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (selected) {
      return;
    }
    const term = query.trim();
    if (term.length < 2) {
      setResults([]);
      return;
    }
    let active = true;
    const timer = window.setTimeout(() => {
      void searchContactsForMerge({ query: term, excludeId: contactId }).then(
        (found) => {
          if (active) {
            setResults(found);
          }
        },
      );
    }, 300);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [query, contactId, selected]);

  async function handleMerge() {
    if (!selected) {
      return;
    }
    setPending(true);
    setError(null);
    const result = await mergeContact({
      primaryId: selected.id,
      secondaryId: contactId,
    });
    if (result.ok) {
      router.push(`${ROUTES.dashboard.crmContacts}/${selected.id}`);
    } else {
      setPending(false);
      setError(result.error);
    }
  }

  if (selected) {
    return (
      <div className="space-y-3 text-sm">
        <p>
          {t.mergeQuestion
            .replace(/\{a\}/g, contactName)
            .replace(/\{b\}/g, selected.name)}
        </p>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="destructive"
            disabled={pending}
            onClick={handleMerge}
          >
            {pending ? t.merging : t.mergeAndDelete}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={pending}
            onClick={() => {
              setSelected(null);
              setError(null);
            }}
          >
            {t.cancel}
          </Button>
        </div>
        {error ? (
          <p className="text-xs text-destructive" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-2 text-sm">
      <p className="text-muted-foreground">{t.mergeIntro}</p>
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={t.mergeSearchPh}
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      {results.length > 0 ? (
        <ul className="divide-y rounded-md border">
          {results.map((row) => (
            <li
              key={row.id}
              className="flex items-center justify-between gap-2 p-2"
            >
              <span className="truncate">
                {row.name}
                {row.detail ? (
                  <span className="text-muted-foreground"> · {row.detail}</span>
                ) : null}
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelected(row)}
              >
                {t.mergeInto}
              </Button>
            </li>
          ))}
        </ul>
      ) : query.trim().length >= 2 ? (
        <p className="text-xs text-muted-foreground">{t.noMatchingContacts}</p>
      ) : null}
    </div>
  );
}
