import { unstable_cache } from "next/cache";

import { createAdminClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";

export interface AboutContent {
  page: Tables<"about_page"> | null;
  milestones: Tables<"about_milestones">[];
}

const getAboutContentCached = unstable_cache(
  async (organizationId: string): Promise<AboutContent> => {
    const admin = createAdminClient();
    const [pageResult, milestonesResult] = await Promise.all([
      admin
        .from("about_page")
        .select("*")
        .eq("organization_id", organizationId)
        .maybeSingle(),
      admin
        .from("about_milestones")
        .select("*")
        .eq("organization_id", organizationId)
        .order("sort_order", { ascending: true }),
    ]);
    return {
      page: pageResult.data,
      milestones: milestonesResult.data ?? [],
    };
  },
  ["about-content-by-org"],
  { revalidate: 60, tags: ["about-content"] },
);

/** Редактируемый контент страницы /about (тексты + вехи). */
export async function getAboutContent(
  organizationId: string,
): Promise<AboutContent> {
  return getAboutContentCached(organizationId);
}
