import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { EMAIL_SEND_STATUS_LABELS } from "@/features/notifications/constants";
import { PreferencesPanel } from "@/features/notifications/preferences-panel";
import {
  getNotificationCatalog,
  listEmailSends,
  listEmailTemplates,
} from "@/features/notifications/queries";
import type { EmailSendStatus } from "@/features/notifications/types";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { requireOrganizationContext } from "@/server/organization-context";
import { hasPermission } from "@/server/permissions";

export const metadata: Metadata = {
  title: "Email & notifications",
};

const STATUS_BADGE: Record<
  EmailSendStatus,
  "default" | "secondary" | "destructive"
> = {
  queued: "secondary",
  sent: "default",
  failed: "destructive",
};

export default async function EmailPage() {
  const context = await requireOrganizationContext();
  if (!context.organization) {
    return null;
  }
  if (!hasPermission(context, "email.manage")) {
    redirect(ROUTES.dashboard.root);
  }

  const [templates, catalog, sends] = await Promise.all([
    listEmailTemplates(context.organization.id),
    getNotificationCatalog(context.organization.id),
    listEmailSends(context.organization.id),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Email & notifications"
        description="Transactional email templates, notification settings and delivery logs."
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Email templates</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Template</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>State</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map((template) => (
                  <TableRow key={template.key}>
                    <TableCell className="font-medium">
                      <Link
                        href={`${ROUTES.dashboard.email}/${template.key}`}
                        className="hover:underline"
                      >
                        {template.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {template.subject}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1.5">
                        <Badge
                          variant={
                            template.isActive ? "secondary" : "outline"
                          }
                        >
                          {template.isActive ? "Active" : "Inactive"}
                        </Badge>
                        {template.isCustomised ? (
                          <Badge variant="outline">Customised</Badge>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Notification settings</CardTitle>
        </CardHeader>
        <CardContent>
          <PreferencesPanel
            events={catalog}
            canManage={hasPermission(context, "email.manage")}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent email log</CardTitle>
        </CardHeader>
        <CardContent>
          {sends.length > 0 ? (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Recipient</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Sent</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sends.map((send) => (
                    <TableRow key={send.id}>
                      <TableCell className="font-medium">
                        {send.to_email}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {send.subject}
                        {send.error ? (
                          <span className="block text-xs text-destructive">
                            {send.error}
                          </span>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        <Badge variant={STATUS_BADGE[send.status]}>
                          {EMAIL_SEND_STATUS_LABELS[send.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(send.created_at).toLocaleString("en-US")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <EmptyState
              title="No emails sent yet"
              description="Transactional emails will appear here once events are triggered."
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
