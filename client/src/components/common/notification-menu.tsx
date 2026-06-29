"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
  Bell,
  ChatCircle,
  CheckCircle,
  MicrophoneStage,
  Radio,
} from "@phosphor-icons/react/ssr";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type NotificationKind = "room" | "invite" | "speaker" | "system";

type NotificationItem = {
  id: string;
  title: string;
  description: string;
  time: string;
  kind: NotificationKind;
  unread?: boolean;
};

const notifications: NotificationItem[] = [
  {
    id: "room-live",
    title: "Room is live",
    description: "The Future of AI in Everyday Life is active now.",
    time: "now",
    kind: "room",
    unread: true,
  },
  {
    id: "invite-priya",
    title: "New room invite",
    description: "Priya Shah invited you to join a live room.",
    time: "4m",
    kind: "invite",
    unread: true,
  },
  {
    id: "speaker-approved",
    title: "Speaker request approved",
    description: "You can go on stage when you are ready.",
    time: "18m",
    kind: "speaker",
  },
  {
    id: "recording-ready",
    title: "Recording is ready",
    description: "Session recording has finished processing.",
    time: "1h",
    kind: "system",
  },
];

const notificationIcon = {
  room: Radio,
  invite: ChatCircle,
  speaker: MicrophoneStage,
  system: CheckCircle,
};

const notificationTone = {
  room: "bg-[#6684FF]/12 text-[#6684FF]",
  invite: "bg-chart-3/12 text-chart-3",
  speaker: "bg-emerald-500/12 text-emerald-500",
  system: "bg-muted text-muted-foreground",
};

export function NotificationMenu() {
  const unreadNotifications = notifications.filter((notification) => notification.unread);
  const earlierNotifications = notifications.filter((notification) => !notification.unread);
  const unreadCount = unreadNotifications.length;

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <span className="relative inline-flex">
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 bg-transparent hover:bg-transparent"
            aria-label="Open notifications"
          >
            <Bell className="h-4 w-4" />
          </Button>
          {unreadCount > 0 ? (
            <Badge
              variant="destructive"
              className="absolute -right-1 -top-1 min-w-5 border border-background px-1 py-0 text-[10px] font-bold"
            >
              {unreadCount}
            </Badge>
          ) : null}
        </span>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={10}
          className="z-50 w-[360px] overflow-hidden rounded-[16px] border border-border bg-card p-0 shadow-2xl"
        >
          <div className="border-b border-border bg-muted/35 px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-extrabold text-foreground">Notifications</p>
                <p className="mt-0.5 text-[11px] font-medium text-muted-foreground">
                  {unreadCount} unread update{unreadCount === 1 ? "" : "s"}
                </p>
              </div>
              <span className="rounded-full border border-primary/25 bg-primary/10 px-2 py-1 text-[10px] font-black text-primary">
                Live room
              </span>
            </div>
          </div>

          <div className="max-h-[390px] overflow-y-auto p-2">
            <NotificationSection title="New" items={unreadNotifications} />
            <NotificationSection title="Earlier" items={earlierNotifications} />
          </div>

          <div className="border-t border-border bg-background/60 p-2">
            <button className="flex w-full items-center justify-center rounded-[10px] px-3 py-2 text-xs font-bold text-primary transition hover:bg-muted">
              View notification center
            </button>
          </div>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

function NotificationSection({ title, items }: { title: string; items: NotificationItem[] }) {
  if (items.length === 0) {
    return null;
  }

  return (
    <section className="mb-2 last:mb-0">
      <p className="px-2 pb-1 pt-2 text-[10px] font-black uppercase tracking-[0.12em] text-muted-foreground">
        {title}
      </p>
      <div className="space-y-1">
        {items.map((notification) => (
          <NotificationRow key={notification.id} notification={notification} />
        ))}
      </div>
    </section>
  );
}

function NotificationRow({ notification }: { notification: NotificationItem }) {
  const Icon = notificationIcon[notification.kind];

  return (
    <DropdownMenu.Item className="list-none outline-none" asChild>
      <button className="group grid w-full grid-cols-[4px_36px_minmax(0,1fr)] gap-3 rounded-[12px] p-2 text-left transition hover:bg-muted">
        <span
          className={cn(
            "mt-1 h-[calc(100%-0.5rem)] rounded-full",
            notification.unread ? "bg-primary" : "bg-border",
          )}
        />
        <span
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-[10px]",
            notificationTone[notification.kind],
          )}
        >
          <Icon className="h-4 w-4" />
        </span>
        <span className="min-w-0">
          <span className="flex items-start justify-between gap-3">
            <span className="truncate text-sm font-bold text-foreground">
              {notification.title}
            </span>
            <span className="shrink-0 text-[10px] font-semibold text-muted-foreground">
              {notification.time}
            </span>
          </span>
          <span className="mt-0.5 line-clamp-2 text-[11px] leading-4 text-muted-foreground">
            {notification.description}
          </span>
        </span>
      </button>
    </DropdownMenu.Item>
  );
}
