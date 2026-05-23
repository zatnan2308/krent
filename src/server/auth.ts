import type { User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";

import { ROUTES } from "@/lib/constants/routes";
import { createClient } from "@/lib/supabase/server";

/** Текущий аутентифицированный пользователь Supabase Auth или null. */
export async function getCurrentUser(): Promise<User | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/** Текущий пользователь; редирект на /login, если не аутентифицирован. */
export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) {
    redirect(ROUTES.auth.signIn);
  }
  return user;
}
