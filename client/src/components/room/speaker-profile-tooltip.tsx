"use client";

import {
  Microphone as Mic,
  Radio,
  UserCircleCheck as UserRoundCheck,
  UsersThree as UsersRound,
} from "@phosphor-icons/react/ssr";
import type { ReactElement } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { Person } from "@/types/wavecast";

const speakerStats: Record<
  string,
  { speaking: string; followers: string; sessions: string; bio: string }
> = {
  user_alice: {
    speaking: "23m live",
    followers: "18.4K",
    sessions: "42 rooms",
    bio: "Host and AI product strategist guiding the room discussion.",
  },
  user_brian: {
    speaking: "16m live",
    followers: "9.8K",
    sessions: "27 rooms",
    bio: "Builder focused on practical AI workflows and startup adoption.",
  },
  user_carol: {
    speaking: "11m live",
    followers: "12.1K",
    sessions: "31 rooms",
    bio: "Research voice covering consumer AI trends and product behavior.",
  },
};

export function SpeakerProfileTooltip({
  speaker,
  isRoomCreator,
  children,
}: {
  speaker: Person;
  isRoomCreator?: boolean;
  children: ReactElement;
}) {
  const stats = speakerStats[speaker.id] ?? {
    speaking: "Live now",
    followers: "4.2K",
    sessions: "12 rooms",
    bio: "Speaker in this live WaveCast room.",
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent
        side="top"
        align="center"
        sideOffset={12}
        hideArrow
        className="w-[292px] max-w-[292px] flex-col items-stretch gap-0 rounded-2xl border border-border bg-gradient-to-br from-muted/60 to-card p-0 text-popover-foreground shadow-2xl"
      >
        <div className="flex items-start gap-3 p-4">
          <Avatar src={speaker.avatar} name={speaker.name} size={52} online={speaker.online} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="truncate text-sm font-extrabold text-foreground">{speaker.name}</h3>
              {isRoomCreator ? (
                <Badge tone="brand" className="h-5 rounded-full px-2 text-[10px] font-extrabold">
                  Admin
                </Badge>
              ) : null}
            </div>
            <p className="mt-0.5 truncate text-xs font-medium text-muted-foreground">
              @{speaker.username}
            </p>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{stats.bio}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 border-t border-border">
          <div className="px-3 py-3">
            <Mic className="mb-1 h-3.5 w-3.5 text-primary" />
            <p className="text-[11px] font-bold text-foreground">{stats.speaking}</p>
            <p className="text-[10px] text-muted-foreground">Speaking</p>
          </div>
          <div className="border-x border-border px-3 py-3">
            <UsersRound className="mb-1 h-3.5 w-3.5 text-primary" />
            <p className="text-[11px] font-bold text-foreground">{stats.followers}</p>
            <p className="text-[10px] text-muted-foreground">Followers</p>
          </div>
          <div className="px-3 py-3">
            <Radio className="mb-1 h-3.5 w-3.5 text-primary" />
            <p className="text-[11px] font-bold text-foreground">{stats.sessions}</p>
            <p className="text-[10px] text-muted-foreground">Sessions</p>
          </div>
        </div>

        <div className="flex items-center gap-2 border-t border-border px-4 py-3 text-[11px] font-semibold text-muted-foreground">
          <UserRoundCheck className="h-3.5 w-3.5 text-primary" />
          {speaker.online ? "Online and currently on stage" : "Recently active"}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
