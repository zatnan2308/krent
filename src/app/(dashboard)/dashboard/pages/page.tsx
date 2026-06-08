import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ExternalLink } from "lucide-react";

import { listPages } from "@/features/cms/dashboard-queries";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ROUTES } from "@/lib/constants/routes";
import { getServerDictionary } from "@/lib/i18n/runtime";
import { requireOrganizationContext } from "@/server/organization-context";
import { hasPermission } from "@/server/permissions";

export const metadata: Metadata = {
  title: "Pages",
};

export default async function PagesListPage() {
  const context = await requireOrganizationContext();
  if (!context.organization) {
    return null;
  }
  if (!hasPermission(context, "pages.manage")) {
    redirect(ROUTES.dashboard.root);
  }

  const pages = await listPages(
    context.organization.id,
    context.organization.default_language,
  );
  const defaultLocale = context.organization.default_language;
  const dict = await getServerDictionary();
  const t = dict.dashPages;

  return (
    <div className="space-y-6">
      <PageHeader
        title={dict.adminNav.pages}
        description={t.description.replace("{name}", context.organization.name)}
        actions={
          <Link
            href={`${ROUTES.dashboard.pages}/new`}
            className={buttonVariants()}
          >
            {t.newPage}
          </Link>
        }
      />

      {pages.length > 0 ? (
        <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.colTitle}</TableHead>
                <TableHead>{t.colSlug}</TableHead>
                <TableHead>{t.colType}</TableHead>
                <TableHead>{t.colStatus}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pages.map((page) => (
                <TableRow key={page.id}>
                  <TableCell className="font-medium">
                    <Link
                      href={`${ROUTES.dashboard.pages}/${page.id}`}
                      className="hover:underline"
                    >
                      {page.title}
                    </Link>
                    {page.status === "published" ? (
                      <a
                        href={`/${defaultLocale}/${page.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-2 inline-flex text-muted-foreground hover:text-foreground"
                        aria-label={t.viewPublic}
                      >
                        <ExternalLink className="inline h-3.5 w-3.5" />
                      </a>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    /{page.slug}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {page.type}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        page.status === "published" ? "success" : "secondary"
                      }
                    >
                      {page.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <EmptyState title={t.emptyTitle} description={t.emptyDesc} />
      )}
    </div>
  );
}
