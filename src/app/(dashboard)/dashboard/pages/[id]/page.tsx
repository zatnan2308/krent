import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { getPageForEdit } from "@/features/cms/dashboard-queries";
import { PageEditor } from "@/features/cms/page-editor";
import { ROUTES } from "@/lib/constants/routes";
import { requireOrganizationContext } from "@/server/organization-context";

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

  const page = await getPageForEdit(
    context.organization.id,
    params.id,
    context.organization.default_language,
  );
  if (!page) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Edit page</h1>
      <PageEditor initial={page} />
    </div>
  );
}
