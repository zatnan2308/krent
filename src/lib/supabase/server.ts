import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

import { getClientEnv, getServerEnv } from "@/lib/env";
import type { Database } from "@/types/database";

/**
 * Supabase-клиент для серверных компонентов, route handlers и server actions.
 * Использует anon-ключ и cookies запроса, поэтому применяется RLS.
 */
export function createClient() {
  const env = getClientEnv();
  const cookieStore = cookies();

  return createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // `setAll` вызван из серверного компонента, где хранилище cookies
            // доступно только для чтения. Безопасно игнорировать — сессию
            // обновляет middleware.
          }
        },
      },
    },
  );
}

/**
 * Привилегированный Supabase-клиент с service-role ключом.
 * Обходит RLS — использовать только в доверенном серверном коде и никогда
 * не передавать его «сырые» результаты недоверенным вызывающим сторонам.
 */
export function createAdminClient() {
  const env = getClientEnv();
  return createSupabaseClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    getServerEnv().SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );
}
