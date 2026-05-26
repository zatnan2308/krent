import type { User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";

import { ROUTES } from "@/lib/constants/routes";
import { createClient } from "@/lib/supabase/server";

/** Текущий аутентифицированный пользователь Supabase Auth или null.
 *  Использовать только там, где нужна доверенная проверка (dashboard,
 *  server actions). Делает запрос к Supabase Auth для верификации JWT. */
export async function getCurrentUser(): Promise<User | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/** Быстрая проверка сессии: читает JWT из cookie без API-вызова.
 *  Подходит для публичного header'а (показать имя + ссылки), не подходит
 *  для авторизации защищённых страниц. */
export async function getCurrentUserShallow(): Promise<User | null> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.user ?? null;
}

/** Текущий пользователь; редирект на /login, если не аутентифицирован. */
export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) {
    redirect(ROUTES.auth.signIn);
  }
  return user;
}
