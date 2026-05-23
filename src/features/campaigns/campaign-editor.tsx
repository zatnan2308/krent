"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import {
  saveCampaign,
  saveCampaignBlocks,
  scheduleCampaign,
  sendCampaignNow,
  sendTest,
} from "@/features/campaigns/actions";
import {
  renderCampaignEmail,
  type PropertyEmailData,
} from "@/features/campaigns/block-renderer";
import {
  BLOCK_TYPES,
  type BlockType,
  defaultBlockContent,
} from "@/features/campaigns/blocks";
import {
  BLOCK_TYPE_LABELS,
  CAMPAIGN_STATUS_LABELS,
} from "@/features/campaigns/constants";
import type { Campaign } from "@/features/campaigns/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { LOCALES } from "@/lib/i18n";

const FIELD_CLASS =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

interface EditorBlock {
  key: string;
  type: BlockType;
  content: Record<string, unknown>;
}

interface CampaignEditorProps {
  campaign: Campaign;
  initialBlocks: { type: BlockType; content: Record<string, unknown> }[];
  segments: { id: string; name: string }[];
  properties: PropertyEmailData[];
  companyName: string;
}

/** Строковое поле контента блока. */
function fieldStr(content: Record<string, unknown>, key: string): string {
  const value = content[key];
  return typeof value === "string" ? value : "";
}

/** Массив строк из контента блока. */
function fieldList(content: Record<string, unknown>, key: string): string[] {
  const value = content[key];
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

/** Конструктор email-кампании: блоки, превью, отправка. */
export function CampaignEditor({
  campaign,
  initialBlocks,
  segments,
  properties,
  companyName,
}: CampaignEditorProps) {
  const router = useRouter();
  const keyCounter = React.useRef(0);
  const nextKey = React.useCallback(() => {
    keyCounter.current += 1;
    return `block-${keyCounter.current}`;
  }, []);

  const [name, setName] = React.useState(campaign.name);
  const [subject, setSubject] = React.useState(campaign.subject);
  const [previewText, setPreviewText] = React.useState(
    campaign.preview_text,
  );
  const [language, setLanguage] = React.useState(campaign.language);
  const [senderName, setSenderName] = React.useState(campaign.sender_name);
  const [segmentId, setSegmentId] = React.useState(
    campaign.segment_id ?? "",
  );
  const [blocks, setBlocks] = React.useState<EditorBlock[]>(() =>
    initialBlocks.map((block) => ({
      key: `block-${(keyCounter.current += 1)}`,
      type: block.type,
      content: { ...block.content },
    })),
  );

  const [addType, setAddType] = React.useState<BlockType>("text");
  const [previewMode, setPreviewMode] = React.useState<
    "desktop" | "mobile"
  >("desktop");
  const [testEmail, setTestEmail] = React.useState("");
  const [scheduledAt, setScheduledAt] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);

  const previewHtml = React.useMemo(() => {
    const propertyMap: Record<string, PropertyEmailData> = {};
    for (const property of properties) {
      propertyMap[property.id] = property;
    }
    return renderCampaignEmail(
      blocks.map((block) => ({ type: block.type, content: block.content })),
      { companyName, unsubscribeUrl: "#", properties: propertyMap },
    );
  }, [blocks, companyName, properties]);

  function setField(key: string, field: string, value: unknown) {
    setBlocks((current) =>
      current.map((block) =>
        block.key === key
          ? { ...block, content: { ...block.content, [field]: value } }
          : block,
      ),
    );
  }

  function addBlock() {
    setBlocks((current) => [
      ...current,
      {
        key: nextKey(),
        type: addType,
        content: defaultBlockContent(addType),
      },
    ]);
  }

  function removeBlock(key: string) {
    setBlocks((current) => current.filter((block) => block.key !== key));
  }

  function moveBlock(index: number, direction: -1 | 1) {
    setBlocks((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.length) {
        return current;
      }
      const copy = [...current];
      const moved = copy[index];
      const swapped = copy[target];
      if (!moved || !swapped) {
        return current;
      }
      copy[index] = swapped;
      copy[target] = moved;
      return copy;
    });
  }

  function toggleGridProperty(key: string, propertyId: string) {
    setBlocks((current) =>
      current.map((block) => {
        if (block.key !== key) {
          return block;
        }
        const ids = fieldList(block.content, "propertyIds");
        const next = ids.includes(propertyId)
          ? ids.filter((id) => id !== propertyId)
          : [...ids, propertyId];
        return { ...block, content: { ...block.content, propertyIds: next } };
      }),
    );
  }

  async function handleSave() {
    setPending(true);
    setMessage(null);
    const metaResult = await saveCampaign({
      campaignId: campaign.id,
      name: name.trim() || "Untitled campaign",
      subject: subject.trim(),
      previewText: previewText.trim(),
      language,
      senderName: senderName.trim(),
      segmentId: segmentId || null,
    });
    if (!metaResult.ok) {
      setPending(false);
      setMessage(metaResult.error);
      return;
    }
    const blocksResult = await saveCampaignBlocks({
      campaignId: campaign.id,
      blocks: blocks.map((block) => ({
        type: block.type,
        content: block.content,
      })),
    });
    setPending(false);
    if (blocksResult.ok) {
      setMessage("Campaign saved.");
      router.refresh();
    } else {
      setMessage(blocksResult.error);
    }
  }

  async function handleSendTest() {
    if (!testEmail.trim()) {
      setMessage("Enter a test email address.");
      return;
    }
    setPending(true);
    setMessage(null);
    const result = await sendTest({
      campaignId: campaign.id,
      email: testEmail.trim(),
    });
    setPending(false);
    setMessage(result.ok ? "Test email sent." : result.error);
  }

  async function handleSendNow() {
    if (
      !window.confirm(
        "Send this campaign to the selected segment now? Save your changes first.",
      )
    ) {
      return;
    }
    setPending(true);
    setMessage(null);
    const result = await sendCampaignNow(campaign.id);
    setPending(false);
    if (result.ok) {
      setMessage("Campaign sent.");
      router.refresh();
    } else {
      setMessage(result.error);
    }
  }

  async function handleSchedule() {
    if (!scheduledAt) {
      setMessage("Choose a date and time.");
      return;
    }
    setPending(true);
    setMessage(null);
    const result = await scheduleCampaign({
      campaignId: campaign.id,
      scheduledAt,
    });
    setPending(false);
    if (result.ok) {
      setMessage("Campaign scheduled.");
      router.refresh();
    } else {
      setMessage(result.error);
    }
  }

  const alreadySent =
    campaign.status === "sent" || campaign.status === "sending";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Status: {CAMPAIGN_STATUS_LABELS[campaign.status]}
        </p>
        <div className="flex items-center gap-3">
          {message ? (
            <span className="text-sm text-muted-foreground">{message}</span>
          ) : null}
          <Button type="button" disabled={pending} onClick={handleSave}>
            Save campaign
          </Button>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-5">
          <div className="space-y-3 rounded-lg border p-4">
            <p className="text-sm font-medium">Campaign details</p>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Name</label>
              <Input
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Subject</label>
              <Input
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Preview text</label>
              <Input
                value={previewText}
                onChange={(event) => setPreviewText(event.target.value)}
              />
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Language</label>
                <select
                  className={FIELD_CLASS}
                  value={language}
                  onChange={(event) => setLanguage(event.target.value)}
                >
                  {LOCALES.map((locale) => (
                    <option key={locale} value={locale}>
                      {locale}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Sender name</label>
                <Input
                  value={senderName}
                  placeholder={companyName}
                  onChange={(event) => setSenderName(event.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Audience segment</label>
              <select
                className={FIELD_CLASS}
                value={segmentId}
                onChange={(event) => setSegmentId(event.target.value)}
              >
                <option value="">No segment selected</option>
                {segments.map((segment) => (
                  <option key={segment.id} value={segment.id}>
                    {segment.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-3 rounded-lg border p-4">
            <p className="text-sm font-medium">Email content</p>
            {blocks.map((block, index) => (
              <div key={block.key} className="space-y-2 rounded-md border p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold">
                    {BLOCK_TYPE_LABELS[block.type]}
                  </span>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      className="rounded border px-1.5 text-xs"
                      aria-label="Move up"
                      onClick={() => moveBlock(index, -1)}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className="rounded border px-1.5 text-xs"
                      aria-label="Move down"
                      onClick={() => moveBlock(index, 1)}
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      className="rounded border px-1.5 text-xs text-destructive"
                      aria-label="Remove block"
                      onClick={() => removeBlock(block.key)}
                    >
                      ✕
                    </button>
                  </div>
                </div>
                {renderBlockFields(
                  block,
                  setField,
                  toggleGridProperty,
                  properties,
                )}
              </div>
            ))}
            <div className="flex flex-wrap items-center gap-2">
              <select
                className={`${FIELD_CLASS} w-auto`}
                value={addType}
                aria-label="Block type"
                onChange={(event) =>
                  setAddType(event.target.value as BlockType)
                }
              >
                {BLOCK_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {BLOCK_TYPE_LABELS[type]}
                  </option>
                ))}
              </select>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addBlock}
              >
                Add block
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-3 lg:sticky lg:top-20 lg:self-start">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Preview</p>
            <div className="flex gap-1">
              <button
                type="button"
                className={`rounded border px-2 py-1 text-xs ${previewMode === "desktop" ? "bg-primary text-primary-foreground" : ""}`}
                onClick={() => setPreviewMode("desktop")}
              >
                Desktop
              </button>
              <button
                type="button"
                className={`rounded border px-2 py-1 text-xs ${previewMode === "mobile" ? "bg-primary text-primary-foreground" : ""}`}
                onClick={() => setPreviewMode("mobile")}
              >
                Mobile
              </button>
            </div>
          </div>
          <div className="rounded-lg border bg-muted/30 p-3">
            <iframe
              title="Email preview"
              srcDoc={previewHtml}
              className={`h-[620px] border-0 bg-white ${previewMode === "mobile" ? "mx-auto w-[380px]" : "w-full"}`}
            />
          </div>
        </div>
      </div>

      <div className="space-y-3 rounded-lg border p-4">
        <p className="text-sm font-medium">Send</p>
        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-1.5">
            <label className="text-xs font-medium">Test email</label>
            <Input
              type="email"
              value={testEmail}
              placeholder="you@example.com"
              className="w-56"
              onChange={(event) => setTestEmail(event.target.value)}
            />
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={handleSendTest}
          >
            Send test
          </Button>
        </div>
        <div className="flex flex-wrap items-end gap-2 border-t pt-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium">Schedule for</label>
            <input
              type="datetime-local"
              className={`${FIELD_CLASS} w-56`}
              value={scheduledAt}
              onChange={(event) => setScheduledAt(event.target.value)}
            />
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pending || alreadySent}
            onClick={handleSchedule}
          >
            Schedule
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={pending || alreadySent}
            onClick={handleSendNow}
          >
            Send now
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Scheduling stores the date — automatic delivery is a placeholder;
          use Send now to deliver. Marketing emails skip unsubscribed
          contacts and always include an unsubscribe link.
        </p>
      </div>
    </div>
  );
}

/** Поля редактирования конкретного блока. */
function renderBlockFields(
  block: EditorBlock,
  setField: (key: string, field: string, value: unknown) => void,
  toggleGridProperty: (key: string, propertyId: string) => void,
  properties: PropertyEmailData[],
): React.ReactNode {
  const content = block.content;
  const textInput = (field: string, label: string) => (
    <div className="space-y-1">
      <label className="text-xs text-muted-foreground">{label}</label>
      <Input
        value={fieldStr(content, field)}
        onChange={(event) => setField(block.key, field, event.target.value)}
      />
    </div>
  );

  switch (block.type) {
    case "header":
      return textInput("text", "Heading text");
    case "logo":
      return (
        <div className="space-y-2">
          {textInput("url", "Logo image URL")}
          {textInput("alt", "Alt text")}
        </div>
      );
    case "hero":
      return (
        <div className="space-y-2">
          {textInput("url", "Image URL")}
          {textInput("alt", "Alt text")}
        </div>
      );
    case "text":
    case "footer":
      return (
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Text</label>
          <Textarea
            rows={3}
            value={fieldStr(content, "text")}
            onChange={(event) =>
              setField(block.key, "text", event.target.value)
            }
          />
        </div>
      );
    case "button":
      return (
        <div className="space-y-2">
          {textInput("label", "Button label")}
          {textInput("url", "Button URL")}
        </div>
      );
    case "property_card":
      return (
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Property</label>
          <select
            className={FIELD_CLASS}
            value={fieldStr(content, "propertyId")}
            onChange={(event) =>
              setField(block.key, "propertyId", event.target.value)
            }
          >
            <option value="">Select a property</option>
            {properties.map((property) => (
              <option key={property.id} value={property.id}>
                {property.title}
              </option>
            ))}
          </select>
        </div>
      );
    case "property_grid": {
      const selected = fieldList(content, "propertyIds");
      return (
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">
            Properties ({selected.length} selected)
          </label>
          {properties.length > 0 ? (
            <div className="max-h-44 space-y-1 overflow-y-auto rounded-md border p-2">
              {properties.map((property) => (
                <label
                  key={property.id}
                  className="flex items-center gap-2 text-sm"
                >
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-input"
                    checked={selected.includes(property.id)}
                    onChange={() =>
                      toggleGridProperty(block.key, property.id)
                    }
                  />
                  {property.title}
                </label>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              No properties available.
            </p>
          )}
        </div>
      );
    }
    case "agent_card":
      return (
        <div className="grid gap-2 sm:grid-cols-2">
          {textInput("name", "Agent name")}
          {textInput("title", "Title")}
          {textInput("email", "Email")}
          {textInput("phone", "Phone")}
          {textInput("photoUrl", "Photo URL")}
        </div>
      );
    case "testimonial":
      return (
        <div className="space-y-2">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Quote</label>
            <Textarea
              rows={2}
              value={fieldStr(content, "quote")}
              onChange={(event) =>
                setField(block.key, "quote", event.target.value)
              }
            />
          </div>
          {textInput("author", "Author")}
        </div>
      );
    case "divider":
      return (
        <p className="text-xs text-muted-foreground">
          Renders a horizontal divider — no settings.
        </p>
      );
    case "unsubscribe":
      return (
        <p className="text-xs text-muted-foreground">
          Required block — renders the unsubscribe link in every email.
        </p>
      );
    default:
      return null;
  }
}
