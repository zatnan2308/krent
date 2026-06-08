import Link from "next/link";

import { ChatThread } from "@/features/chat/chat-thread";
import { CONVERSATION_TYPE_LABELS } from "@/features/chat/constants";
import { NewConversationForm } from "@/features/chat/new-conversation-form";
import { NewInternalChatForm } from "@/features/chat/new-internal-chat-form";
import {
  getConversationView,
  listMyConversations,
} from "@/features/chat/queries";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { getServerDictionary } from "@/lib/i18n/runtime";
import { cn } from "@/lib/utils";

import { CHANNEL_LABELS } from "./channels";
import { MessagingThread } from "./messaging-thread";
import {
  getChannelConversationView,
  listChannelConversations,
} from "./queries";
import type { MessagingChannel } from "./types";

type Filter = "all" | "portal" | MessagingChannel;

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "portal", label: "Portal" },
  { key: "whatsapp_cloud", label: "WhatsApp" },
  { key: "telegram", label: "Telegram" },
  { key: "messenger", label: "Messenger" },
];

interface UnifiedItem {
  href: string;
  badge: string;
  title: string;
  preview: string | null;
  at: string | null;
  unread: boolean;
  active: boolean;
}

interface RenderInboxArgs {
  basePath: string;
  organizationId: string;
  userId: string;
  activePortalId: string | null;
  activeChannelId: string | null;
  filter: Filter;
  portalAccounts: { id: string; label: string }[];
  properties: { id: string; title: string }[];
  orgMembers: { id: string; name: string }[];
}

/** Единый channel-aware инбокс: портальные чаты + WhatsApp/Telegram/Messenger. */
export async function renderInbox(args: RenderInboxArgs) {
  const dict = await getServerDictionary();
  const t = dict.messaging;
  const [portalConvs, channelConvs] = await Promise.all([
    listMyConversations(),
    listChannelConversations(args.organizationId, args.userId),
  ]);

  const buildHref = (params: {
    filter?: Filter;
    c?: string;
    m?: string;
  }): string => {
    const sp = new URLSearchParams();
    const f = params.filter ?? args.filter;
    if (f !== "all") sp.set("filter", f);
    if (params.c) sp.set("c", params.c);
    if (params.m) sp.set("m", params.m);
    const qs = sp.toString();
    return qs ? `${args.basePath}?${qs}` : args.basePath;
  };

  const portalItems: UnifiedItem[] = portalConvs.map((conv) => ({
    href: buildHref({ c: conv.id }),
    badge: conv.type === "internal" ? t.team : t.portal,
    title: conv.title,
    preview: conv.lastMessage ?? CONVERSATION_TYPE_LABELS[conv.type],
    at: conv.lastMessageAt,
    unread: conv.hasUnread,
    active: args.activePortalId === conv.id,
  }));
  const channelItems: UnifiedItem[] = channelConvs.map((conv) => ({
    href: buildHref({ m: conv.id }),
    badge: CHANNEL_LABELS[conv.channel],
    title: conv.title,
    preview: conv.lastMessage,
    at: conv.lastMessageAt,
    unread: conv.unread,
    active: args.activeChannelId === conv.id,
  }));

  let items = [...portalItems, ...channelItems];
  if (args.filter === "portal") {
    items = portalItems;
  } else if (args.filter !== "all") {
    items = channelConvs
      .filter((c) => c.channel === args.filter)
      .map((conv) => ({
        href: buildHref({ m: conv.id }),
        badge: CHANNEL_LABELS[conv.channel],
        title: conv.title,
        preview: conv.lastMessage,
        at: conv.lastMessageAt,
        unread: conv.unread,
        active: args.activeChannelId === conv.id,
      }));
  }
  items.sort((a, b) => (b.at ?? "").localeCompare(a.at ?? ""));

  const channelView = args.activeChannelId
    ? await getChannelConversationView(
        args.organizationId,
        args.activeChannelId,
      )
    : null;
  const portalView =
    !channelView && args.activePortalId
      ? await getConversationView(args.activePortalId)
      : null;

  return (
    <div className="flex h-[calc(100vh-12rem)] overflow-hidden rounded-lg border bg-card">
      <div className="flex w-80 shrink-0 flex-col border-r">
        <div className="space-y-2 border-b p-3">
          <div className="flex flex-wrap gap-1">
            {FILTERS.map((f) => (
              <Link
                key={f.key}
                href={buildHref({ filter: f.key })}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-xs",
                  args.filter === f.key
                    ? "border-primary bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted",
                )}
              >
                {f.key === "all"
                  ? t.filterAll
                  : f.key === "portal"
                    ? t.portal
                    : f.label}
              </Link>
            ))}
          </div>
          <NewConversationForm
            portalAccounts={args.portalAccounts}
            properties={args.properties}
            basePath={args.basePath}
          />
          <NewInternalChatForm
            members={args.orgMembers}
            basePath={args.basePath}
          />
        </div>
        <ul className="flex-1 divide-y overflow-y-auto">
          {items.length === 0 ? (
            <li className="p-4 text-sm text-muted-foreground">
              {t.noConversations}
            </li>
          ) : (
            items.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-start justify-between gap-2 px-3 py-2.5 transition-colors hover:bg-muted/50",
                    item.active && "bg-muted",
                  )}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">
                      {item.title}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {item.preview ?? ""}
                    </span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-1">
                    <Badge variant="outline" className="text-[10px]">
                      {item.badge}
                    </Badge>
                    {item.unread ? (
                      <span className="h-2 w-2 rounded-full bg-primary" />
                    ) : null}
                  </span>
                </Link>
              </li>
            ))
          )}
        </ul>
      </div>
      <div className="flex-1">
        {channelView ? (
          <MessagingThread view={channelView} properties={args.properties} />
        ) : portalView ? (
          <ChatThread
            conversationId={portalView.conversation.id}
            title={portalView.title}
            messages={portalView.messages}
          />
        ) : (
          <div className="flex h-full items-center justify-center p-6">
            <EmptyState
              title={t.selectConversation}
              description={t.selectConversationDesc}
            />
          </div>
        )}
      </div>
    </div>
  );
}
