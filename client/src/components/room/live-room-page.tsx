"use client";

import Link from "next/link";
import {
  ArrowLeft,
  Clock as Clock3,
  GearSix,
  Power,
  MagnifyingGlass,
  Radio,
  UserCirclePlus as UserRoundPlus,
  Users,
  UserMinus,
  DotsThree as MoreHorizontal,
  MicrophoneStage,
  ShieldCheck,
  ShareNetwork as Share2,
  Waveform,
} from "@phosphor-icons/react/ssr";
import { useEffect, useMemo, useState } from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { AlertDialog } from "radix-ui";
import { TopBar } from "@/components/common/top-bar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { LiveSidebar } from "@/components/room/live-sidebar";
import { StagePanel } from "@/components/room/stage-panel";
import { ListenerPanel } from "@/components/room/listener-panel";
import { RoomSidePanel } from "@/components/room/room-side-panel";
import { cn } from "@/lib/utils";
import { alex, people, room } from "@/features/wavecast/mock-data";
import { useUiStore } from "@/stores/ui-store";
import { toast } from "sonner";

const formatTimer = (totalSeconds: number) => {
  const safeSeconds = Math.max(totalSeconds, 0);
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(
    seconds,
  ).padStart(2, "0")}`;
};

const parseDuration = (value: string) => {
  const parts = value.split(":").map((rawValue) => Number.parseInt(rawValue, 10));
  if (parts.some((part) => Number.isNaN(part))) {
    return 0;
  }

  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }

  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }

  return 0;
};

const roomTopicClass = (topic: string) => {
  const normalized = topic.toLowerCase();

  if (normalized.includes("tech")) {
    return "border-primary/35 bg-primary/12 text-primary";
  }

  if (normalized.includes("entrepreneur") || normalized.includes("business")) {
    return "border-chart-2/35 bg-chart-2/12 text-chart-2";
  }

  if (normalized.includes("health")) {
    return "border-chart-3/35 bg-chart-3/12 text-chart-3";
  }

  if (normalized.includes("design") || normalized.includes("education")) {
    return "border-chart-4/35 bg-chart-4/12 text-chart-4";
  }

  if (normalized.includes("marketing") || normalized.includes("music")) {
    return "border-primary/35 bg-primary/12 text-primary";
  }

  return "border-border bg-muted text-muted-foreground";
};

export function LiveRoomPage() {
  const [roomDuration, setRoomDuration] = useState(() => parseDuration(room.duration));
  const [timeTickKey, setTimeTickKey] = useState(0);
  const [invitedFriendIds, setInvitedFriendIds] = useState<Set<string>>(() => new Set());
  const [inviteSearchQuery, setInviteSearchQuery] = useState("");
  const [openEndRoomDialog, setOpenEndRoomDialog] = useState(false);
  const [openRoomActionsMenu, setOpenRoomActionsMenu] = useState(false);
  const { p2pUnreadCount, setActiveP2PFriendId, setActiveRoom } = useUiStore();
  const canHostEndRoom = alex.role === "Host";
  const defaultPrivateChatTarget = useMemo(() => {
    const candidates = [room.owner, ...room.speakers, ...room.listeners].filter(
      (person) => person.id !== alex.id,
    );
    const unique = new Map(candidates.map((person) => [person.id, person]));
    return unique.values().next().value ?? null;
  }, []);

  const roomPersonIds = useMemo(
    () =>
      new Set([
        room.owner.id,
        ...room.speakers.map((person) => person.id),
        ...room.listeners.map((person) => person.id),
      ]),
    [],
  );
  const friendInvites = useMemo(
    () =>
      people
        .filter((person) => person.isFriend)
        .map((friend) => ({
          ...friend,
          inRoom: roomPersonIds.has(friend.id),
          isInvited: invitedFriendIds.has(friend.id),
        })),
    [invitedFriendIds, roomPersonIds],
  );
  useEffect(() => {
    setActiveRoom({ id: room.id, title: room.title });
  }, [setActiveRoom]);
  const friendsInRoom = useMemo(
    () => friendInvites.filter((friend) => friend.inRoom),
    [friendInvites],
  );
  const friendsNotInRoom = useMemo(
    () => friendInvites.filter((friend) => !friend.inRoom),
    [friendInvites],
  );
  const normalizedInviteSearch = inviteSearchQuery.trim().toLowerCase();
  const filteredFriendsInRoom = useMemo(
    () =>
      friendsInRoom.filter((friend) => {
        const displayName = friend.name.toLowerCase();
        const username = friend.username.toLowerCase();
        return (
          displayName.includes(normalizedInviteSearch) ||
          username.includes(normalizedInviteSearch) ||
          `@${username}`.includes(normalizedInviteSearch)
        );
      }),
    [friendsInRoom, normalizedInviteSearch],
  );
  const filteredFriendsNotInRoom = useMemo(
    () =>
      friendsNotInRoom.filter((friend) => {
        const displayName = friend.name.toLowerCase();
        const username = friend.username.toLowerCase();
        return (
          displayName.includes(normalizedInviteSearch) ||
          username.includes(normalizedInviteSearch) ||
          `@${username}`.includes(normalizedInviteSearch)
        );
      }),
    [friendsNotInRoom, normalizedInviteSearch],
  );
  const hasSearchResults = useMemo(
    () => filteredFriendsInRoom.length + filteredFriendsNotInRoom.length > 0,
    [filteredFriendsInRoom, filteredFriendsNotInRoom],
  );

  const renderInviteFriendItem = (
    friend: (typeof friendInvites)[number],
    options: { inRoom: boolean },
  ) => {
    const { inRoom } = options;
    const isInvited = friend.isInvited;

    return (
      <DropdownMenu.Item
        key={friend.id}
        onSelect={(event) => event.preventDefault()}
        className="rounded-[10px] border border-border bg-muted/40 px-2 py-2 outline-none"
      >
        <span className="mb-1 flex items-center justify-between gap-2 text-left">
          <span className="flex min-w-0 items-center gap-2">
            <Avatar src={friend.avatar} name={friend.name} size={24} />
            <span className="min-w-0">
              <span className="block truncate text-sm font-bold text-foreground">
                {friend.name}
              </span>
              <span className="block truncate text-[10px] text-muted-foreground">
                @{friend.username}
              </span>
            </span>
          </span>
          <span className="flex shrink-0 items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold ${
                inRoom
                  ? "bg-emerald-500/12 text-emerald-600"
                  : isInvited
                    ? "bg-muted text-muted-foreground"
                    : "bg-primary/12 text-primary"
              }`}
            >
              {inRoom ? <Users className="h-3 w-3" /> : <UserMinus className="h-3 w-3" />}
              {inRoom ? "In room" : isInvited ? "Invited" : "Not in room"}
            </span>
            {!inRoom ? (
              <Button
                type="button"
                size="sm"
                className="shrink-0 px-3 py-1.5 text-xs"
                variant="secondary"
                disabled={isInvited}
                onClick={() => handleInviteFriend(friend.id, friend.name)}
              >
                {isInvited ? "Invited" : "Invite"}
              </Button>
            ) : null}
          </span>
        </span>
      </DropdownMenu.Item>
    );
  };

  const handleInviteFriend = (personId: string, personName: string) => {
    if (roomPersonIds.has(personId) || invitedFriendIds.has(personId)) return;

    setInvitedFriendIds((current) => {
      const next = new Set(current);
      next.add(personId);
      return next;
    });

    toast.success(`Invite sent to ${personName}`, {
      description: `You sent a room invite to ${personName}.`,
    });
  };

  const handleOpenPrivateChat = () => {
    if (!defaultPrivateChatTarget) {
      toast.error("No one available", {
        description: "There is no room member available to start a private chat.",
      });
      return;
    }

    setActiveP2PFriendId(defaultPrivateChatTarget.id);
  };

  const handleEndRoom = () => {
    if (!canHostEndRoom) {
      toast.error("Permission denied", {
        description: "Only the host can end this room.",
      });
      return;
    }

    toast.success("Room ended", {
      description:
        "You have ended the room. In a real environment this would notify all listeners.",
    });
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setRoomDuration((seconds) => seconds + 1);
      setTimeTickKey((value) => value + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-card">
      <TopBar
        showPrivateChat
        privateChatUnreadCount={p2pUnreadCount}
        onPrivateChatClick={handleOpenPrivateChat}
      />
      <div className="live-room-layout mx-auto grid h-[calc(100dvh-76px)] min-h-0 w-full grid-cols-[293px_minmax(0,1fr)_463px] overflow-hidden">
        <LiveSidebar />
        <main className="min-h-0 h-full overflow-y-auto px-4 py-6">
          <div className="mb-5 flex items-start justify-between gap-6">
            <div>
              <button className="mb-4 flex items-center gap-3 text-sm font-semibold text-muted-foreground">
                <ArrowLeft className="h-4 w-4" />
                Back to rooms
              </button>
              <div className="mb-3 flex items-center gap-4">
                <Badge
                  tone="live"
                  className="rounded-[6px] px-3 py-2 text-xs animate-pulse [animation-duration:1.6s] [animation-timing-function:ease-in-out]"
                >
                  LIVE
                </Badge>
                <h1 className="text-[28px] font-extrabold leading-tight text-foreground">
                  The Future of AI in Everyday Life
                </h1>
              </div>
              <div className="flex items-center gap-4 text-base font-semibold text-muted-foreground">
                <Badge
                  variant="secondary"
                  className={cn(
                    "h-5 min-h-5 px-2 py-0 text-[11px] font-semibold leading-none",
                    roomTopicClass(room.topic),
                  )}
                >
                  {room.topic}
                </Badge>
                <span className="text-muted-foreground">•</span>
                <span className="inline-flex items-center gap-2">
                  <Waveform className="h-4 w-4 text-[#6684FF]" />
                  1.2K listening
                </span>
                <span className="text-muted-foreground">•</span>
                <span className="inline-flex items-center gap-2">
                  <MicrophoneStage className="h-4 w-4 text-chart-3" />
                  78 speaking
                </span>
                <span className="text-muted-foreground">•</span>
                <span className="inline-flex items-center gap-2">
                  <Radio className="h-4 w-4 text-chart-3" />
                  Recording On
                </span>
                <span className="text-muted-foreground">•</span>
                <span className="inline-flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-chart-2" />
                  Room Rules 5
                </span>
              </div>
            </div>
            <div className="flex flex-col items-end gap-4">
              <div className="flex items-center gap-3">
                <DropdownMenu.Root>
                  <DropdownMenu.Trigger asChild>
                    <Button variant="secondary" className="h-11 px-4">
                      <UserRoundPlus className="h-4 w-4" />
                      Invite
                    </Button>
                  </DropdownMenu.Trigger>
                  <DropdownMenu.Portal>
                    <DropdownMenu.Content
                      align="end"
                      sideOffset={10}
                      className="z-50 w-72 rounded-[14px] border border-border bg-card p-3 shadow-xl"
                    >
                      <p className="mb-2 text-xs font-extrabold uppercase tracking-[0.12em] text-muted-foreground">
                        Invite friend to room
                      </p>
                      <div className="relative">
                        <MagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          value={inviteSearchQuery}
                          onChange={(event) => setInviteSearchQuery(event.target.value)}
                          placeholder="Search friends"
                          className="mb-2 h-9 rounded-[10px] border-border bg-muted/20 py-1 pl-9 pr-3"
                          autoComplete="off"
                        />
                      </div>

                      {hasSearchResults ? (
                        <div className="flex flex-col gap-2">
                          <div>
                            <p className="mb-1 text-[10px] font-extrabold uppercase tracking-[0.12em] text-muted-foreground">
                              Friends in room
                            </p>
                            {filteredFriendsInRoom.length > 0 ? (
                              <div className="thin-scrollbar space-y-2 overflow-y-auto">
                                {filteredFriendsInRoom.map((friend) =>
                                  renderInviteFriendItem(friend, { inRoom: true }),
                                )}
                              </div>
                            ) : (
                              <p className="rounded-[10px] border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                                No friends in this room.
                              </p>
                            )}
                          </div>
                          <div>
                            <p className="mb-1 text-[10px] font-extrabold uppercase tracking-[0.12em] text-muted-foreground">
                              Friends not in room
                            </p>
                            {filteredFriendsNotInRoom.length > 0 ? (
                              <div className="thin-scrollbar max-h-40 space-y-2 overflow-y-auto">
                                {filteredFriendsNotInRoom.map((friend) =>
                                  renderInviteFriendItem(friend, { inRoom: false }),
                                )}
                              </div>
                            ) : (
                              <p className="rounded-[10px] border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                                No friends to invite right now.
                              </p>
                            )}
                          </div>
                        </div>
                      ) : (
                        <p className="rounded-[10px] border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                          {friendInvites.length > 0
                            ? "No friends match your search."
                            : "No friends found to invite."}
                        </p>
                      )}
                    </DropdownMenu.Content>
                  </DropdownMenu.Portal>
                </DropdownMenu.Root>
                <Button variant="secondary" className="h-11 px-5">
                  <Share2 className="h-4 w-4" />
                  Share Room
                </Button>
                <DropdownMenu.Root open={openRoomActionsMenu} onOpenChange={setOpenRoomActionsMenu}>
                  <DropdownMenu.Trigger asChild>
                    <Button variant="secondary" size="icon" className="h-11 w-11">
                      <MoreHorizontal className="h-5 w-5" />
                    </Button>
                  </DropdownMenu.Trigger>
                  <DropdownMenu.Portal>
                    <DropdownMenu.Content
                      align="end"
                      sideOffset={10}
                      className="z-50 w-56 rounded-[12px] border border-border bg-card p-2 shadow-xl"
                    >
                      <DropdownMenu.Item asChild className="list-none outline-none">
                        <Link
                          href="/room-settings"
                          className="mb-1 flex w-full items-center gap-2 rounded-[9px] px-2 py-2 text-sm font-semibold text-foreground transition hover:bg-muted focus-visible:bg-muted"
                          onClick={() => setOpenRoomActionsMenu(false)}
                        >
                          <GearSix className="h-4 w-4" />
                          Room Settings
                        </Link>
                      </DropdownMenu.Item>
                      <DropdownMenu.Item
                        className={`mb-1 flex w-full items-center gap-2 rounded-[9px] px-2 py-2 text-sm font-semibold outline-none transition ${
                          canHostEndRoom
                            ? "text-destructive hover:bg-muted focus-visible:bg-muted"
                            : "pointer-events-none text-muted-foreground"
                        }`}
                        onSelect={(event) => {
                          event.preventDefault();
                          if (!canHostEndRoom) {
                            toast.error("Permission denied", {
                              description: "Only the host can end this room.",
                            });
                            return;
                          }

                          setOpenEndRoomDialog(true);
                          setOpenRoomActionsMenu(false);
                        }}
                      >
                        <Power className="h-4 w-4" />
                        End Room
                      </DropdownMenu.Item>
                    </DropdownMenu.Content>
                  </DropdownMenu.Portal>
                </DropdownMenu.Root>
              </div>
              <span className="inline-flex h-9 items-center gap-2 rounded-[8px] bg-destructive/10 px-4 text-sm font-bold text-destructive">
                <Clock3 className="h-4 w-4" />
                <span
                  key={timeTickKey}
                  className="room-time-ticker inline-flex min-w-[67px] justify-end tabular-nums"
                >
                  {formatTimer(roomDuration)}
                </span>
              </span>
            </div>
          </div>

          <div className="space-y-4">
            <StagePanel />
            <ListenerPanel />
          </div>
        </main>
        <RoomSidePanel />
        <AlertDialog.Root open={openEndRoomDialog} onOpenChange={setOpenEndRoomDialog}>
          <AlertDialog.Portal>
            <AlertDialog.Overlay className="fixed inset-0 z-40 bg-foreground/30 backdrop-blur-[2px] data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
            <AlertDialog.Content className="fixed inset-x-0 bottom-0 z-50 mx-auto mb-4 flex w-[min(95%,430px)] flex-col overflow-hidden rounded-[20px] border border-border bg-background p-5 shadow-2xl outline-none">
              <span className="mx-auto mb-2 h-1.5 w-10 rounded-full bg-border" />
              <div className="rounded-[14px] border border-destructive/20 bg-destructive/5 p-3">
                <span className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-full bg-destructive/15 text-destructive">
                  <Power className="h-4 w-4" />
                </span>
                <div className="mt-3">
                  <AlertDialog.Title className="text-base font-extrabold text-foreground">
                    End room?
                  </AlertDialog.Title>
                  <AlertDialog.Description className="text-sm text-muted-foreground">
                    This action will remove everyone from the room and end the session.
                  </AlertDialog.Description>
                </div>
              </div>
              <div className="mt-3 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <AlertDialog.Cancel asChild>
                  <Button
                    size="xs"
                    variant="secondary"
                    className="h-7 rounded-[7px] px-3 !text-xs sm:w-auto"
                  >
                    Cancel
                  </Button>
                </AlertDialog.Cancel>
                <AlertDialog.Action asChild>
                  <Button
                    size="xs"
                    variant="destructive"
                    className="h-7 rounded-[7px] px-3 !text-xs sm:w-auto"
                    onClick={handleEndRoom}
                  >
                    End Room
                  </Button>
                </AlertDialog.Action>
              </div>
            </AlertDialog.Content>
          </AlertDialog.Portal>
        </AlertDialog.Root>
      </div>
    </div>
  );
}
