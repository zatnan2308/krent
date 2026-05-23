import { createBrowserClient } from "@supabase/ssr";

import { getClientEnv } from "@/lib/env";
import type { Database } from "@/types/database";

/**
 * Supabase-клиент для клиентских компонентов (браузер).
 * Использует anon-ключ, поэтому к каждому запросу применяется RLS.
 */
export function createClient() {
  const env = getClientEnv();
  return createBrowserClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
