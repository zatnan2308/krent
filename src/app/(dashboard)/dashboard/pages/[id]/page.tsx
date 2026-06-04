import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ExternalLink } from "lucide-react";

import { getPageForEdit } from "@/features/cms/dashboard-queries";
import { PageEditor } from "@/features/cms/page-editor";
import { PageHeader } from "@/components/ui/page-header";
import { ROUTES } from "@/lib/constants/routes";
import { requireOrganizationContext } from "@/server/organization-context";
import { hasPermission } from "@/server/permissions";

export const metadata: Metadata = {
  title: "Edit page",
};

export default async function EditPagePage({
  params,
}: {
  params: { id: string };
}) {
  const context = await requireOrganizationContext();
  if (!context.organization) {
    redirect(ROUTES.dashboard.root);
  }
  if (!hasPermission(context, "pages.manage")) {
    redirect(ROUTES.dashboard.root);
  }

  const page = await getPageForEdit(
    context.organization.id,
    params.id,
    context.organization.default_language,
  );
  if (!page) {
    notFound();
  }

  const defaultLocale = context.organization.default_language;
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: "Pages", href: ROUTES.dashboard.pages },
          { label: "Edit page" },
        ]}
        title="Edit page"
        actions={
          page.status === "published" ? (
            <a
              href={`/${defaultLocale}/${page.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-md border bg-background px-4 text-sm font-medium shadow-xs transition-colors hover:bg-accent"
            >
              <ExternalLink className="h-4 w-4" />
              View page
            </a>
          ) : null
        }
      />
      <PageEditor initial={page} />
    </div>
  );
}
