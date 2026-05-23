import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { getEmailTemplate } from "@/features/notifications/queries";
import { TemplateEditor } from "@/features/notifications/template-editor";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
      <div>
        <Link
          href={ROUTES.dashboard.email}
          className="text-sm text-muted-foreground hover:underline"
        >
          &larr; Email &amp; notifications
        </Link>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          {template.name}
        </h1>
        <p className="text-sm text-muted-foreground">
          Customise the transactional email for this event. Saving creates an
          organisation-specific version of the template.
        </p>
      </div>

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
