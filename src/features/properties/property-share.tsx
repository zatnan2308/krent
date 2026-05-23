"use client";

import * as React from "react";
import { Copy, MessageCircle, Send, Share2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dropdown,
  DropdownContent,
  DropdownItem,
  DropdownTrigger,
} from "@/components/ui/dropdown";

export function PropertyShare({
  url,
  title,
}: {
  url: string;
  title: string;
}) {
  const [copied, setCopied] = React.useState(false);
  const text = encodeURIComponent(`${title} — ${url}`);
  const encodedUrl = encodeURIComponent(url);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  }

  return (
    <Dropdown>
      <DropdownTrigger asChild>
        <Button variant="outline" size="sm">
          <Share2 className="mr-1.5 h-4 w-4" /> Share
        </Button>
      </DropdownTrigger>
      <DropdownContent align="end" className="w-56">
        <DropdownItem asChild>
          <a
            href={`https://wa.me/?text=${text}`}
            target="_blank"
            rel="noreferrer"
          >
            <MessageCircle className="mr-2 h-4 w-4" /> WhatsApp
          </a>
        </DropdownItem>
        <DropdownItem asChild>
          <a
            href={`https://t.me/share/url?url=${encodedUrl}&text=${text}`}
            target="_blank"
            rel="noreferrer"
          >
            <Send className="mr-2 h-4 w-4" /> Telegram
          </a>
        </DropdownItem>
        <DropdownItem asChild>
          <a
            href={`mailto:?subject=${encodeURIComponent(title)}&body=${text}`}
          >
            <Send className="mr-2 h-4 w-4" /> Email
          </a>
        </DropdownItem>
        <DropdownItem onSelect={(event) => {
          event.preventDefault();
          void copy();
        }}>
          <Copy className="mr-2 h-4 w-4" /> {copied ? "Copied!" : "Copy link"}
        </DropdownItem>
      </DropdownContent>
    </Dropdown>
  );
}
