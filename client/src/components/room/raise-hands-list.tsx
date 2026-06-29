"use client";

import { HandPalm } from "@phosphor-icons/react/ssr";
import { Avatar } from "@/components/ui/avatar";

type RaiseHandEntry = {
  id: string;
  name: string;
  avatar?: string;
  requestedAt: string;
};

export function RaiseHandsList({
  items,
  isCurrentUserRaised,
}: {
  items: RaiseHandEntry[];
  isCurrentUserRaised: boolean;
}) {
  const visibleItems: RaiseHandEntry[] = isCurrentUserRaised
    ? [
        {
          id: "current-user",
          name: "You",
          avatar: "/brand/wave.svg",
          requestedAt: "Just now",
        },
        ...items,
      ]
    : items;

  if (visibleItems.length === 0) {
    return null;
  }

  return (
    <div className="mb-6 rounded-[12px] border border-border bg-muted/35 p-3">
      <p className="mb-2 text-xs font-extrabold uppercase tracking-[0.12em] text-muted-foreground">
        Raising Hands
      </p>
      <div className="flex flex-wrap gap-2">
        {visibleItems.map((entry) => (
          <div
            key={entry.id}
            className="inline-flex min-w-0 items-center gap-2 rounded-[999px] border border-primary/20 bg-card px-3 py-1"
          >
            <Avatar src={entry.avatar} name={entry.name} size={22} className="shrink-0" />
            <span className="inline-flex min-w-0 items-center gap-2 text-xs font-semibold text-foreground">
              <span className="max-w-[130px] truncate">{entry.name}</span>
              <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                <HandPalm className="h-3 w-3 text-chart-3" />
                {entry.requestedAt}
              </span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

