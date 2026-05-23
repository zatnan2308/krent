/**
 * Шаблонизатор писем: подстановка {{variable}} и оборачивание контента
 * в брендированную HTML-оболочку. Модуль чистый — без зависимостей.
 */

/** Экранирует значение для безопасной вставки в HTML. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Базовая подстановка {{key}}; неизвестные переменные — пустая строка. */
function substitute(
  template: string,
  variables: Record<string, string>,
  escape: boolean,
): string {
  return template.replace(
    /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g,
    (_match, key: string) => {
      const value = variables[key.toLowerCase()] ?? "";
      return escape ? escapeHtml(value) : value;
    },
  );
}

/** Рендер для plain-text контекста (тема письма, текстовая часть). */
export function renderText(
  template: string,
  variables: Record<string, string>,
): string {
  return substitute(template, variables, false);
}

/** Рендер для HTML-контекста: значения переменных экранируются. */
export function renderHtml(
  template: string,
  variables: Record<string, string>,
): string {
  return substitute(template, variables, true);
}

/** Грубое преобразование HTML-контента в plain-text. */
export function htmlToText(html: string): string {
  return html
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\/\s*p\s*>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&amp;/gi, "&")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Оборачивает готовый контент письма в брендированную HTML-оболочку. */
export function wrapEmailHtml(content: string, companyName: string): string {
  const safeCompany = escapeHtml(companyName || "");
  const year = new Date().getUTCFullYear();
  return [
    "<!DOCTYPE html>",
    '<html lang="en"><head><meta charset="utf-8"/>',
    '<meta name="viewport" content="width=device-width, initial-scale=1"/>',
    "</head>",
    '<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#18181b;">',
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:24px 0;">',
    '<tr><td align="center">',
    '<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:8px;overflow:hidden;">',
    `<tr><td style="background:#18181b;color:#ffffff;padding:20px 28px;font-size:16px;font-weight:bold;">${safeCompany}</td></tr>`,
    `<tr><td style="padding:28px;font-size:14px;line-height:1.6;">${content}</td></tr>`,
    `<tr><td style="padding:20px 28px;border-top:1px solid #e4e4e7;color:#71717a;font-size:12px;">&copy; ${year} ${safeCompany}</td></tr>`,
    "</table>",
    "</td></tr></table>",
    "</body></html>",
  ].join("");
}
