"use client";

import * as React from "react";
import { Bell } from "lucide-react";

import {
  getNotificationsLastSeen,
  markNotificationsSeen,
} from "@/features/notifications/bell-actions";
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

/** Человекочитаемые ярлыки типов уведомлений. */
const EVENT_LABELS: Record<string, string> = {
  "lead.created": "New lead",
  "booking.created": "New booking",
  "booking.requested": "Booking request",
  "booking.confirmed": "Booking confirmed",
  "booking.cancelled": "Booking cancelled",
  "payment.received": "Payment received",
  "chat.message": "New message",
  "contact.confirmation": "Contact enquiry",
  "showing.confirmation": "Viewing request",
  "valuation.confirmation": "Valuation request",
  "portal.invited": "Portal invite sent",
  "task.reminder": "Task reminder",
  welcome: "Welcome email",
};

function labelFor(eventType: string): string {
  return EVENT_LABELS[eventType] ?? eventType.replace(/[._]/g, " ");
}

export function NotificationsBell({ items }: { items: NotificationItem[] }) {
  const [lastSeen, setLastSeen] = React.useState<string | null>(null);

  // Серверная отметка просмотра (кросс-девайс, вместо localStorage).
  React.useEffect(() => {
    let active = true;
    getNotificationsLastSeen()
      .then((value) => {
        if (active) setLastSeen(value);
      })
      .catch(() => {
        // Недоступно — считаем всё непрочитанным.
      });
    return () => {
      active = false;
    };
  }, []);

  const unread = lastSeen
    ? items.filter((item) => item.createdAt > lastSeen).length
    : items.length;

  function markSeen() {
    // Оптимистично гасим бейдж, затем фиксируем на сервере.
    setLastSeen(new Date().toISOString());
    void markNotificationsSeen();
  }

  return (
    <Dropdown
      onOpenChange={(open) => {
        if (open) markSeen();
      }}
    >
      <DropdownTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Notifications"
          className="relative"
        >
          <Bell className="h-5 w-5" />
          {unread > 0 ? (
            <span className="absolute -right-0.5 -top-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-medium leading-none text-destructive-foreground">
              {unread}
            </span>
          ) : null}
        </Button>
      </DropdownTrigger>
      <DropdownContent align="end" className="w-80">
        <DropdownLabel className="font-medium">
          Recent notifications
        </DropdownLabel>
        <DropdownSeparator />
        {items.length === 0 ? (
          <p className="p-3 text-xs text-muted-foreground">
            No notifications yet.
          </p>
        ) : (
          <ul className="max-h-80 overflow-y-auto">
            {items.map((item) => {
              const isUnread = !lastSeen || item.createdAt > lastSeen;
              return (
                <li
                  key={item.id}
                  className={`border-b px-3 py-2 text-xs last:border-0 ${
                    isUnread ? "bg-accent/40" : ""
                  }`}
                >
                  <p className="font-medium capitalize">
                    {labelFor(item.eventType)}
                  </p>
                  <p className="text-muted-foreground">
                    → {item.recipient} · {item.status}
                  </p>
                  <p className="text-muted-foreground">
                    {new Date(item.createdAt).toLocaleString()}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </DropdownContent>
    </Dropdown>
  );
}
