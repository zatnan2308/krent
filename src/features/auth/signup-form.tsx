"use client";

import { useFormState } from "react-dom";

import { signUp } from "@/features/auth/actions";
import {
  AuthField,
  AuthNote,
  AuthPasswordField,
  AuthSubmit,
} from "@/features/auth/auth-shell";
import type { AuthFormState } from "@/features/auth/schema";
import { useI18n } from "@/lib/i18n/provider";

const initialState: AuthFormState = { error: null, success: null };

export function SignUpForm() {
  const [state, formAction] = useFormState(signUp, initialState);
  const { dict } = useI18n();
  const t = dict.auth;
  return (
    <form
      action={formAction}
      style={{ display: "flex", flexDirection: "column", gap: 18 }}
    >
      <AuthField
        label={t.fields.fullName}
        name="fullName"
        placeholder={t.fields.fullNamePlaceholder}
        autoComplete="name"
        required
      />
      <AuthField
        label={t.fields.email}
        name="email"
        type="email"
        placeholder={t.fields.emailPlaceholder}
        autoComplete="email"
        required
      />
      <AuthField
        label={t.fields.phone}
        name="phone"
        type="tel"
        placeholder="+971 ..."
        autoComplete="tel"
      />
      <AuthPasswordField
        label={t.fields.password}
        name="password"
        placeholder={t.fields.createPassword}
        autoComplete="new-password"
        required
        minLength={8}
      />

      <label
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 9,
          fontSize: 12.5,
          color: "var(--text-secondary)",
          lineHeight: 1.5,
          cursor: "pointer",
          marginTop: -2,
        }}
      >
        <input
          type="checkbox"
          required
          style={{
            accentColor: "var(--accent)",
            width: 15,
            height: 15,
            marginTop: 2,
            flexShrink: 0,
          }}
        />
        <span>
          {t.signup.agreePrefix}{" "}
          <a href="#" style={{ color: "var(--accent)" }}>
            {t.signup.terms}
          </a>{" "}
          {t.signup.and}{" "}
          <a href="#" style={{ color: "var(--accent)" }}>
            {t.signup.privacy}
          </a>
          .
        </span>
      </label>

      {state.error ? <AuthNote variant="error">{state.error}</AuthNote> : null}
      {state.success ? (
        <AuthNote variant="success">{state.success}</AuthNote>
      ) : null}

      <AuthSubmit
        label={t.register.submit}
        pendingLabel={t.register.submitting}
      />
    </form>
  );
}
