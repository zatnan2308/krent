import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";

/** Данные для генерации PDF-инвойса бронирования. */
export interface InvoicePdfData {
  organizationName: string;
  reference: string;
  issuedDate: string;
  status: string;
  paymentStatus: string;
  guestName: string;
  guestEmail: string | null;
  guestPhone: string | null;
  propertyTitle: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  adults: number;
  children: number;
  pets: number;
  fees: { label: string; amount: number; currency: string }[];
  total: number;
  currency: string;
}

const PAGE_W = 595.28; // A4
const PAGE_H = 841.89;
const MARGIN = 50;
const RIGHT = PAGE_W - MARGIN;

/**
 * Транслитерация кириллицы (ru/uk) в латиницу. Helvetica/WinAnsi не содержит
 * кириллических глифов, поэтому без этого имена давали «?». Полная поддержка
 * любых письменностей потребовала бы встраивания Unicode-TTF через
 * `@pdf-lib/fontkit` (бинарный ассет + зависимость) — отложено до запроса.
 */
const CYRILLIC_MAP: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", ґ: "g", д: "d", е: "e", ё: "e", є: "ye",
  ж: "zh", з: "z", и: "i", і: "i", ї: "yi", й: "i", к: "k", л: "l", м: "m",
  н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "kh",
  ц: "ts", ч: "ch", ш: "sh", щ: "shch", ъ: "", ы: "y", ь: "", э: "e",
  ю: "yu", я: "ya",
};

/** Заменяет кириллические символы латинской транслитерацией (с учётом регистра). */
function transliterateCyrillic(text: string): string {
  let out = "";
  for (const ch of text) {
    const lower = ch.toLowerCase();
    const mapped = CYRILLIC_MAP[lower];
    if (mapped === undefined) {
      out += ch;
    } else if (ch === lower || mapped === "") {
      out += mapped;
    } else {
      // Заглавная буква: капитализируем первую букву транслитерации.
      out +=
        mapped.length === 1
          ? mapped.toUpperCase()
          : mapped.charAt(0).toUpperCase() + mapped.slice(1);
    }
  }
  return out;
}

/**
 * Делает строку безопасной для WinAnsi (Helvetica): транслитерирует кириллицу,
 * маппит частую умную пунктуацию в ASCII, прочие не-Latin-1 символы заменяет на
 * «?». Так PDF генерируется всегда (редкие письменности деградируют, но без ошибки).
 */
function winAnsiSafe(text: string): string {
  return transliterateCyrillic(text)
    .replace(/[‘’‚‛]/g, "'")
    .replace(/[“”„‟]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/…/g, "...")
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, "?");
}

/** Денежное форматирование кодом валюты (без символа — WinAnsi-безопасно). */
function money(value: number, currency: string): string {
  const amount = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
  return `${amount} ${currency}`;
}

/** Собирает PDF-инвойс бронирования (A4, одна страница). */
export async function buildInvoicePdf(
  data: InvoicePdfData,
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Invoice ${data.reference}`);
  const page = pdf.addPage([PAGE_W, PAGE_H]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const ink = rgb(0.07, 0.07, 0.07);
  const muted = rgb(0.45, 0.45, 0.45);
  const hairline = rgb(0.85, 0.85, 0.85);

  let y = PAGE_H - MARGIN - 16;

  const left = (
    text: string,
    size: number,
    f: PDFFont = font,
    color = ink,
  ): void => {
    page.drawText(winAnsiSafe(text), { x: MARGIN, y, size, font: f, color });
  };
  const right = (
    text: string,
    size: number,
    f: PDFFont = font,
    color = ink,
  ): void => {
    const safe = winAnsiSafe(text);
    const width = f.widthOfTextAtSize(safe, size);
    page.drawText(safe, { x: RIGHT - width, y, size, font: f, color });
  };
  const rule = (thickness = 1, color = hairline): void => {
    page.drawLine({
      start: { x: MARGIN, y },
      end: { x: RIGHT, y },
      thickness,
      color,
    });
  };

  // ---- Header ----
  left(data.organizationName, 20, bold);
  right("INVOICE", 20, bold);
  y -= 18;
  left(`Invoice ${data.reference}`, 10, font, muted);
  right(`Issued ${data.issuedDate}`, 10, font, muted);
  y -= 14;
  right(`Status: ${data.status} · ${data.paymentStatus}`, 10, font, muted);
  y -= 20;
  rule();
  y -= 28;

  // ---- Billed to ----
  left("BILLED TO", 9, bold, muted);
  y -= 16;
  left(data.guestName, 12);
  if (data.guestEmail) {
    y -= 14;
    left(data.guestEmail, 10, font, muted);
  }
  if (data.guestPhone) {
    y -= 14;
    left(data.guestPhone, 10, font, muted);
  }
  y -= 28;

  // ---- Stay ----
  left("STAY", 9, bold, muted);
  y -= 16;
  left(data.propertyTitle, 12);
  y -= 14;
  const occupancy =
    `${data.checkIn} -> ${data.checkOut} · ${data.nights} night(s) · ` +
    `${data.adults} adult(s)` +
    (data.children ? `, ${data.children} child(ren)` : "") +
    (data.pets ? `, ${data.pets} pet(s)` : "");
  left(occupancy, 10, font, muted);
  y -= 30;

  // ---- Charges ----
  left("CHARGES", 9, bold, muted);
  y -= 18;
  for (const fee of data.fees) {
    left(fee.label, 11);
    right(money(fee.amount, fee.currency), 11);
    y -= 9;
    rule(0.5, rgb(0.91, 0.91, 0.91));
    y -= 16;
  }
  y -= 6;
  left("Total", 13, bold);
  right(money(data.total, data.currency), 13, bold);
  y -= 40;

  // ---- Footer ----
  rule();
  y -= 18;
  left(`Thank you for booking with ${data.organizationName}.`, 9, font, muted);
  y -= 12;
  left(
    "This invoice is auto-generated and does not require a signature.",
    9,
    font,
    muted,
  );

  return pdf.save();
}
