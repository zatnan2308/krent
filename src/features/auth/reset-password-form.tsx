"use client";

import { useFormState } from "react-dom";

import { resetPassword } from "@/features/auth/actions";
import {
  AuthNote,
  AuthPasswordField,
  AuthSubmit,
} from "@/features/auth/auth-shell";
import type { AuthFormState } from "@/features/auth/schema";
import { useI18n } from "@/lib/i18n/provider";

const initialState: AuthFormState = { error: null, success: null };

export function ResetPasswordForm() {
  const [state, formAction] = useFormState(resetPassword, initialState);
  const { dict } = useI18n();
  const t = dict.auth;
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
          {t.reset.heading}
        </h2>
        <p
          style={{ fontSize: 13, color: "var(--text-tertiary)", marginTop: 6 }}
        >
          {t.reset.blurb}
        </p>
      </div>

      <AuthPasswordField
        label={t.fields.newPassword}
        name="password"
        placeholder={t.fields.newPasswordPlaceholder}
        autoComplete="new-password"
        required
        minLength={8}
      />
      <AuthPasswordField
        label={t.fields.confirmPassword}
        name="confirmPassword"
        placeholder={t.fields.confirmPasswordPlaceholder}
        autoComplete="new-password"
        required
        minLength={8}
      />

      {state.error ? <AuthNote variant="error">{state.error}</AuthNote> : null}
      {state.success ? (
        <AuthNote variant="success">{state.success}</AuthNote>
      ) : null}

      <AuthSubmit label={t.reset.submit} pendingLabel={t.reset.submitting} />
    </form>
  );
}
