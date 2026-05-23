"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";

const COOKIE_NAME = "krent_cookie_consent";

export function CookieBanner() {
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    if (typeof document === "undefined") return;
    const has = document.cookie.split(";").some((c) => c.trim().startsWith(`${COOKIE_NAME}=`));
    if (!has) setVisible(true);
  }, []);

  function accept(level: "all" | "essential") {
    if (typeof document === "undefined") return;
    const value = encodeURIComponent(level);
    const oneYear = 60 * 60 * 24 * 365;
    document.cookie = `${COOKIE_NAME}=${value}; Path=/; Max-Age=${oneYear}; SameSite=Lax`;
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-x-3 bottom-3 z-40 mx-auto max-w-2xl rounded-lg border bg-background p-4 shadow-lg sm:inset-x-auto sm:right-3">
      <p className="text-sm">
        We use cookies to make the site work and, optionally, to measure
        traffic. You can change your choice anytime.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={() => accept("all")}>
          Accept all
        </Button>
        <Button size="sm" variant="outline" onClick={() => accept("essential")}>
          Essential only
        </Button>
      </div>
    </div>
  );
}
