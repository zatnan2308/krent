import type { ReactNode } from "react";
import Link from "next/link";
import { Building2 } from "lucide-react";

import { DEFAULT_BRANDING } from "@/lib/branding";
import { ROUTES } from "@/lib/constants/routes";

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-muted/40 px-4 py-12">
      <Link
        href={ROUTES.public.home}
        className="flex items-center gap-2 text-lg font-semibold"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <Building2 className="h-5 w-5" />
        </span>
        {DEFAULT_BRANDING.logoText}
      </Link>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
