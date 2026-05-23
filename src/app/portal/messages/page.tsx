import type { Metadata } from "next";

import { renderChatScreen } from "@/features/chat/chat-screen";
import { ROUTES } from "@/lib/constants/routes";

export const metadata: Metadata = {
  title: "Messages",
};

export default async function PortalMessagesPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  return renderChatScreen({
    basePath: ROUTES.portal.messages,
    activeConversationId:
      typeof searchParams.c === "string" ? searchParams.c : null,
    newConversation: null,
  });
}
