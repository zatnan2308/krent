"use client";

import { useFormState } from "react-dom";

import { requestPasswordReset } from "@/features/auth/actions";
import {
  AuthField,
  AuthNote,
  AuthSubmit,
} from "@/features/auth/auth-shell";
import type { AuthFormState } from "@/features/auth/schema";
import { useI18n } from "@/lib/i18n/provider";

const initialState: AuthFormState = { error: null, success: null };

export function ForgotPasswordForm() {
  const [state, formAction] = useFormState(requestPasswordReset, initialState);
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
          {t.forgot.heading}
        </h2>
        <p
          style={{ fontSize: 13, color: "var(--text-tertiary)", marginTop: 6 }}
        >
          {t.forgot.blurb}
        </p>
      </div>

      <AuthField
        label={t.fields.email}
        name="email"
        type="email"
        placeholder={t.fields.emailPlaceholder}
        autoComplete="email"
        required
      />

      {state.error ? <AuthNote variant="error">{state.error}</AuthNote> : null}
      {state.success ? (
        <AuthNote variant="success">{state.success}</AuthNote>
      ) : null}

      <AuthSubmit label={t.forgot.submit} pendingLabel={t.forgot.submitting} />
    </form>
  );
}
