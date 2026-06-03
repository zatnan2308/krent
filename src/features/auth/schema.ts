import { z } from "zod";

/** Схема формы входа. */
export const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});
export type LoginInput = z.infer<typeof loginSchema>;

/** Схема регистрации (новый дизайн: телефон опционален, без подтверждения —
 *  опечатку ловит переключатель «показать пароль»). */
export const signUpSchema = z.object({
  fullName: z.string().trim().min(1).max(200),
  email: z.email(),
  password: z.string().min(8).max(72),
  phone: z.string().trim().max(40).optional(),
});
export type SignUpInput = z.infer<typeof signUpSchema>;

/** Запрос на сброс пароля. */
export const forgotPasswordSchema = z.object({
  email: z.email(),
});

/** Установка нового пароля. */
export const resetPasswordSchema = z
  .object({
    password: z.string().min(8).max(72),
    confirmPassword: z.string().min(8).max(72),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

/** Состояние формы аутентификации (для useFormState). */
export interface AuthFormState {
  error: string | null;
  success?: string | null;
}
