import type { Metadata } from "next";

import { AuthShell } from "@/features/auth/auth-shell";
import { SignUpForm } from "@/features/auth/signup-form";

export const metadata: Metadata = {
  title: "Create account",
};

export default function SignUpPage() {
  return (
    <AuthShell
      eyebrow="Create account"
      title={"Find your place\nin Dubai."}
      activeTab="register"
    >
      <SignUpForm />
    </AuthShell>
  );
}
