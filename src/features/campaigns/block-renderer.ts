import { wrapEmailHtml } from "@/features/notifications/render";

import type { CampaignBlockData } from "./blocks";

/** Данные объекта для блоков property card / grid. */
export interface PropertyEmailData {
  id: string;
  title: string;
  priceText: string;
  imageUrl: string;
  url: string;
}

export interface CampaignRenderContext {
  companyName: string;
  unsubscribeUrl: string;
  properties: Record<string, PropertyEmailData>;
}

/** Экранирование значения для вставки в HTML. */
function esc(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Безопасное чтение строкового поля контента блока. */
function str(content: Record<string, unknown>, key: string): string {
  const value = content[key];
  return typeof value === "string" ? value : "";
}

/** Чтение URL-поля; пустая строка, если значение не http(s). */
function safeUrl(content: Record<string, unknown>, key: string): string {
  const value = str(content, key).trim();
  return /^https?:\/\//i.test(value) ? value : "";
}

/** Текст с переносами строк -> HTML-параграфы. */
function paragraphs(text: string): string {
  return esc(text)
    .split(/\n{2,}/)
    .filter((part) => part.trim() !== "")
    .map(
      (para) =>
        `<p style="margin:0 0 12px;">${para.replace(/\n/g, "<br/>")}</p>`,
    )
    .join("");
}

/** Карточка объекта для письма. */
function renderPropertyCard(property: PropertyEmailData | undefined): string {
  if (!property) {
    return "";
  }
  const image = property.imageUrl
    ? `<img src="${esc(property.imageUrl)}" alt="" style="width:100%;height:170px;object-fit:cover;display:block;"/>`
    : "";
  const price = property.priceText
    ? `<p style="margin:4px 0 0;color:#71717a;font-size:13px;">${esc(property.priceText)}</p>`
    : "";
  const link = property.url
    ? `<a href="${esc(property.url)}" style="display:inline-block;margin-top:10px;color:#18181b;font-weight:bold;text-decoration:none;">View property &rarr;</a>`
    : "";
  return [
    '<div style="border:1px solid #e4e4e7;border-radius:8px;overflow:hidden;margin:12px 0;">',
    image,
    '<div style="padding:14px;">',
    `<p style="margin:0;font-weight:bold;">${esc(property.title)}</p>`,
    price,
    link,
    "</div></div>",
  ].join("");
}

/** Рендерит один блок письма в HTML. */
function renderBlock(
  block: CampaignBlockData,
  context: CampaignRenderContext,
): string {
  const content = block.content ?? {};
  switch (block.type) {
    case "header":
      return `<h1 style="margin:0 0 16px;font-size:22px;">${esc(str(content, "text"))}</h1>`;
    case "logo": {
      const src = safeUrl(content, "url");
      return src
        ? `<div style="text-align:center;margin:0 0 16px;"><img src="${esc(src)}" alt="${esc(str(content, "alt"))}" style="max-height:48px;"/></div>`
        : "";
    }
    case "hero": {
      const src = safeUrl(content, "url");
      return src
        ? `<img src="${esc(src)}" alt="${esc(str(content, "alt"))}" style="width:100%;border-radius:8px;display:block;margin:0 0 16px;"/>`
        : "";
    }
    case "text":
      return `<div style="margin:0 0 4px;">${paragraphs(str(content, "text"))}</div>`;
    case "button": {
      const href = safeUrl(content, "url");
      const label = esc(str(content, "label") || "Button");
      return href
        ? `<div style="margin:0 0 16px;"><a href="${esc(href)}" style="display:inline-block;background:#18181b;color:#ffffff;padding:10px 22px;border-radius:6px;text-decoration:none;font-weight:bold;">${label}</a></div>`
        : "";
    }
    case "property_card":
      return renderPropertyCard(
        context.properties[str(content, "propertyId")],
      );
    case "property_grid": {
      const ids = Array.isArray(content.propertyIds)
        ? content.propertyIds
        : [];
      return ids
        .map((id) =>
          typeof id === "string"
            ? renderPropertyCard(context.properties[id])
            : "",
        )
        .join("");
    }
    case "agent_card": {
      const name = esc(str(content, "name"));
      if (!name) {
        return "";
      }
      const photo = safeUrl(content, "photoUrl");
      const photoHtml = photo
        ? `<img src="${esc(photo)}" alt="" style="width:56px;height:56px;border-radius:50%;object-fit:cover;margin-right:12px;"/>`
        : "";
      const contactParts: string[] = [];
      if (str(content, "email")) {
        contactParts.push(esc(str(content, "email")));
      }
      if (str(content, "phone")) {
        contactParts.push(esc(str(content, "phone")));
      }
      return [
        '<div style="display:flex;align-items:center;border:1px solid #e4e4e7;border-radius:8px;padding:14px;margin:12px 0;">',
        photoHtml,
        "<div>",
        `<p style="margin:0;font-weight:bold;">${name}</p>`,
        str(content, "title")
          ? `<p style="margin:2px 0 0;color:#71717a;font-size:13px;">${esc(str(content, "title"))}</p>`
          : "",
        contactParts.length > 0
          ? `<p style="margin:4px 0 0;color:#71717a;font-size:13px;">${contactParts.join(" &middot; ")}</p>`
          : "",
        "</div></div>",
      ].join("");
    }
    case "testimonial": {
      const quote = esc(str(content, "quote"));
      if (!quote) {
        return "";
      }
      const author = str(content, "author");
      return [
        '<blockquote style="margin:12px 0;padding:12px 16px;border-left:3px solid #18181b;color:#3f3f46;">',
        `<p style="margin:0;font-style:italic;">&ldquo;${quote}&rdquo;</p>`,
        author
          ? `<p style="margin:8px 0 0;font-size:13px;color:#71717a;">&mdash; ${esc(author)}</p>`
          : "",
        "</blockquote>",
      ].join("");
    }
    case "divider":
      return '<hr style="border:none;border-top:1px solid #e4e4e7;margin:20px 0;"/>';
    case "footer":
      return `<div style="margin:20px 0 0;color:#71717a;font-size:12px;">${paragraphs(str(content, "text") || context.companyName)}</div>`;
    case "unsubscribe":
      return [
        '<p style="margin:12px 0 0;color:#a1a1aa;font-size:11px;text-align:center;">',
        `You received this email from ${esc(context.companyName)}.<br/>`,
        `<a href="${esc(context.unsubscribeUrl)}" style="color:#a1a1aa;">Unsubscribe</a>`,
        "</p>",
      ].join("");
    default:
      return "";
  }
}

/** Собирает HTML письма кампании из блоков. */
export function renderCampaignEmail(
  blocks: CampaignBlockData[],
  context: CampaignRenderContext,
): string {
  const body = blocks
    .map((block) => renderBlock(block, context))
    .join("");
  return wrapEmailHtml(body, context.companyName);
}

/**
 * Гарантирует наличие блока unsubscribe — маркетинговое письмо обязано
 * содержать ссылку на отписку.
 */
export function ensureUnsubscribeBlock(
  blocks: CampaignBlockData[],
): CampaignBlockData[] {
  if (blocks.some((block) => block.type === "unsubscribe")) {
    return blocks;
  }
  return [...blocks, { type: "unsubscribe", content: {} }];
}
