"use client";

import { useFormState } from "react-dom";

import { resetPassword } from "@/features/auth/actions";
import {
  AuthNote,
  AuthPasswordField,
  AuthSubmit,
} from "@/features/auth/auth-shell";
import type { AuthFormState } from "@/features/auth/schema";

const initialState: AuthFormState = { error: null, success: null };

export function ResetPasswordForm() {
  const [state, formAction] = useFormState(resetPassword, initialState);
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
          Set a new password
        </h2>
        <p
          style={{ fontSize: 13, color: "var(--text-tertiary)", marginTop: 6 }}
        >
          Enter your new password — you&apos;ll be signed in afterwards.
        </p>
      </div>

      <AuthPasswordField
        label="New password"
        name="password"
        placeholder="At least 8 characters"
        autoComplete="new-password"
        required
        minLength={8}
      />
      <AuthPasswordField
        label="Confirm new password"
        name="confirmPassword"
        placeholder="Repeat your password"
        autoComplete="new-password"
        required
        minLength={8}
      />

      {state.error ? <AuthNote variant="error">{state.error}</AuthNote> : null}
      {state.success ? (
        <AuthNote variant="success">{state.success}</AuthNote>
      ) : null}

      <AuthSubmit label="Set new password" pendingLabel="Saving…" />
    </form>
  );
}
