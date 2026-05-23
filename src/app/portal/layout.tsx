import type { ReactNode } from "react";
import Link from "next/link";
import { Building2, LogOut } from "lucide-react";

import { signOut } from "@/features/auth/actions";
import { ROUTES } from "@/lib/constants/routes";
import { requireUser } from "@/server/auth";

// Зависит от сессии — всегда динамический рендер.
export const dynamic = "force-dynamic";

export default async function PortalLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await requireUser();

  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      <header className="border-b bg-background">
        <div className="container flex h-16 items-center justify-between gap-4">
          <Link
            href={ROUTES.portal.hub}
            className="flex items-center gap-2 font-semibold"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Building2 className="h-5 w-5" />
            </span>
            Client portal
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link
              href={ROUTES.portal.hub}
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              Portals
            </Link>
            <Link
              href={ROUTES.portal.messages}
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              Messages
            </Link>
          </nav>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-muted-foreground sm:inline">
              {user.email}
            </span>
            <form action={signOut}>
              <button
                type="submit"
                className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="container flex-1 py-8">{children}</main>
    </div>
  );
}
