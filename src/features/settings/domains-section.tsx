"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import {
  addDomain,
  removeDomain,
  setPrimaryDomain,
  verifyDomain,
} from "@/features/settings/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n/provider";

export interface DomainRow {
  id: string;
  domain: string;
  status: string;
  type: string;
}

interface DomainsSectionProps {
  domains: DomainRow[];
  canManage: boolean;
}

/** Управление доменами организации: добавление, верификация, primary, удаление. */
export function DomainsSection({ domains, canManage }: DomainsSectionProps) {
  const router = useRouter();
  const { dict } = useI18n();
  const t = dict.settingsForm;
  const [value, setValue] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);

  async function run(
    fn: () => Promise<{ ok: boolean; error?: string }>,
  ): Promise<boolean> {
    setPending(true);
    setMsg(null);
    const result = await fn();
    setPending(false);
    if (!result.ok) setMsg(result.error ?? t.somethingWrong);
    router.refresh();
    return result.ok;
  }

  return (
    <div className="space-y-4 rounded-md border p-4">
      <p className="text-xs text-muted-foreground">{t.domainsHint}</p>

      {domains.length > 0 ? (
        <ul className="space-y-1 text-sm">
          {domains.map((domain) => (
            <li
              key={domain.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-2"
            >
              <span>
                <span className="font-medium">{domain.domain}</span>
                <span className="ml-2 text-xs capitalize text-muted-foreground">
                  {domain.type} · {domain.status}
                </span>
              </span>
              {canManage ? (
                <span className="flex flex-wrap gap-1">
                  {domain.status !== "verified" ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={pending}
                      onClick={() => run(() => verifyDomain(domain.id))}
                    >
                      {t.markVerified}
                    </Button>
                  ) : null}
                  {domain.type !== "primary" ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={pending}
                      onClick={() => run(() => setPrimaryDomain(domain.id))}
                    >
                      {t.makePrimary}
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-destructive"
                    disabled={pending}
                    onClick={() => run(() => removeDomain(domain.id))}
                  >
                    {t.remove}
                  </Button>
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">{t.noDomains}</p>
      )}

      {canManage ? (
        <form
          className="flex flex-wrap items-center gap-2"
          onSubmit={async (event) => {
            event.preventDefault();
            if (!value.trim()) return;
            const ok = await run(() => addDomain({ domain: value }));
            if (ok) setValue("");
          }}
        >
          <Input
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder="example.com"
            className="w-64"
          />
          <Button type="submit" size="sm" disabled={pending}>
            {t.addDomain}
          </Button>
          {msg ? (
            <span className="text-xs text-muted-foreground">{msg}</span>
          ) : null}
        </form>
      ) : null}
    </div>
  );
}
