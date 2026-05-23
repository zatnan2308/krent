/** @type {import('next').NextConfig} */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: {
    // Загрузка медиа объектов и вложений чата идёт через server actions —
    // поднимаем лимит тела запроса (видео в чате — до 100MB).
    serverActions: {
      bodySizeLimit: "110mb",
    },
  },
  images: {
    // Хост Supabase Storage берётся из публичного URL, если он задан.
    remotePatterns: supabaseUrl
      ? [
          {
            protocol: "https",
            hostname: new URL(supabaseUrl).hostname,
            pathname: "/storage/v1/object/**",
          },
        ]
      : [],
  },
};

export default nextConfig;
