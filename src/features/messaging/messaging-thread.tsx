"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import {
  markChannelConversationRead,
  sendChannelMessage,
} from "@/features/messaging/actions";
import { CHANNEL_LABELS } from "@/features/messaging/channels";
import type { ChannelConversationView } from "@/features/messaging/queries";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export function MessagingThread({ view }: { view: ChannelConversationView }) {
  const router = useRouter();
  const [text, setText] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const bottomRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [view.messages]);

  React.useEffect(() => {
    void markChannelConversationRead(view.id);
  }, [view.id]);

  // Realtime: новое канальное сообщение → обновляем ленту (дебаунс).
  React.useEffect(() => {
    let cleanup = () => {};
    let timer: ReturnType<typeof setTimeout> | null = null;
    try {
      const supabase = createClient();
      const channel = supabase
        .channel(`messaging:${view.id}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "messaging_messages",
            filter: `conversation_id=eq.${view.id}`,
          },
          () => {
            if (timer) clearTimeout(timer);
            timer = setTimeout(() => {
              router.refresh();
              void markChannelConversationRead(view.id);
            }, 300);
          },
        )
        .subscribe();
      cleanup = () => {
        if (timer) clearTimeout(timer);
        void supabase.removeChannel(channel);
      };
    } catch {
      // realtime недоступен — лента обновится при отправке
    }
    return cleanup;
  }, [view.id, router]);

  async function handleSend() {
    const value = text.trim();
    if (!value) {
      return;
    }
    setPending(true);
    setError(null);
    const result = await sendChannelMessage({
      conversationId: view.id,
      text: value,
    });
    setPending(false);
    if (result.ok) {
      setText("");
      router.refresh();
    } else {
      setError(result.error);
    }
  }

  const composerDisabled = view.hasSessionWindow && !view.windowOpen;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-2 border-b p-3">
        <div>
          <p className="text-sm font-semibold">{view.contactName}</p>
          <p className="text-xs text-muted-foreground">
            {CHANNEL_LABELS[view.channel]}
            {view.hasSessionWindow
              ? view.windowOpen
                ? " · Session open"
                : " · Session closed"
              : " · Free messaging"}
          </p>
        </div>
        <Badge variant="secondary">{CHANNEL_LABELS[view.channel]}</Badge>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto p-3">
        {view.messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              "flex",
              message.direction === "outbound"
                ? "justify-end"
                : "justify-start",
            )}
          >
            <div
              className={cn(
                "max-w-[75%] rounded-lg px-3 py-2 text-sm",
                message.direction === "outbound"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted",
              )}
            >
              {message.body ? (
                <p className="whitespace-pre-line">{message.body}</p>
              ) : null}
              {message.attachment ? (
                message.attachment.signedUrl ? (
                  <a
                    href={message.attachment.signedUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs underline"
                  >
                    📎 {message.attachment.fileName}
                  </a>
                ) : (
                  <span className="text-xs">
                    📎 {message.attachment.fileName}
                  </span>
                )
              ) : null}
              <span className="mt-1 block text-[10px] opacity-70">
                {new Date(message.createdAt).toLocaleString("en-US")}
              </span>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="border-t p-3">
        {composerDisabled ? (
          <p className="rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">
            The 24-hour window is closed. An approved template
            {view.channel === "messenger" ? " / message tag" : ""} is required
            to message this contact now.
          </p>
        ) : (
          <div className="flex items-end gap-2">
            <textarea
              value={text}
              rows={2}
              placeholder={`Message on ${CHANNEL_LABELS[view.channel]}…`}
              onChange={(event) => setText(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void handleSend();
                }
              }}
              className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <Button size="sm" disabled={pending || !text.trim()} onClick={handleSend}>
              {pending ? "Sending…" : "Send"}
            </Button>
          </div>
        )}
        {error ? (
          <p className="mt-2 text-xs text-destructive" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
