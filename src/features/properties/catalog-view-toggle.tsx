"use client";

import * as React from "react";
import { LayoutGrid, MapPin } from "lucide-react";

import { Button } from "@/components/ui/button";

interface Props {
  active: "list" | "map";
  onChange: (next: "list" | "map") => void;
}

export function CatalogViewToggle({ active, onChange }: Props) {
  return (
    <div className="flex items-center gap-1 rounded-md border bg-background p-1">
      <Button
        type="button"
        variant={active === "list" ? "default" : "ghost"}
        size="sm"
        className="h-7 px-2"
        onClick={() => onChange("list")}
      >
        <LayoutGrid className="mr-1 h-3.5 w-3.5" />
        List
      </Button>
      <Button
        type="button"
        variant={active === "map" ? "default" : "ghost"}
        size="sm"
        className="h-7 px-2"
        onClick={() => onChange("map")}
      >
        <MapPin className="mr-1 h-3.5 w-3.5" />
        Map
      </Button>
    </div>
  );
}
