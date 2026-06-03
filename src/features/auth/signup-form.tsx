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

const initialState: AuthFormState = { error: null, success: null };

export function SignUpForm() {
  const [state, formAction] = useFormState(signUp, initialState);
  return (
    <form
      action={formAction}
      style={{ display: "flex", flexDirection: "column", gap: 18 }}
    >
      <AuthField
        label="Full name"
        name="fullName"
        placeholder="Your name"
        autoComplete="name"
        required
      />
      <AuthField
        label="Email"
        name="email"
        type="email"
        placeholder="you@example.com"
        autoComplete="email"
        required
      />
      <AuthField
        label="Phone"
        name="phone"
        type="tel"
        placeholder="+971 ..."
        autoComplete="tel"
      />
      <AuthPasswordField
        label="Password"
        name="password"
        placeholder="Create a password"
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
          I agree to the{" "}
          <a href="#" style={{ color: "var(--accent)" }}>
            Terms
          </a>{" "}
          and{" "}
          <a href="#" style={{ color: "var(--accent)" }}>
            Privacy Policy
          </a>
          .
        </span>
      </label>

      {state.error ? <AuthNote variant="error">{state.error}</AuthNote> : null}
      {state.success ? (
        <AuthNote variant="success">{state.success}</AuthNote>
      ) : null}

      <AuthSubmit label="Create account" pendingLabel="Creating account…" />
    </form>
  );
}
