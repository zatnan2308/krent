"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";

interface Props {
  baseUrl: string;
  agentId: string;
}

/** Готовый embed-код для агента + кнопка копирования. */
export function WidgetSnippet({ baseUrl, agentId }: Props) {
  const snippet = React.useMemo(() => {
    const trimmed = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
    return [
      `<div data-krent-widget-agent="${agentId}" data-krent-widget-view="list" data-krent-widget-height="900"></div>`,
      `<script src="${trimmed}/api/public/v1/widget.js" async></script>`,
    ].join("\n");
  }, [baseUrl, agentId]);

  async function copyToClipboard() {
    try {
      await navigator.clipboard.writeText(snippet);
    } catch {
      // тихо игнорируем — пользователь может скопировать вручную
    }
  }

  return (
    <div className="space-y-2 rounded-md border p-3 text-sm">
      <pre className="overflow-x-auto whitespace-pre-wrap break-all text-xs">
        {snippet}
      </pre>
      <Button size="sm" type="button" variant="outline" onClick={copyToClipboard}>
        Copy snippet
      </Button>
    </div>
  );
}
