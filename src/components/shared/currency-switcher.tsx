"use client";

import * as React from "react";
import { Check } from "lucide-react";
import { useRouter } from "next/navigation";

import {
  Dropdown,
  DropdownContent,
  DropdownItem,
  DropdownLabel,
  DropdownSeparator,
  DropdownTrigger,
} from "@/components/ui/dropdown";
import { setCurrency } from "@/features/localization/actions";
import {
  CURRENCIES,
  CURRENCY_CONFIG,
  CURRENCY_COOKIE,
  DEFAULT_CURRENCY,
  isCurrencyCode,
  type CurrencyCode,
} from "@/lib/currency";

function readCurrencyFromCookie(): CurrencyCode {
  if (typeof document === "undefined") {
    return DEFAULT_CURRENCY;
  }
  const entry = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${CURRENCY_COOKIE}=`));
  const value = entry?.split("=")[1];
  return value && isCurrencyCode(value) ? value : DEFAULT_CURRENCY;
}

interface CurrencySwitcherProps {
  label: string;
}

export function CurrencySwitcher({ label }: CurrencySwitcherProps) {
  const router = useRouter();
  const [current, setCurrent] = React.useState<CurrencyCode>(DEFAULT_CURRENCY);

  React.useEffect(() => {
    setCurrent(readCurrencyFromCookie());
  }, []);

  async function handleSelect(currency: CurrencyCode) {
    if (currency === current) {
      return;
    }
    setCurrent(currency);
    await setCurrency(currency);
    router.refresh();
  }

  return (
    <Dropdown>
      <DropdownTrigger
        className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-medium outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={label}
      >
        <span className="text-muted-foreground">
          {CURRENCY_CONFIG[current]?.symbol}
        </span>
        <span>{current}</span>
      </DropdownTrigger>
      <DropdownContent align="end" className="w-44">
        <DropdownLabel>{label}</DropdownLabel>
        <DropdownSeparator />
        {CURRENCIES.map((currency) => (
          <DropdownItem key={currency} onSelect={() => handleSelect(currency)}>
            <span className="w-6 text-muted-foreground">
              {CURRENCY_CONFIG[currency]?.symbol}
            </span>
            <span className="flex-1">{currency}</span>
            {currency === current ? <Check className="h-4 w-4" /> : null}
          </DropdownItem>
        ))}
      </DropdownContent>
    </Dropdown>
  );
}
