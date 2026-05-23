import { MapPin } from "lucide-react";

interface PropertyMapProps {
  latitude: number;
  longitude: number;
  /** true — точная геопозиция с маркером; false — приблизительная зона. */
  precise: boolean;
  label: string;
}

/**
 * Секция с картой объекта на основе OpenStreetMap (iframe, без API-ключа).
 * Для приблизительного режима маркер не ставится и берётся более широкая зона.
 */
export function PropertyMap({
  latitude,
  longitude,
  precise,
  label,
}: PropertyMapProps) {
  const delta = precise ? 0.004 : 0.02;
  const bbox = [
    longitude - delta,
    latitude - delta,
    longitude + delta,
    latitude + delta,
  ].join(",");
  const src = precise
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${latitude},${longitude}`
    : `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik`;

  return (
    <div className="space-y-2">
      <div className="overflow-hidden rounded-lg border">
        <iframe
          src={src}
          title="Property location map"
          loading="lazy"
          className="h-72 w-full"
        />
      </div>
      <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <MapPin className="h-4 w-4 shrink-0" />
        {label}
      </p>
    </div>
  );
}
