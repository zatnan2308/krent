"use client";

import * as React from "react";

import type { PropertyChannelLink } from "./queries";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n/provider";

/**
 * Копируемые deep-link для отправки лиду: его ответ в Telegram/Messenger
 * привяжется к этому лиду (вебхуки парсят ref). Дашборд-стиль.
 */
export function ChannelDeepLinks({
  links,
}: {
  links: PropertyChannelLink[];
}) {
  const { dict } = useI18n();
  const t = dict.messaging;
  const [copied, setCopied] = React.useState<string | null>(null);

  if (links.length === 0) {
    return null;
  }

  async function copy(url: string, channel: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(channel);
      window.setTimeout(
        () => setCopied((current) => (current === channel ? null : current)),
        1500,
      );
    } catch {
      // clipboard недоступен — ссылку можно скопировать вручную
    }
  }

  return (
    <ul className="space-y-2 text-sm">
      {links.map((link) => (
        <li
          key={link.channel}
          className="flex items-center justify-between gap-2"
        >
          <span>{link.label}</span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => copy(link.url, link.channel)}
          >
            {copied === link.channel ? t.copied : t.copyLink}
          </Button>
        </li>
      ))}
    </ul>
  );
}
