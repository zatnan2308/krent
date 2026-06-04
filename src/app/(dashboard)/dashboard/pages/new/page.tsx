import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { EMPTY_PAGE_CONTENT } from "@/features/cms/content";
import { PageEditor } from "@/features/cms/page-editor";
import { PageHeader } from "@/components/ui/page-header";
import { ROUTES } from "@/lib/constants/routes";
import { requireOrganizationContext } from "@/server/organization-context";

export const metadata: Metadata = {
  title: "New page",
};

export default async function NewPagePage() {
  const context = await requireOrganizationContext();
  if (!context.organization) {
    redirect(ROUTES.dashboard.root);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: "Pages", href: ROUTES.dashboard.pages },
          { label: "New page" },
        ]}
        title="New page"
      />
      <PageEditor
        initial={{
          slug: "",
          type: "custom",
          status: "draft",
          title: "",
          seoTitle: "",
          seoDescription: "",
          content: EMPTY_PAGE_CONTENT,
        }}
      />
    </div>
  );
}
