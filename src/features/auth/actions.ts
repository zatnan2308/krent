"use server";

import { redirect } from "next/navigation";

import { loginSchema, type AuthFormState } from "@/features/auth/schema";
import { ROUTES } from "@/lib/constants/routes";
import { createClient } from "@/lib/supabase/server";

/** Возвращает безопасный путь редиректа (только внутренние относительные URL). */
function resolveRedirect(value: FormDataEntryValue | null): string {
  if (
    typeof value === "string" &&
    value.startsWith("/") &&
    !value.startsWith("//")
  ) {
    return value;
  }
  return ROUTES.dashboard.root;
}

/** Вход по email и паролю. Используется через useFormState. */
export async function signIn(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: "Enter a valid email and password." };
  }

  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return { error: "Invalid email or password." };
  }

  redirect(resolveRedirect(formData.get("redirectTo")));
}

/** Выход из системы. */
export async function signOut(): Promise<void> {
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect(ROUTES.auth.signIn);
}
