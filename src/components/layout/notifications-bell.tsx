"use client";

import * as React from "react";
import { Bell } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dropdown,
  DropdownContent,
  DropdownLabel,
  DropdownSeparator,
  DropdownTrigger,
} from "@/components/ui/dropdown";

export interface NotificationItem {
  id: string;
  eventType: string;
  createdAt: string;
  status: string;
  recipient: string;
}

export function NotificationsBell({ items }: { items: NotificationItem[] }) {
  const count = items.length;
  return (
    <Dropdown>
      <DropdownTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Notifications" className="relative">
          <Bell className="h-5 w-5" />
          {count > 0 ? (
            <span className="absolute -right-0.5 -top-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-medium leading-none text-destructive-foreground">
              {count}
            </span>
          ) : null}
        </Button>
      </DropdownTrigger>
      <DropdownContent align="end" className="w-80">
        <DropdownLabel className="font-medium">Recent notifications</DropdownLabel>
        <DropdownSeparator />
        {items.length === 0 ? (
          <p className="p-3 text-xs text-muted-foreground">No notifications yet.</p>
        ) : (
          <ul className="max-h-80 overflow-y-auto">
            {items.map((item) => (
              <li key={item.id} className="border-b px-3 py-2 text-xs last:border-0">
                <p className="font-medium">{item.eventType}</p>
                <p className="text-muted-foreground">
                  → {item.recipient} · {item.status}
                </p>
                <p className="text-muted-foreground">
                  {new Date(item.createdAt).toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
        )}
      </DropdownContent>
    </Dropdown>
  );
}
