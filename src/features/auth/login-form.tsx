"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useFormState } from "react-dom";

import { signIn } from "@/features/auth/actions";
import {
  AuthField,
  AuthNote,
  AuthPasswordField,
  AuthSubmit,
} from "@/features/auth/auth-shell";
import type { AuthFormState } from "@/features/auth/schema";
import { ROUTES } from "@/lib/constants/routes";

const initialState: AuthFormState = { error: null };

export function LoginForm() {
  const [state, formAction] = useFormState(signIn, initialState);
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") ?? "";
  const confirmed = searchParams.get("confirmed");
  const passwordReset = searchParams.get("password_reset");

  return (
    <form
      action={formAction}
      style={{ display: "flex", flexDirection: "column", gap: 18 }}
    >
      <input type="hidden" name="redirectTo" value={redirectTo} readOnly />

      {confirmed ? (
        <AuthNote variant="success">Email confirmed. Please sign in.</AuthNote>
      ) : null}
      {passwordReset ? (
        <AuthNote variant="success">
          Password updated. Sign in with your new password.
        </AuthNote>
      ) : null}

      <AuthField
        label="Email"
        name="email"
        type="email"
        placeholder="you@example.com"
        autoComplete="email"
        required
      />
      <AuthPasswordField
        label="Password"
        name="password"
        placeholder="Your password"
        autoComplete="current-password"
        required
      />

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: -4,
        }}
      >
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 13,
            color: "var(--text-secondary)",
            cursor: "pointer",
          }}
        >
          <input
            type="checkbox"
            name="remember"
            style={{ accentColor: "var(--accent)", width: 15, height: 15 }}
          />{" "}
          Remember me
        </label>
        <Link
          href={ROUTES.auth.forgotPassword}
          style={{ fontSize: 13, color: "var(--accent)" }}
        >
          Forgot password?
        </Link>
      </div>

      {state.error ? <AuthNote variant="error">{state.error}</AuthNote> : null}

      <AuthSubmit label="Sign in" pendingLabel="Signing in…" />
    </form>
  );
}
