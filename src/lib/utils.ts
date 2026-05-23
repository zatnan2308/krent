import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/** Объединяет классы по условию и устраняет конфликты Tailwind-классов. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
