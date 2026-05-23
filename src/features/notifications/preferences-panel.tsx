"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { saveNotificationPreference } from "@/features/notifications/actions";
import type { EventPreference } from "@/features/notifications/queries";

/** Строка настройки одного события уведомления. */
function PreferenceRow({
  event,
  canManage,
}: {
  event: EventPreference;
  canManage: boolean;
}) {
  const router = useRouter();
  const [enabled, setEnabled] = React.useState(event.enabled);
  const [pending, setPending] = React.useState(false);

  async function toggle(next: boolean) {
    setPending(true);
    const result = await saveNotificationPreference({
      eventType: event.key,
      enabled: next,
    });
    setPending(false);
    if (result.ok) {
      setEnabled(next);
      router.refresh();
    }
  }

  return (
    <li className="flex items-center justify-between gap-3 py-2.5">
      <div className="min-w-0">
        <p className="text-sm font-medium">{event.name}</p>
        {event.description ? (
          <p className="text-xs text-muted-foreground">{event.description}</p>
        ) : null}
      </div>
      {event.isTransactional ? (
        <span className="shrink-0 text-xs text-muted-foreground">
          Always sent
        </span>
      ) : (
        <label className="flex shrink-0 items-center gap-2 text-xs">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-input"
            checked={enabled}
            disabled={!canManage || pending}
            onChange={(changeEvent) => toggle(changeEvent.target.checked)}
          />
          {enabled ? "On" : "Off"}
        </label>
      )}
    </li>
  );
}

/**
 * Панель настроек уведомлений организации. Транзакционные письма
 * отправляются всегда; внутренние уведомления можно включать и
 * выключать на уровне организации.
 */
export function PreferencesPanel({
  events,
  canManage,
}: {
  events: EventPreference[];
  canManage: boolean;
}) {
  return (
    <ul className="divide-y">
      {events.map((event) => (
        <PreferenceRow
          key={event.key}
          event={event}
          canManage={canManage}
        />
      ))}
    </ul>
  );
}
