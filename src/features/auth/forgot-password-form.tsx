"use client";

import { useFormState } from "react-dom";

import { requestPasswordReset } from "@/features/auth/actions";
import {
  AuthField,
  AuthNote,
  AuthSubmit,
} from "@/features/auth/auth-shell";
import type { AuthFormState } from "@/features/auth/schema";

const initialState: AuthFormState = { error: null, success: null };

export function ForgotPasswordForm() {
  const [state, formAction] = useFormState(requestPasswordReset, initialState);
  return (
    <form
      action={formAction}
      style={{ display: "flex", flexDirection: "column", gap: 18 }}
    >
      <div>
        <h2
          className="serif"
          style={{
            fontSize: "1.5rem",
            letterSpacing: "-0.02em",
            fontWeight: 400,
          }}
        >
          Reset your password
        </h2>
        <p
          style={{ fontSize: 13, color: "var(--text-tertiary)", marginTop: 6 }}
        >
          Enter your email — we&apos;ll send a secure reset link.
        </p>
      </div>

      <AuthField
        label="Email"
        name="email"
        type="email"
        placeholder="you@example.com"
        autoComplete="email"
        required
      />

      {state.error ? <AuthNote variant="error">{state.error}</AuthNote> : null}
      {state.success ? (
        <AuthNote variant="success">{state.success}</AuthNote>
      ) : null}

      <AuthSubmit label="Send reset link" pendingLabel="Sending…" />
    </form>
  );
}
