import type { Metadata } from "next";

import { AuthShell } from "@/features/auth/auth-shell";
import { ForgotPasswordForm } from "@/features/auth/forgot-password-form";

export const metadata: Metadata = {
  title: "Forgot password",
};

export default function ForgotPasswordPage() {
  return (
    <AuthShell variant="forgot">
      <ForgotPasswordForm />
    </AuthShell>
  );
}
