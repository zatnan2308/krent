import Link from "next/link";

import { ChatThread } from "@/features/chat/chat-thread";
import { CONVERSATION_TYPE_LABELS } from "@/features/chat/constants";
import { NewConversationForm } from "@/features/chat/new-conversation-form";
import {
  getConversationView,
  listMyConversations,
} from "@/features/chat/queries";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";

interface RenderChatScreenArgs {
  basePath: string;
  activeConversationId: string | null;
  /** Данные для формы нового диалога; null — сторона клиента. */
  newConversation: {
    portalAccounts: { id: string; label: string }[];
    properties: { id: string; title: string }[];
  } | null;
}

/**
 * Рендерит экран чата: список диалогов + активная лента. Вызывается как
 * функция из async-страниц дашборда и портала.
 */
export async function renderChatScreen({
  basePath,
  activeConversationId,
  newConversation,
}: RenderChatScreenArgs) {
  const conversations = await listMyConversations();
  const active = activeConversationId
    ? await getConversationView(activeConversationId)
    : null;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Messages</h1>
        <p className="text-sm text-muted-foreground">
          {newConversation
            ? "Chat with your portal clients."
            : "Chat with your agent."}
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <div className="space-y-3">
          {newConversation ? (
            <NewConversationForm
              portalAccounts={newConversation.portalAccounts}
              properties={newConversation.properties}
              basePath={basePath}
            />
          ) : null}

          <div className="rounded-lg border">
            {conversations.length > 0 ? (
              <ul className="divide-y">
                {conversations.map((conversation) => (
                  <li key={conversation.id}>
                    <Link
                      href={`${basePath}?c=${conversation.id}`}
                      className={cn(
                        "flex items-center justify-between gap-2 px-3 py-2.5 text-sm transition-colors hover:bg-muted/50",
                        conversation.id === activeConversationId &&
                          "bg-muted",
                      )}
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-medium">
                          {conversation.title}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {CONVERSATION_TYPE_LABELS[conversation.type]}
                        </span>
                      </span>
                      {conversation.hasUnread ? (
                        <span
                          className="h-2 w-2 shrink-0 rounded-full bg-primary"
                          aria-label="Unread"
                        />
                      ) : null}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="p-4 text-sm text-muted-foreground">
                No conversations yet.
              </p>
            )}
          </div>
        </div>

        <div>
          {active ? (
            <ChatThread
              conversationId={active.conversation.id}
              title={active.title}
              messages={active.messages}
            />
          ) : (
            <EmptyState
              title="Select a conversation"
              description="Choose a conversation from the list to view messages."
            />
          )}
        </div>
      </div>
    </div>
  );
}
