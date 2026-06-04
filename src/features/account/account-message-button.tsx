"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { startConversationWithAgent } from "@/features/chat/actions";

interface AccountMessageButtonProps {
  label?: string;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Editorial-кнопка кабинета: создаёт/переиспользует диалог клиента с агентом
 * и открывает его на странице сообщений. При ошибке просто ведёт на список.
 */
export function AccountMessageButton({
  label = "Message your agent",
  className,
  style,
}: AccountMessageButtonProps) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);

  async function handleClick() {
    setPending(true);
    const result = await startConversationWithAgent({});
    setPending(false);
    if (result.ok) {
      router.push(`/portal/messages?c=${result.conversationId}`);
    } else {
      router.push("/portal/messages");
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className={className}
      style={style}
    >
      {pending ? "Opening…" : label}
    </button>
  );
}
