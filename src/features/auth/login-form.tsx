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
import { useI18n } from "@/lib/i18n/provider";

const initialState: AuthFormState = { error: null };

export function LoginForm() {
  const [state, formAction] = useFormState(signIn, initialState);
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") ?? "";
  const confirmed = searchParams.get("confirmed");
  const passwordReset = searchParams.get("password_reset");
  const { dict } = useI18n();
  const t = dict.auth;

  return (
    <form
      action={formAction}
      style={{ display: "flex", flexDirection: "column", gap: 18 }}
    >
      <input type="hidden" name="redirectTo" value={redirectTo} readOnly />

      {confirmed ? (
        <AuthNote variant="success">{t.login.confirmed}</AuthNote>
      ) : null}
      {passwordReset ? (
        <AuthNote variant="success">{t.login.passwordReset}</AuthNote>
      ) : null}

      <AuthField
        label={t.fields.email}
        name="email"
        type="email"
        placeholder={t.fields.emailPlaceholder}
        autoComplete="email"
        required
      />
      <AuthPasswordField
        label={t.fields.password}
        name="password"
        placeholder={t.fields.yourPassword}
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
          {t.login.rememberMe}
        </label>
        <Link
          href={ROUTES.auth.forgotPassword}
          style={{ fontSize: 13, color: "var(--accent)" }}
        >
          {t.login.forgotPassword}
        </Link>
      </div>

      {state.error ? <AuthNote variant="error">{state.error}</AuthNote> : null}

      <AuthSubmit label={t.signin.submit} pendingLabel={t.signin.submitting} />
    </form>
  );
}
