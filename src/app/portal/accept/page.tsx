import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";

import { AcceptButton } from "@/features/portal/accept-button";
import { PORTAL_TYPE_LABELS } from "@/features/portal/constants";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createAdminClient } from "@/lib/supabase/server";
import { requireUser } from "@/server/auth";

export const metadata: Metadata = {
  title: "Accept invitation",
};

export default async function PortalAcceptPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const user = await requireUser();
  const token =
    typeof searchParams.token === "string" ? searchParams.token : "";

  let content: ReactNode;

  if (!token) {
    content = (
      <p className="text-sm text-muted-foreground">
        This invitation link is invalid.
      </p>
    );
  } else {
    const admin = createAdminClient();
    const { data: account } = await admin
      .from("portal_accounts")
      .select("*")
      .eq("invite_token", token)
      .maybeSingle();

    if (!account) {
      content = (
        <p className="text-sm text-muted-foreground">
          This invitation could not be found.
        </p>
      );
    } else if (account.status === "revoked") {
      content = (
        <p className="text-sm text-muted-foreground">
          This invitation has been revoked.
        </p>
      );
    } else if (account.status === "active") {
      content = (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            This invitation has already been accepted.
          </p>
          <Link
            href={`/portal/${account.portal_type}`}
            className={buttonVariants()}
          >
            Open portal
          </Link>
        </div>
      );
    } else if (
      account.expires_at &&
      new Date(account.expires_at).getTime() < Date.now()
    ) {
      content = (
        <p className="text-sm text-muted-foreground">
          This invitation has expired. Please ask the agency for a new one.
        </p>
      );
    } else if (
      !user.email ||
      user.email.toLowerCase() !== account.email.toLowerCase()
    ) {
      content = (
        <p className="text-sm text-muted-foreground">
          This invitation was sent to {account.email}. Sign in with that email
          address to accept it.
        </p>
      );
    } else {
      const { data: organization } = await admin
        .from("organizations")
        .select("name")
        .eq("id", account.organization_id)
        .maybeSingle();
      content = (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            You have been invited to the{" "}
            {PORTAL_TYPE_LABELS[account.portal_type]} portal
            {organization ? ` of ${organization.name}` : ""}.
          </p>
          <AcceptButton token={token} />
        </div>
      );
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <Card>
        <CardHeader>
          <CardTitle>Portal invitation</CardTitle>
        </CardHeader>
        <CardContent>{content}</CardContent>
      </Card>
    </div>
  );
}
