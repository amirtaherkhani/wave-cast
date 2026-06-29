"use client";

import Link from "next/link";
import { useMemo, useState, type ComponentType } from "react";
import {
  ArrowRight,
  Bell,
  BookmarkSimple,
  Calendar,
  ChartBar,
  Clock,
  Info,
  Play,
  Power,
  Radio,
  Record,
  Trash,
  UsersThree,
} from "@phosphor-icons/react/ssr";

import { TopBar } from "@/components/common/top-bar";
import { AvatarStack } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { alex, people, realtimeEvents, recordings, reports, rooms } from "@/features/wavecast/mock-data";
import { cn } from "@/lib/utils";
import { useRoomReminderStore } from "@/stores/room-reminder-store";
import type { Room } from "@/types/wavecast";

type AgendaKind = "mine" | "market" | "reminder";

type AgendaRoom = Room & {
  agendaKind: AgendaKind;
  accent: string;
  note: string;
  backendActions: string[];
  priority: "Now" | "Today" | "Soon" | "Saved";
};

const roomActions = {
  mine: ["GET /v1/rooms/{roomId}", "POST /v1/rooms/{roomId}/start", "POST /v1/rooms/{roomId}/finish", "GET /v1/rooms/{roomId}/report"],
  market: ["GET /v1/rooms/{roomId}", "POST /v1/rooms/{roomId}/join", "POST /v1/rooms/{roomId}/leave", "GET /v1/rooms/{roomId}/active-counts"],
  reminder: ["GET /v1/rooms/{roomId}", "POST /v1/rooms/{roomId}/join", "GET /v1/rooms/{roomId}/recordings", "POST /v1/rooms/{roomId}/report/generate"],
};

const agendaSeed: AgendaRoom[] = [
  {
    ...rooms[0],
    agendaKind: "mine",
    accent: "from-[#6684FF]/22 via-sky-400/10 to-emerald-400/10",
    note: "Host controls, speaker queue, recording, and room finish actions are available.",
    backendActions: roomActions.mine,
    priority: "Now",
  },
  {
    ...rooms[1],
    agendaKind: "mine",
    status: "scheduled",
    owner: alex,
    accent: "from-emerald-400/20 via-teal-400/10 to-[#6684FF]/10",
    note: "Draft the run-of-show, start the room, or open the room object.",
    backendActions: roomActions.mine,
    priority: "Today",
  },
  {
    ...rooms[2],
    agendaKind: "market",
    owner: people[0],
    accent: "from-amber-300/20 via-orange-400/10 to-rose-400/10",
    note: "Public market room with live audience signals and join/leave actions.",
    backendActions: roomActions.market,
    priority: "Now",
  },
  {
    ...rooms[8],
    agendaKind: "market",
    owner: people[11],
    accent: "from-cyan-300/20 via-[#6684FF]/10 to-indigo-400/10",
    note: "Finished market session with report and recording follow-up.",
    backendActions: roomActions.reminder,
    priority: "Saved",
  },
  {
    ...rooms[3],
    agendaKind: "reminder",
    owner: people[6],
    accent: "from-pink-300/20 via-rose-400/10 to-amber-300/10",
    note: "Reminder set for later today. Join when it opens.",
    backendActions: roomActions.reminder,
    priority: "Soon",
  },
  {
    ...rooms[5],
    agendaKind: "reminder",
    owner: people[2],
    accent: "from-lime-300/20 via-emerald-400/10 to-cyan-300/10",
    note: "Saved learning room with recording/report actions after the session.",
    backendActions: roomActions.reminder,
    priority: "Soon",
  },
];

const agendaTabs = [
  { value: "all", label: "My Rooms", icon: Calendar },
  { value: "mine", label: "My rooms", icon: Radio },
  { value: "market", label: "Market", icon: BookmarkSimple },
  { value: "reminder", label: "Reminders", icon: Bell },
] as const;

const statCards = [
  { label: "Owned", value: "2", icon: Radio, tone: "bg-primary/10 text-primary" },
  { label: "Market", value: "2", icon: BookmarkSimple, tone: "bg-chart-5/10 text-chart-5" },
  { label: "Reminders", value: "2", icon: Bell, tone: "bg-chart-3/10 text-chart-3" },
  { label: "Reports", value: "4", icon: ChartBar, tone: "bg-emerald-500/10 text-emerald-500" },
];

const reminderAccentByIndex = [
  "from-pink-300/20 via-rose-400/10 to-amber-300/10",
  "from-lime-300/20 via-emerald-400/10 to-cyan-300/10",
  "from-emerald-400/20 via-teal-400/10 to-[#6684FF]/10",
  "from-amber-300/20 via-orange-400/10 to-rose-400/10",
];

const toReminderAgendaRoom = (item: Room, index: number): AgendaRoom => ({
  ...item,
  agendaKind: "reminder",
  accent: reminderAccentByIndex[index % reminderAccentByIndex.length],
  note: "Reminder set from the upcoming list. Join when the room opens.",
  backendActions: roomActions.reminder,
  priority: "Soon",
});

const roomStateGradients = {
  reminder: "from-amber-200/35 via-rose-300/18 to-pink-300/16",
  live: "from-sky-200/40 via-cyan-100/28 to-blue-50/24 dark:from-sky-400/18 dark:via-cyan-300/12 dark:to-blue-300/10",
  offline: "from-zinc-200/50 via-slate-200/24 to-transparent dark:from-slate-700/35 dark:via-slate-800/20 dark:to-transparent",
};

const getRoomStateGradient = (room: AgendaRoom) => {
  if (room.agendaKind === "reminder") {
    return roomStateGradients.reminder;
  }

  if (room.status === "live") {
    return roomStateGradients.live;
  }

  return roomStateGradients.offline;
};

const sameRoomName = (left: string, right: string) => {
  const normalizedLeft = left.toLowerCase();
  const normalizedRight = right.toLowerCase();

  return normalizedLeft.includes(normalizedRight) || normalizedRight.includes(normalizedLeft);
};

export default function MyRoomPage() {
  const remindedRoomIds = useRoomReminderStore((state) => state.remindedRoomIds);
  const removeReminder = useRoomReminderStore((state) => state.removeReminder);
  const reminderRooms = useMemo(
    () =>
      remindedRoomIds
        .map((roomId, index) => {
          const item = rooms.find((candidate) => candidate.id === roomId);

          return item ? toReminderAgendaRoom(item, index) : null;
        })
        .filter((item): item is AgendaRoom => Boolean(item)),
    [remindedRoomIds],
  );
  const [removedRoomIds, setRemovedRoomIds] = useState<Set<string>>(new Set());
  const [finishedRoomIds, setFinishedRoomIds] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState("all");
  const [selectedRoomId, setSelectedRoomId] = useState(agendaSeed[0]?.id ?? "");
  const agendaRooms = useMemo(() => {
    const merged = [...agendaSeed, ...reminderRooms];
    const uniqueRooms = new Map<string, AgendaRoom>();

    merged.forEach((roomItem) => {
      if (!removedRoomIds.has(roomItem.id)) {
        const item = finishedRoomIds.has(roomItem.id)
          ? {
              ...roomItem,
              status: "finished" as const,
              hlsStatus: "Off" as const,
              recording: false,
              priority: "Saved" as const,
              note: "Room finished. You can review the report or remove it from your list.",
            }
          : roomItem;

        uniqueRooms.set(item.id, item);
      }
    });

    return Array.from(uniqueRooms.values());
  }, [finishedRoomIds, reminderRooms, removedRoomIds]);

  const visibleRooms = useMemo(
    () =>
      activeTab === "all"
        ? agendaRooms
        : agendaRooms.filter((item) => item.agendaKind === activeTab),
    [activeTab, agendaRooms],
  );

  const selectedRoom =
    agendaRooms.find((item) => item.id === selectedRoomId) ?? visibleRooms[0] ?? agendaRooms[0];

  const removeRoom = (roomId: string) => {
    removeReminder(roomId);
    setRemovedRoomIds((current) => new Set(current).add(roomId));
    if (selectedRoomId === roomId) {
      setSelectedRoomId((agendaRooms.find((item) => item.id !== roomId) ?? agendaRooms[0])?.id ?? "");
    }
  };

  const finishRoom = (roomId: string) => {
    setFinishedRoomIds((current) => new Set(current).add(roomId));
  };

  return (
    <div className="min-h-screen bg-card text-foreground">
      <TopBar />
      <main className="mx-auto flex w-full max-w-[1440px] flex-col gap-5 px-5 py-6">
        <section className="overflow-hidden rounded-[20px] border border-sky-200/35 bg-background shadow-[0_18px_55px_rgba(14,165,233,0.12)] dark:border-sky-400/10 dark:shadow-[0_18px_55px_rgba(56,189,248,0.08)]">
          <div className="bg-gradient-to-br from-sky-200/22 via-cyan-100/16 to-blue-50/12 p-5 dark:from-sky-400/12 dark:via-cyan-300/8 dark:to-blue-300/6">
            <div className="flex min-w-0 flex-col justify-between gap-5">
              <div>
                <Badge variant="brand" className="mb-3 h-6 rounded-[8px] px-2.5 text-[11px] font-black">
                  Brian Miller workspace
                </Badge>
                <h1 className="max-w-3xl text-3xl font-black leading-tight text-foreground">
                  My Rooms
                </h1>
                <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-muted-foreground">
                  Manage hosted rooms, discover market rooms, and keep reminders in one operational board.
                </p>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                {statCards.map((item) => (
                  <StatPill key={item.label} {...item} />
                ))}
              </div>
            </div>
          </div>
        </section>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="min-h-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <TabsList className="h-12 rounded-[12px] bg-muted/70 p-1.5">
              {agendaTabs.map(({ value, label, icon: Icon }) => (
                <TabsTrigger key={value} value={value} className="h-9 rounded-[9px] px-5">
                  <Icon className="h-4 w-4" />
                  {label}
                </TabsTrigger>
              ))}
            </TabsList>
            <Button asChild variant="soft" className="h-9 rounded-[10px] px-4">
              <Link href="/">
                <ArrowRight className="h-4 w-4" />
                Open live room
              </Link>
            </Button>
          </div>

          <TabsContent value={activeTab} className="mt-4">
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
              <section className="grid min-w-0 gap-3 lg:grid-cols-2">
                {visibleRooms.map((item) => (
	                  <AgendaCard
                    key={item.id}
                    room={item}
                    selected={selectedRoom?.id === item.id}
                    onSelect={() => setSelectedRoomId(item.id)}
                    onInfo={() => setSelectedRoomId(item.id)}
                    onRemove={() => removeRoom(item.id)}
                    onFinish={() => finishRoom(item.id)}
                  />
                ))}
                {visibleRooms.length === 0 ? (
                  <div className="rounded-[18px] border border-dashed border-border bg-background p-6 text-sm font-semibold text-muted-foreground">
                    No rooms left in this list.
                  </div>
                ) : null}
              </section>

              <RoomInfoPanel room={selectedRoom} onFinish={() => selectedRoom ? finishRoom(selectedRoom.id) : undefined} />
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function StatPill({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  icon: ComponentType<{ className?: string }>;
  tone: string;
}) {
  return (
    <div className="rounded-[14px] border border-border bg-card/80 p-3 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <span className={cn("flex h-9 w-9 items-center justify-center rounded-[12px]", tone)}>
          <Icon className="h-4 w-4" />
        </span>
        <span className="text-xl font-black text-foreground">{value}</span>
      </div>
      <p className="mt-2 text-[11px] font-black uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
    </div>
  );
}

function AgendaCard({
  room,
  selected,
  onInfo,
  onRemove,
  onFinish,
  onSelect,
}: {
  room: AgendaRoom;
  selected: boolean;
  onInfo: () => void;
  onRemove: () => void;
  onFinish: () => void;
  onSelect: () => void;
}) {
  const isLive = room.status === "live";
  const isMyRoom = room.owner.id === alex.id;
  const canFinishActiveRoom = isLive && isMyRoom;
  const isCurrentJoinedRoom = isLive && isMyRoom;
  const roomGradient = getRoomStateGradient(room);

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect();
        }
      }}
      className={cn(
        "group relative cursor-pointer overflow-hidden rounded-[18px] border bg-card p-4 text-left outline-none transition duration-200 hover:-translate-y-0.5 focus-visible:ring-3 focus-visible:ring-primary/25",
        "shadow-sm hover:shadow-xl",
        selected ? "border-primary/50 ring-2 ring-primary/15" : "border-border",
      )}
    >
      <div className={cn("absolute inset-x-0 top-0 h-24 bg-gradient-to-br opacity-90", roomGradient)} />
      <div className="relative">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Badge tone={isLive ? "live" : room.status === "scheduled" ? "warning" : "neutral"} className="rounded-[8px] text-[10px] font-black uppercase">
                {room.status}
              </Badge>
              <span className="rounded-full bg-background/75 px-2 py-1 text-[10px] font-black text-muted-foreground">
                {room.priority}
              </span>
              <span
                className={cn(
                  "rounded-full px-2 py-1 text-[10px] font-black",
                  isMyRoom
                    ? "bg-primary/12 text-primary"
                    : "bg-chart-5/12 text-chart-5",
                )}
              >
                {isMyRoom ? "My room" : "Other host"}
              </span>
            </div>
            <h2 className="line-clamp-2 text-lg font-black leading-tight text-foreground">{room.title}</h2>
            <p className="mt-1 text-xs font-semibold text-muted-foreground">
              {room.topic} • {isMyRoom ? "Owned by you" : `By ${room.owner.name}`}
            </p>
          </div>
          {canFinishActiveRoom ? (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onFinish();
              }}
              className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-emerald-500/12 px-3 text-xs font-black text-emerald-600 shadow-sm transition hover:bg-emerald-500/18"
              aria-label={`Finish ${room.title}`}
            >
              <Power className="h-4 w-4" />
              Finish
            </button>
          ) : (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onRemove();
              }}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-background/80 text-muted-foreground shadow-sm transition hover:bg-destructive/10 hover:text-destructive"
              aria-label={`Remove ${room.title}`}
            >
              <Trash className="h-4 w-4" />
            </button>
          )}
        </div>

        <p className="mb-4 min-h-10 text-sm leading-5 text-muted-foreground">{room.note}</p>

        <div className="mb-4 grid grid-cols-3 gap-2">
          <Metric icon={UsersThree} label="Listeners" value={room.listenerCount.toLocaleString()} />
          <Metric icon={Radio} label="Speakers" value={room.speakerCount.toLocaleString()} />
          <Metric icon={Clock} label="Time" value={room.duration === "-" ? room.startedAt : room.duration} />
        </div>

        <div className="flex items-center justify-between gap-3">
          <AvatarStack people={room.listeners} size={26} max={4} remainder="+18" />
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              className="rounded-[10px]"
              onClick={(event) => {
                event.stopPropagation();
                onInfo();
              }}
            >
              <Info className="h-4 w-4" />
              Info
            </Button>
            {isCurrentJoinedRoom ? (
              <span className="inline-flex h-8 items-center gap-1 rounded-[10px] bg-emerald-500/12 px-3 text-xs font-bold text-emerald-600">
                <Radio className="h-4 w-4" />
                Joined
              </span>
            ) : (
              <Button
                variant={isLive ? "primary" : "soft"}
                size="sm"
                className="rounded-[10px]"
                onClick={(event) => event.stopPropagation()}
              >
                {isLive ? <Play className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
                {isLive ? "Join" : "Remind"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[12px] border border-border bg-background/80 p-2">
      <div className="mb-1 flex items-center gap-1 text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        <span className="text-[10px] font-black uppercase">{label}</span>
      </div>
      <p className="truncate text-xs font-extrabold text-foreground">{value}</p>
    </div>
  );
}

function RoomInfoPanel({ room, onFinish }: { room?: AgendaRoom; onFinish: () => void }) {
  if (!room) {
    return (
      <aside className="rounded-[18px] border border-border bg-background p-5 text-sm text-muted-foreground">
        Select a room to see information.
      </aside>
    );
  }
  const isMyRoom = room.owner.id === alex.id;
  const canFinishActiveRoom = room.status === "live" && isMyRoom;
  const roomGradient = getRoomStateGradient(room);
  const canShowReportAndActivity = room.status === "live" || room.status === "finished";
  const roomReport = reports.find((report) => sameRoomName(report.room, room.title));
  const roomRecording = recordings.find((recording) => sameRoomName(recording.room, room.title));
  const roomActivities = realtimeEvents.filter((event) => sameRoomName(event.room, room.title));

  return (
    <aside className="sticky top-6 self-start overflow-hidden rounded-[18px] border border-border bg-background shadow-lg">
      <div className={cn("h-24 bg-gradient-to-br", roomGradient)} />
      <div className="p-5">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-[0.12em] text-muted-foreground">Room information</p>
            <h2 className="mt-1 text-xl font-black leading-tight text-foreground">{room.title}</h2>
            <span
              className={cn(
                "mt-2 inline-flex rounded-full px-2 py-1 text-[10px] font-black",
                isMyRoom ? "bg-primary/12 text-primary" : "bg-chart-5/12 text-chart-5",
              )}
            >
              {isMyRoom ? "My room" : `Other host • ${room.owner.name}`}
            </span>
          </div>
          <Badge tone={room.status === "live" ? "live" : room.status === "scheduled" ? "warning" : "neutral"} className="rounded-[8px] uppercase">
            {room.status}
          </Badge>
        </div>

        <div className="mb-5 grid gap-2">
          <InfoRow label="Room ID" value={room.id} />
          <InfoRow label="Owner" value={room.owner.name} />
          <InfoRow label="Language" value={room.language} />
          <InfoRow label="HLS" value={room.hlsStatus} />
          <InfoRow label="Recording" value={room.recording ? "On" : "Off"} />
        </div>

        {canShowReportAndActivity ? (
          <div className="mb-5 rounded-[14px] border border-border bg-muted/30 p-3">
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="text-xs font-black uppercase tracking-[0.12em] text-muted-foreground">
                Report and activity
              </p>
              <Badge variant="brand" className="rounded-[8px] text-[10px] font-black">
                Available
              </Badge>
            </div>
            <div className="grid gap-2">
              <ReportRow
                icon={ChartBar}
                label="Show report"
                value={roomReport ? `${roomReport.status} • ${roomReport.createdAt}` : "No report generated yet"}
              />
              <ReportRow
                icon={Record}
                label="Recording"
                value={roomRecording ? `${roomRecording.status} • ${roomRecording.duration}` : "No recording yet"}
              />
              <ReportRow
                icon={UsersThree}
                label="Activity"
                value={
                  roomActivities.length > 0
                    ? `${roomActivities.length} recent update${roomActivities.length === 1 ? "" : "s"}`
                    : "No activity events yet"
                }
              />
            </div>
            {roomActivities.length > 0 ? (
              <div className="mt-3 space-y-2">
                {roomActivities.slice(0, 3).map((activity) => (
                  <div key={`${activity.time}-${activity.event}`} className="rounded-[10px] bg-background px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-xs font-bold text-foreground">{activity.details}</span>
                      <span className="shrink-0 text-[10px] font-semibold text-muted-foreground">{activity.time}</span>
                    </div>
                    <p className="mt-0.5 text-[10px] font-semibold text-muted-foreground">{activity.event}</p>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ) : (
          <div className="mb-5 rounded-[14px] border border-dashed border-border bg-muted/25 p-4">
            <p className="text-sm font-bold text-foreground">Nothing to show yet</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              This show has not started or finished yet. Reports and activities will appear here after the room goes live or ends.
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <Button
            variant={canFinishActiveRoom ? "danger" : "primary"}
            className="rounded-[10px]"
            onClick={canFinishActiveRoom ? onFinish : undefined}
          >
            {canFinishActiveRoom ? <Power className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {canFinishActiveRoom ? "Finish room" : "Manage"}
          </Button>
          <Button variant="secondary" className="rounded-[10px]">
            <Record className="h-4 w-4" />
            Report
          </Button>
        </div>
      </div>
    </aside>
  );
}

function ReportRow({
  icon: Icon,
  label,
  value,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-[10px] bg-background px-3 py-2">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0">
        <span className="block text-[11px] font-black uppercase tracking-[0.08em] text-muted-foreground">
          {label}
        </span>
        <span className="block truncate text-xs font-bold text-foreground">{value}</span>
      </span>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-[10px] bg-muted/35 px-3 py-2">
      <span className="text-[11px] font-bold text-muted-foreground">{label}</span>
      <span className="min-w-0 truncate text-xs font-extrabold text-foreground">{value}</span>
    </div>
  );
}
