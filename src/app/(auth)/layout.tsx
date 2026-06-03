import type { ReactNode } from "react";

/** Auth-страницы используют собственный полноэкранный split-screen (AuthShell),
 *  поэтому здесь только editorial-скоуп токенов + фон. */
export default function AuthGroupLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className="editorial"
      style={{ minHeight: "100vh", background: "var(--bg-primary)" }}
    >
      <div className="grain" />
      {children}
    </div>
  );
}
