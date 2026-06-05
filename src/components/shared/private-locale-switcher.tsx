"use client";

import { Check, Globe } from "lucide-react";
import { useRouter } from "next/navigation";

import {
  Dropdown,
  DropdownContent,
  DropdownItem,
  DropdownLabel,
  DropdownSeparator,
  DropdownTrigger,
} from "@/components/ui/dropdown";
import { setUserLocalePreference } from "@/features/localization/actions";
import { LOCALE_LABELS, LOCALES, type Locale } from "@/lib/i18n";

/**
 * Переключатель языка для приватных зон (admin / account / portal).
 * В отличие от публичного LanguageSwitcher не меняет URL, а сохраняет
 * персональный выбор (user_metadata + cookie) и обновляет страницу.
 */
export function PrivateLocaleSwitcher({
  currentLocale,
  label = "Language",
}: {
  currentLocale: Locale;
  label?: string;
}) {
  const router = useRouter();

  async function handleSelect(locale: Locale) {
    if (locale === currentLocale) {
      return;
    }
    await setUserLocalePreference(locale);
    router.refresh();
  }

  return (
    <Dropdown>
      <DropdownTrigger
        className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-medium outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={label}
      >
        <Globe className="h-4 w-4 text-muted-foreground" />
        <span className="uppercase">{currentLocale}</span>
      </DropdownTrigger>
      <DropdownContent align="end" side="bottom" sideOffset={8} className="w-44">
        <DropdownLabel>{label}</DropdownLabel>
        <DropdownSeparator />
        {LOCALES.map((locale) => (
          <DropdownItem key={locale} onSelect={() => handleSelect(locale)}>
            <span className="flex-1">{LOCALE_LABELS[locale]}</span>
            {locale === currentLocale ? <Check className="h-4 w-4" /> : null}
          </DropdownItem>
        ))}
      </DropdownContent>
    </Dropdown>
  );
}
