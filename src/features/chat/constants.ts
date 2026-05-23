import type { AttachmentType, ConversationType } from "./types";

/** Лимиты размера вложений по категориям. */
export const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
export const MAX_DOCUMENT_SIZE = 20 * 1024 * 1024;
export const MAX_VIDEO_SIZE = 100 * 1024 * 1024;

const IMAGE_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
]);
const VIDEO_MIME = new Set([
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/ogg",
]);
const DOCUMENT_MIME = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
]);

/** Разрешённые MIME-типы для атрибута accept у input[type=file]. */
export const ACCEPTED_MIME = [...IMAGE_MIME, ...VIDEO_MIME, ...DOCUMENT_MIME].join(
  ",",
);

export interface AttachmentRule {
  type: AttachmentType;
  maxSize: number;
}

/** Категория вложения и лимит размера по MIME-типу; null — тип не поддержан. */
export function classifyAttachment(mimeType: string): AttachmentRule | null {
  if (IMAGE_MIME.has(mimeType)) {
    return { type: "image", maxSize: MAX_IMAGE_SIZE };
  }
  if (VIDEO_MIME.has(mimeType)) {
    return { type: "video", maxSize: MAX_VIDEO_SIZE };
  }
  if (DOCUMENT_MIME.has(mimeType)) {
    return { type: "document", maxSize: MAX_DOCUMENT_SIZE };
  }
  return null;
}

/** Человекочитаемый размер файла. */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export const CONVERSATION_TYPE_LABELS: Record<ConversationType, string> = {
  buyer_agent: "Buyer",
  seller_agent: "Seller",
  guest_manager: "Guest",
  internal: "Internal",
};
