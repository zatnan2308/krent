import { createAdminClient } from "@/lib/supabase/server";

/**
 * Резолвит отображаемые имена пользователей по id через сервис-клиент.
 * Профильной таблицы пока нет — имя берётся из user_metadata либо email.
 * Любая ошибка проглатывается: вызывающий код работает и без имён.
 */
export async function resolveUserNames(
  userIds: string[],
): Promise<Map<string, string>> {
  const names = new Map<string, string>();
  const unique = [...new Set(userIds)];
  if (unique.length === 0) {
    return names;
  }
  try {
    const admin = createAdminClient();
    await Promise.all(
      unique.map(async (id) => {
        const { data } = await admin.auth.admin.getUserById(id);
        const user = data.user;
        if (!user) {
          return;
        }
        const meta = user.user_metadata ?? {};
        const metaName =
          (typeof meta.full_name === "string" && meta.full_name.trim()) ||
          (typeof meta.name === "string" && meta.name.trim()) ||
          "";
        const emailName = user.email ? (user.email.split("@")[0] ?? "") : "";
        const finalName = metaName || emailName;
        if (finalName) {
          names.set(id, finalName);
        }
      }),
    );
  } catch {
    // Сервис-клиент недоступен — продолжаем без имён.
  }
  return names;
}
