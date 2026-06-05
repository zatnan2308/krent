import type { PropertyChannelLink } from "./queries";

/**
 * Кнопки «написать про объект» в подключённых мессенджерах для публичной
 * страницы объекта. Чисто презентационные — editorial-стиль страницы.
 */
export function PropertyChannelLinks({
  links,
}: {
  links: PropertyChannelLink[];
}) {
  if (links.length === 0) {
    return null;
  }
  return (
    <div
      style={{
        marginTop: 18,
        display: "flex",
        flexWrap: "wrap",
        gap: 10,
      }}
    >
      {links.map((link) => (
        <a
          key={link.channel}
          href={link.url}
          target="_blank"
          rel="noreferrer"
          className="btn btn-ghost"
          style={{ padding: "12px 18px", fontSize: 13 }}
        >
          {link.label} <span className="arrow">→</span>
        </a>
      ))}
    </div>
  );
}
