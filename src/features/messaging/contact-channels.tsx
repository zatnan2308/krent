import Link from "next/link";

import type { ContactChannelLink } from "./queries";
import { buttonVariants } from "@/components/ui/button";
import { ROUTES } from "@/lib/constants/routes";

/** Каналы контакта: открыть чат (если достижим) или пригласить (deep link). */
export function ContactChannels({
  channels,
}: {
  channels: ContactChannelLink[];
}) {
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
              Open chat
            </Link>
          ) : channel.inviteUrl ? (
            <a
              href={channel.inviteUrl}
              target="_blank"
              rel="noreferrer"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              {channel.channel === "whatsapp_cloud" ? "Message" : "Invite link"}
            </a>
          ) : (
            <span className="text-xs text-muted-foreground">Not reachable</span>
          )}
        </li>
      ))}
    </ul>
  );
}
