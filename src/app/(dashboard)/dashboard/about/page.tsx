import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AboutEditor } from "@/features/about/about-editor";
import { getAboutContent } from "@/features/about/queries";
import { ROUTES } from "@/lib/constants/routes";
import { requireOrganizationContext } from "@/server/organization-context";
import { hasPermission } from "@/server/permissions";

export const metadata: Metadata = {
  title: "About page",
};

export const dynamic = "force-dynamic";

export default async function AboutEditorPage() {
  const context = await requireOrganizationContext();
  if (!context.organization) {
    return null;
  }
  if (!hasPermission(context, "organization.view")) {
    redirect(ROUTES.dashboard.root);
  }
  const content = await getAboutContent(context.organization.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">About page</h1>
        <p className="text-sm text-muted-foreground">
          Edit the public <strong>/about</strong> page — hero, story and the
          timeline of milestones.
        </p>
      </div>
      <AboutEditor
        page={{
          heroTitle: content.page?.hero_title ?? null,
          storyHeading: content.page?.story_heading ?? null,
          storyBody: content.page?.story_body ?? null,
          quote1: content.page?.quote_1 ?? null,
          quote2: content.page?.quote_2 ?? null,
        }}
        milestones={content.milestones}
      />
    </div>
  );
}
