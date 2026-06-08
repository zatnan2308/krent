import Link from "next/link";

import type { ContactChannelLink } from "./queries";
import { buttonVariants } from "@/components/ui/button";
import { ROUTES } from "@/lib/constants/routes";
import { getServerDictionary } from "@/lib/i18n/runtime";

/** Каналы контакта: открыть чат (если достижим) или пригласить (deep link). */
export async function ContactChannels({
  channels,
}: {
  channels: ContactChannelLink[];
}) {
  const dict = await getServerDictionary();
  const t = dict.messaging;
  return (
    <ul className="space-y-2 text-sm">
      {channels.map((channel) => (
        <li
          key={channel.channel}
          className="flex items-center justify-between gap-2"
        >
          <span>{channel.label}</span>
          {channel.reachable && channel.conversationId ? (
            <Link
              href={`${ROUTES.dashboard.messages}?m=${channel.conversationId}`}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              {t.openChat}
            </Link>
          ) : channel.inviteUrl ? (
            <a
              href={channel.inviteUrl}
              target="_blank"
              rel="noreferrer"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              {channel.channel === "whatsapp_cloud" ? t.message : t.inviteLink}
            </a>
          ) : (
            <span className="text-xs text-muted-foreground">
              {t.notReachable}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}
