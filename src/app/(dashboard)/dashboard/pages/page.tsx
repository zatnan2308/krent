import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink } from "lucide-react";

import { listPages } from "@/features/cms/dashboard-queries";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ROUTES } from "@/lib/constants/routes";
import { requireOrganizationContext } from "@/server/organization-context";

export const metadata: Metadata = {
  title: "Pages",
};

export default async function PagesListPage() {
  const context = await requireOrganizationContext();
  if (!context.organization) {
    return null;
  }

  const pages = await listPages(
    context.organization.id,
    context.organization.default_language,
  );
  const defaultLocale = context.organization.default_language;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Pages</h1>
          <p className="text-sm text-muted-foreground">
            Public website pages of {context.organization.name}.
          </p>
        </div>
        <Link href={`${ROUTES.dashboard.pages}/new`} className={buttonVariants()}>
          New page
        </Link>
      </div>

      {pages.length > 0 ? (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
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
                        aria-label="View public page"
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
        <EmptyState
          title="No pages yet"
          description="Create your first public website page."
        />
      )}
    </div>
  );
}
