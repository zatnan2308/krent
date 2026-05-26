"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { ensureUserHasOrganization } from "@/features/auth/ensure-organization";
import {
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
  signUpSchema,
  type AuthFormState,
} from "@/features/auth/schema";
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
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return { error: "Invalid email or password." };
  }

  // На случай если пользователь подтвердил email после signUp (нет сессии при
  // signUp) — создаём ему организацию здесь при первом входе. Идемпотентно.
  if (data.user) {
    try {
      const meta = (data.user.user_metadata ?? {}) as Record<string, unknown>;
      await ensureUserHasOrganization({
        userId: data.user.id,
        fullName:
          (typeof meta.full_name === "string" && meta.full_name) ||
          (typeof meta.name === "string" && meta.name) ||
          (data.user.email ?? "").split("@")[0] ||
          "",
        email: data.user.email ?? "",
      });
    } catch {
      // Не блокируем вход — пользователь увидит свой dashboard без orga
      // и сможет позвать админа / попробовать снова.
    }
  }

  redirect(resolveRedirect(formData.get("redirectTo")));
}

/** Выход из системы. */
export async function signOut(): Promise<void> {
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect(ROUTES.auth.signIn);
}

/** URL текущего origin'а — нужен для redirect ссылок в письмах. */
function getOrigin(): string {
  const host = headers().get("host");
  if (!host) return "";
  const proto = headers().get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}`;
}

/**
 * Регистрация по email + password. Supabase сам отправит письмо с
 * подтверждением, если включён email-confirmation в Auth settings.
 * После успешного signUp пользователь может попасть в dashboard сразу,
 * если confirmations отключены, либо ждёт письма.
 */
export async function signUp(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = signUpSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { error: issue?.message ?? "Please check the form." };
  }

  const supabase = createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName },
      emailRedirectTo: `${getOrigin()}${ROUTES.auth.signIn}?confirmed=1`,
    },
  });
  if (error) {
    return { error: error.message };
  }

  // Если confirmation не требуется, Supabase сразу выдаёт сессию.
  if (data.session && data.user) {
    // Заводим организацию + членство org_owner до первого захода в dashboard.
    try {
      await ensureUserHasOrganization({
        userId: data.user.id,
        fullName: parsed.data.fullName,
        email: parsed.data.email,
      });
    } catch (err) {
      return {
        error:
          err instanceof Error
            ? err.message
            : "Account created, but workspace setup failed. Try signing in.",
      };
    }
    redirect(ROUTES.dashboard.root);
  }
  return {
    error: null,
    success:
      "Check your email — we sent a confirmation link. Open it to finish registration.",
  };
}

/** Запрос ссылки на сброс пароля. */
export async function requestPasswordReset(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = forgotPasswordSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { error: "Enter a valid email." };
  }
  const supabase = createClient();
  const redirectTo = `${getOrigin()}${ROUTES.auth.resetPassword}`;
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo,
  });
  if (error) {
    return { error: "Could not send reset link. Try again later." };
  }
  return {
    error: null,
    success:
      "If an account exists for this email, you will receive a reset link shortly.",
  };
}

/** Установка нового пароля (вызов после редиректа из reset-email). */
export async function resetPassword(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = resetPasswordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { error: issue?.message ?? "Please check the form." };
  }
  const supabase = createClient();
  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });
  if (error) {
    return {
      error:
        "Could not update password — the reset link may be expired. Request a new one.",
    };
  }
  redirect(`${ROUTES.auth.signIn}?password_reset=1`);
}
