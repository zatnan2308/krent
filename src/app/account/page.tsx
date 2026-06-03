import type { Metadata } from "next";

import { AccountApp } from "@/features/account/account-app";
import { getAccountData } from "@/features/account/queries";
import { requireUser } from "@/server/auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "My account",
  robots: { index: false, follow: false },
};

export default async function AccountPage() {
  const user = await requireUser();
  const data = await getAccountData(user);
  return <AccountApp data={data} />;
}
