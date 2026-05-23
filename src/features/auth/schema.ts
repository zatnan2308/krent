import { z } from "zod";

/** Схема формы входа. */
export const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

export type LoginInput = z.infer<typeof loginSchema>;

/** Состояние формы аутентификации (для useFormState). */
export interface AuthFormState {
  error: string | null;
}
