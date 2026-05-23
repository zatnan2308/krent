"use client";

import * as React from "react";

import { track } from "./track";

/** Маленький клиентский компонент: фиксирует property_view один раз. */
export function TrackPropertyView({ propertyId }: { propertyId: string }) {
  React.useEffect(() => {
    track("property_view", {
      entityType: "property",
      entityId: propertyId,
    });
  }, [propertyId]);
  return null;
}
