import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { getEmailTemplate } from "@/features/notifications/queries";
import { TemplateEditor } from "@/features/notifications/template-editor";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { ROUTES } from "@/lib/constants/routes";
import { requireOrganizationContext } from "@/server/organization-context";
import { hasPermission } from "@/server/permissions";

export const metadata: Metadata = {
  title: "Edit email template",
};

export default async function EmailTemplatePage({
  params,
}: {
  params: { key: string };
}) {
  const context = await requireOrganizationContext();
  if (!context.organization) {
    return null;
  }
  if (!hasPermission(context, "email.manage")) {
    redirect(ROUTES.dashboard.root);
  }

  const template = await getEmailTemplate(
    context.organization.id,
    params.key,
  );
  if (!template) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: "Email & notifications", href: ROUTES.dashboard.email },
          { label: template.name },
        ]}
        title={template.name}
        description="Customise the transactional email for this event. Saving creates an organisation-specific version of the template."
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Template content</CardTitle>
        </CardHeader>
        <CardContent>
          <TemplateEditor template={template} />
        </CardContent>
      </Card>
    </div>
  );
}
