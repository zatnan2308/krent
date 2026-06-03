import { LegalBody } from "@/features/legal/legal-document";

/** Editorial-обёртка юридической страницы: eyebrow + заголовок + тело. */
export function LegalPageView({
  eyebrow,
  title,
  body,
}: {
  eyebrow: string;
  title: string;
  body: string;
}) {
  return (
    <main style={{ background: "var(--bg-primary)" }}>
      <section
        style={{ paddingTop: 130, paddingBottom: "clamp(64px, 8vw, 110px)" }}
      >
        <div
          style={{
            maxWidth: "var(--max-w)",
            margin: "0 auto",
            padding: "0 var(--edge-d)",
          }}
        >
          <div style={{ maxWidth: 820 }}>
            <span className="eyebrow gold">
              <span className="dot" />
              {eyebrow}
            </span>
            <h1
              className="serif"
              style={{
                fontSize: "clamp(2.25rem, 5vw, 3.75rem)",
                letterSpacing: "-0.04em",
                marginTop: 18,
                lineHeight: 1,
                fontWeight: 400,
              }}
            >
              {title}
            </h1>
            <div style={{ marginTop: 32 }}>
              <LegalBody body={body} />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
