import type { Metadata } from "next";

import { AuthShell } from "@/features/auth/auth-shell";
import { ResetPasswordForm } from "@/features/auth/reset-password-form";

export const metadata: Metadata = {
  title: "Reset password",
};

export default function ResetPasswordPage() {
  return (
    <AuthShell eyebrow="Account access" title={"Choose a new\npassword."}>
      <ResetPasswordForm />
    </AuthShell>
  );
}
