import type { Metadata } from "next";
import { Suspense } from "react";

import { AuthShell } from "@/features/auth/auth-shell";
import { LoginForm } from "@/features/auth/login-form";

export const metadata: Metadata = {
  title: "Sign in",
};

export default function LoginPage() {
  return (
    <AuthShell
      eyebrow="Welcome back"
      title={"Your Dubai\nportfolio awaits."}
      activeTab="signin"
    >
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
