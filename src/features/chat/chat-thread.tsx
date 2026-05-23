"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { FileText, Paperclip, Send } from "lucide-react";

import {
  markConversationRead,
  sendFileMessage,
  sendTextMessage,
} from "@/features/chat/actions";
import { ACCEPTED_MIME, formatFileSize } from "@/features/chat/constants";
import type {
  ChatAttachmentView,
  ChatMessageView,
} from "@/features/chat/queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

function AttachmentView({ attachment }: { attachment: ChatAttachmentView }) {
  if (!attachment.signedUrl) {
    return (
      <p className="mt-1 text-xs opacity-80">
        {attachment.fileName} (unavailable)
      </p>
    );
  }
  if (attachment.fileType === "image") {
    return (
      <a
        href={attachment.signedUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-1 block"
      >
        {/* Подписанный URL ротируется — оптимизация next/image не нужна. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={attachment.signedUrl}
          alt={attachment.fileName}
          className="max-h-48 rounded-md"
        />
      </a>
    );
  }
  if (attachment.fileType === "video") {
    return (
      // eslint-disable-next-line jsx-a11y/media-has-caption
      <video
        src={attachment.signedUrl}
        controls
        className="mt-1 max-h-48 rounded-md"
      />
    );
  }
  return (
    <a
      href={attachment.signedUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-1 flex items-center gap-2 underline"
    >
      <FileText className="h-4 w-4 shrink-0" />
      <span>
        {attachment.fileName} ({formatFileSize(attachment.fileSize)})
      </span>
    </a>
  );
}

function MessageBubble({ message }: { message: ChatMessageView }) {
  if (message.messageType === "system") {
    return (
      <p className="text-center text-xs text-muted-foreground">
        {message.message}
      </p>
    );
  }
  return (
    <div
      className={cn(
        "flex flex-col",
        message.isMine ? "items-end" : "items-start",
      )}
    >
      <div
        className={cn(
          "max-w-[80%] rounded-lg px-3 py-2 text-sm",
          message.isMine
            ? "bg-primary text-primary-foreground"
            : "bg-muted",
        )}
      >
        {!message.isMine ? (
          <p className="mb-1 text-xs font-medium opacity-80">
            {message.senderName}
          </p>
        ) : null}
        {message.message ? (
          <p className="whitespace-pre-line">{message.message}</p>
        ) : null}
        {message.attachment ? (
          <AttachmentView attachment={message.attachment} />
        ) : null}
      </div>
      <span className="mt-0.5 text-[11px] text-muted-foreground">
        {new Date(message.createdAt).toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
        })}
      </span>
    </div>
  );
}

interface ChatThreadProps {
  conversationId: string;
  title: string;
  messages: ChatMessageView[];
}

/** Лента сообщений с Realtime-подпиской и отправкой текста / файлов. */
export function ChatThread({
  conversationId,
  title,
  messages,
}: ChatThreadProps) {
  const router = useRouter();
  const [text, setText] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const bottomRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  React.useEffect(() => {
    void markConversationRead(conversationId);
  }, [conversationId]);

  // Realtime: новое сообщение -> обновляем серверные данные ленты.
  React.useEffect(() => {
    let cleanup = () => {};
    try {
      const supabase = createClient();
      const channel = supabase
        .channel(`chat:${conversationId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "chat_messages",
            filter: `conversation_id=eq.${conversationId}`,
          },
          () => {
            router.refresh();
            void markConversationRead(conversationId);
          },
        )
        .subscribe();
      cleanup = () => {
        void supabase.removeChannel(channel);
      };
    } catch {
      // Realtime недоступен — лента обновляется при отправке сообщений.
    }
    return cleanup;
  }, [conversationId, router]);

  async function handleSendText() {
    const value = text.trim();
    if (!value) {
      return;
    }
    setPending(true);
    setError(null);
    const result = await sendTextMessage({ conversationId, message: value });
    setPending(false);
    if (result.ok) {
      setText("");
      router.refresh();
    } else {
      setError(result.error);
    }
  }

  async function handleSendFile(file: File) {
    setPending(true);
    setError(null);
    const formData = new FormData();
    formData.set("conversationId", conversationId);
    formData.set("file", file);
    const result = await sendFileMessage(formData);
    setPending(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    if (result.ok) {
      router.refresh();
    } else {
      setError(result.error);
    }
  }

  return (
    <div className="flex h-[70vh] flex-col rounded-lg border">
      <div className="border-b px-4 py-3">
        <p className="font-semibold">{title}</p>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length > 0 ? (
          messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))
        ) : (
          <p className="text-center text-sm text-muted-foreground">
            No messages yet. Start the conversation.
          </p>
        )}
        <div ref={bottomRef} />
      </div>

      {error ? (
        <p className="px-4 pb-1 text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex items-center gap-2 border-t p-3">
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_MIME}
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) {
              void handleSendFile(file);
            }
          }}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={pending}
          aria-label="Attach file"
          onClick={() => fileInputRef.current?.click()}
        >
          <Paperclip className="h-5 w-5" />
        </Button>
        <Input
          value={text}
          placeholder="Type a message..."
          disabled={pending}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void handleSendText();
            }
          }}
        />
        <Button
          type="button"
          size="icon"
          disabled={pending}
          aria-label="Send message"
          onClick={handleSendText}
        >
          <Send className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
