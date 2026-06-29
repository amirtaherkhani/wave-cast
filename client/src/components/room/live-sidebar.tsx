import { useMemo, useState } from "react";
import { ArrowRight, Bookmark } from "lucide-react";

import {
  Bell,
  Briefcase as BriefcaseBusiness,
  Calendar,
  Check,
  Circle as CircleDot,
  Heart,
  MagnifyingGlass,
  MicrophoneStage,
  MusicNote as Music2,
  Flag,
  ShieldCheck,
  Stethoscope,
  UsersThree,
} from "@phosphor-icons/react/ssr";
import { AvatarStack } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { room, rooms } from "@/features/wavecast/mock-data";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useRoomReminderStore } from "@/stores/room-reminder-store";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTrigger,
  DrawerTitle,
} from "@/components/ui/drawer";

type TopicEntry = {
  label: string;
  roomCount: number;
};

const topicChips = [
  { label: "Tech", icon: CircleDot },
  { label: "Business", icon: BriefcaseBusiness },
  { label: "Health", icon: Heart },
  { label: "Education", icon: ShieldCheck },
  { label: "Music", icon: Music2 },
  { label: "Lifestyle", icon: Stethoscope },
];

const topicBadgeClasses: Record<string, string> = {
  Tech: "border-primary/35 bg-primary/12 text-primary",
  Business: "border-chart-2/35 bg-chart-2/12 text-chart-2",
  Health: "border-chart-3/35 bg-chart-3/12 text-chart-3",
  Education: "border-chart-4/35 bg-chart-4/12 text-chart-4",
  Music: "border-primary/35 bg-primary/12 text-primary",
  Lifestyle: "border-chart-5/35 bg-chart-5/12 text-chart-5",
};

const resolveTopicClass = (topic: string) => {
  const key = Object.keys(topicBadgeClasses).find((item) =>
    topic.toLowerCase().includes(item.toLowerCase()),
  );

  if (key) {
    return topicBadgeClasses[key];
  }

  if (topic.toLowerCase().includes("entrepreneur")) {
    return topicBadgeClasses.Business;
  }

  if (topic.toLowerCase().includes("design")) {
    return topicBadgeClasses.Education;
  }

  if (topic.toLowerCase().includes("marketing")) {
    return topicBadgeClasses.Music;
  }

  if (topic.toLowerCase().includes("talk")) {
    return topicBadgeClasses.Tech;
  }

  return "border-border bg-muted text-muted-foreground";
};

const topicIconsByName = Object.fromEntries(topicChips.map((topic) => [topic.label, topic.icon]));

const getTopicIcon = (topic: string) =>
  topicIconsByName[topic] ??
  Object.entries(topicIconsByName).find(([name]) => topic.toLowerCase() === name.toLowerCase())?.[1] ??
  CircleDot;

const topicMatchesRoom = (topic: string, roomTopic: string) => {
  const normalizedTopic = topic.toLowerCase();
  const normalizedRoomTopic = roomTopic.toLowerCase();

  if (normalizedRoomTopic.includes(normalizedTopic) || normalizedTopic.includes(normalizedRoomTopic)) {
    return true;
  }

  if (normalizedTopic.includes("tech")) {
    return normalizedRoomTopic.includes("tech") || normalizedRoomTopic.includes("talk");
  }

  if (normalizedTopic.includes("business")) {
    return (
      normalizedRoomTopic.includes("business") ||
      normalizedRoomTopic.includes("entrepreneur") ||
      normalizedRoomTopic.includes("startup") ||
      normalizedRoomTopic.includes("vc")
    );
  }

  if (normalizedTopic.includes("education")) {
    return normalizedRoomTopic.includes("education") || normalizedRoomTopic.includes("design");
  }

  if (normalizedTopic.includes("music")) {
    return normalizedRoomTopic.includes("music") || normalizedRoomTopic.includes("marketing");
  }

  if (normalizedTopic.includes("lifestyle")) {
    return normalizedRoomTopic.includes("lifestyle") || normalizedRoomTopic.includes("productivity");
  }

  return false;
};

const topicTagClass = {
  small: "h-4 min-h-4 px-1 py-0 text-[9px] font-semibold leading-none",
  chip: "h-7 min-h-7 gap-1 px-2 py-0 text-[10px] font-semibold leading-none",
  icon: "h-3 w-3",
};

export function LiveSidebar() {
  const liveNowRooms = rooms.filter((item) => item.status === "live");
  const upcomingMeetups = rooms.filter((item) => item.status === "scheduled");
  const [liveNowMode, setLiveNowMode] = useState<"cards" | "list">("list");
  const [isTopicsMenuOpen, setIsTopicsMenuOpen] = useState(false);
  const [roomSearch, setRoomSearch] = useState("");
  const [activeTopicFilters, setActiveTopicFilters] = useState<Set<string>>(new Set());
  const [bookmarkedRoomIds, setBookmarkedRoomIds] = useState<Set<string>>(new Set());
  const remindedRoomIds = useRoomReminderStore((state) => state.remindedRoomIds);
  const toggleReminder = useRoomReminderStore((state) => state.toggleReminder);

  const topicList = useMemo<TopicEntry[]>(() => {
    const topicCounts = new Map<string, number>();

    rooms.forEach((item) => {
      topicCounts.set(item.topic, (topicCounts.get(item.topic) ?? 0) + 1);
    });

    topicChips.forEach((chip) => {
      topicCounts.set(chip.label, topicCounts.get(chip.label) ?? 0);
    });

    return Array.from(topicCounts.entries())
      .map(([label, roomCount]) => ({ label, roomCount }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, []);

  const filteredRoomResults = useMemo(() => {
    const term = roomSearch.trim().toLowerCase();
    const selectedTopics = Array.from(activeTopicFilters);

    return rooms.filter((item) => {
      const matchesSelectedTopic =
        selectedTopics.length === 0 ||
        selectedTopics.some((topic) => topicMatchesRoom(topic, item.topic));
      const matchesSearch =
        !term ||
        item.title.toLowerCase().includes(term) ||
        item.topic.toLowerCase().includes(term) ||
        item.status.toLowerCase().includes(term);

      return matchesSelectedTopic && matchesSearch;
    });
  }, [activeTopicFilters, roomSearch]);

  const visibleLiveNowRooms = useMemo(() => {
    return liveNowRooms;
  }, [liveNowRooms]);

  const hasTopicFilter = activeTopicFilters.size > 0;

  const toggleTopicFilter = (label: string) => {
    setActiveTopicFilters((current) => {
      const next = new Set(current);

      if (next.has(label)) {
        next.delete(label);
      } else {
        next.add(label);
      }

      return next;
    });
  };

  const clearTopicFilters = () => {
    setActiveTopicFilters(new Set());
  };

  const handleTopicsMenuOpenChange = (open: boolean) => {
    setIsTopicsMenuOpen(open);

    if (!open) {
      setRoomSearch("");
    }
  };

  const handleTopicRoomJoin = (roomTitle: string) => {
    toast.success("Joining room", {
      description: `Opening ${roomTitle} from the topic list.`,
    });
  };

  const handleTopicRoomBookmark = (itemId: string, roomTitle: string) => {
    let isNowBookmarked = false;

    setBookmarkedRoomIds((current) => {
      const next = new Set(current);

      if (next.has(itemId)) {
        next.delete(itemId);
        isNowBookmarked = false;

        return next;
      }

      next.add(itemId);
      isNowBookmarked = true;
      return next;
    });

    toast.success("Bookmarks updated", {
      description: isNowBookmarked
        ? `Saved ${roomTitle} to bookmarks.`
        : `Removed ${roomTitle} from bookmarks.`,
    });
  };

  const handleUpcomingReminder = (itemId: string, roomTitle: string) => {
    const willRemind = !remindedRoomIds.includes(itemId);

    toggleReminder(itemId);
    toast.success(willRemind ? "Reminder added" : "Reminder removed", {
      description: willRemind
        ? `${roomTitle} was added to your room reminders.`
        : `${roomTitle} was removed from your room reminders.`,
    });
  };

  const renderLiveNowItem = (item: (typeof rooms)[number], index: number) => {
    const isCurrentRoom = item.id === room.id;

    if (liveNowMode === "list") {
      return (
        <button
          key={item.id}
          className={cn(
            "group/card w-full rounded-[12px] border border-border bg-card px-3 py-2.5 text-left transition duration-200 hover:-translate-y-0.5 hover:scale-[1.01] hover:border-primary/40 hover:bg-muted hover:shadow-sm",
            index === 0 ? "border-l-4 border-primary" : "",
          )}
        >
          <div className="space-y-1 text-sm">
            <p className="font-black uppercase tracking-[0.1em] text-chart-3">Live now</p>
            <p className="text-xs text-muted-foreground">Duration: {item.duration}</p>
            <p className="text-xs text-muted-foreground">
              {item.speakerCount} speakers • {item.listenerCount.toLocaleString()} listeners
            </p>
            <p className="text-sm font-bold text-foreground">{item.title}</p>
            <div className="flex items-center gap-2">
              <Badge
                variant="secondary"
                className={cn(topicTagClass.small, resolveTopicClass(item.topic))}
              >
                {item.topic}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {item.listenerCount.toLocaleString()} listening
              </span>
            </div>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
            {isCurrentRoom ? (
              <span
                title="You are in this room"
                className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500"
              >
                <Flag className="h-3.5 w-3.5" />
              </span>
            ) : null}
            <AvatarStack
              people={room.listeners}
              size={20}
              max={3}
              remainder={index === 0 ? "+32" : "+24"}
            />
          </div>
        </button>
      );
    }

    return (
      <button
        key={item.id}
        className={cn(
          "group/card relative h-[88px] w-full overflow-hidden rounded-[12px] px-3 py-3 text-left transition duration-200 hover:-translate-y-0.5 hover:scale-[1.01] hover:shadow-sm hover:border-primary/40",
          index === 0
            ? "border-l-4 border-primary bg-gradient-to-br from-primary/10 to-primary/3"
            : "bg-card",
        )}
      >
        <div className="pointer-events-none absolute inset-0 z-10 flex flex-col justify-end rounded-[12px] bg-gradient-to-t from-popover/95 via-popover/75 to-popover/20 px-3 py-2 text-popover-foreground opacity-0 transition duration-200 group-hover:opacity-100">
          <p className="truncate text-[10px] font-black text-chart-3">
            {item.status === "live" ? "Live now" : "Scheduled"}
          </p>
          <p className="truncate text-[10px] text-muted-foreground">Duration: {item.duration}</p>
          <p className="truncate text-[10px] text-muted-foreground">
            {item.speakerCount} speakers • {item.listenerCount.toLocaleString()} listeners
          </p>
        </div>
        <div className="flex h-full flex-col justify-between">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="truncate text-sm font-bold text-foreground">{item.title}</h3>
              <div className="mt-1 flex items-center gap-2">
                <Badge
                  variant="secondary"
                  className={cn(topicTagClass.small, resolveTopicClass(item.topic))}
                >
                  {item.topic}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {item.listenerCount.toLocaleString()} listening
                </span>
              </div>
            </div>
            {isCurrentRoom ? (
              <span
                title="You are in this room"
                className="mt-7 inline-flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500"
              >
                <Flag className="h-4 w-4" />
              </span>
            ) : null}
          </div>
          <div className="flex items-center">
            <AvatarStack
              people={room.listeners}
              size={26}
              max={4}
              remainder={index === 0 ? "+32" : "+24"}
            />
          </div>
        </div>
      </button>
    );
  };

  return (
    <aside className="live-room-left relative flex h-full min-h-0 flex-col overflow-hidden border-r border-border bg-card px-4 py-5">
      <div>
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-extrabold text-chart-3">• LIVE NOW</p>
          <div className="inline-flex rounded-full border border-border bg-muted p-1 text-xs font-medium">
            <button
              onClick={() => setLiveNowMode("cards")}
              className={cn(
                "rounded-full px-2 py-1",
                liveNowMode === "cards" ? "bg-background text-foreground" : "text-muted-foreground",
              )}
            >
              Cards
            </button>
            <button
              onClick={() => setLiveNowMode("list")}
              className={cn(
                "rounded-full px-2 py-1",
                liveNowMode === "list" ? "bg-background text-foreground" : "text-muted-foreground",
              )}
            >
              List
            </button>
          </div>
        </div>
        <div
          className={cn(
            "thin-scrollbar space-y-2 overflow-y-auto pr-1",
            liveNowMode === "list" ? "max-h-[280px]" : "max-h-[330px]",
          )}
        >
          {visibleLiveNowRooms.map((item, index) => renderLiveNowItem(item, index))}
          {visibleLiveNowRooms.length === 0 ? (
            <p className="rounded-[12px] border border-border p-3 text-xs text-muted-foreground">
              No live rooms match the selected topics.
            </p>
          ) : null}
        </div>
      </div>

      <section className="mt-5">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm font-extrabold text-foreground">UPCOMING</p>
        </div>
        <div className="thin-scrollbar min-h-0 max-h-[clamp(220px,38vh,360px)] flex-1 space-y-3 overflow-y-auto pr-1">
          {upcomingMeetups.length > 0 ? (
            upcomingMeetups.map((item, index) => {
              const isReminded = remindedRoomIds.includes(item.id);

              return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleUpcomingReminder(item.id, item.title)}
                className={cn(
                  "group/card flex w-full items-center gap-3 rounded-[12px] border border-border bg-card p-3 text-left transition duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:bg-muted hover:shadow-sm",
                  index === 0 ? "border-l-4 border-primary" : "",
                  isReminded ? "border-emerald-500/50 bg-emerald-500/5" : "",
                )}
              >
                <span
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-[10px]",
                    isReminded
                      ? "bg-emerald-500/12 text-emerald-500"
                      : index === 0
                        ? "bg-destructive/10 text-destructive"
                        : "bg-chart-3/10 text-chart-3",
                  )}
                >
                  <Calendar className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs text-muted-foreground">
                    {item.startedAt}
                  </span>
                  <span className="block truncate text-sm font-bold text-foreground">
                    {item.title}
                  </span>
                  <span className="mt-1 block truncate text-xs text-muted-foreground">
                    <span className="mr-2 inline-flex">
                      <Badge
                        variant="secondary"
                        className={cn(topicTagClass.small, resolveTopicClass(item.topic))}
                      >
                        {item.topic}
                      </Badge>
                    </span>
                    With Sarah, Priya, John
                  </span>
                </span>
                <span
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition",
                    isReminded
                      ? "bg-emerald-500 text-white shadow-sm shadow-emerald-500/20"
                      : "bg-muted text-muted-foreground group-hover/card:bg-background",
                  )}
                  title={isReminded ? "Reminder active" : "Set reminder"}
                >
                  <Bell className="h-4 w-4" />
                </span>
              </button>
              );
            })
          ) : (
            <p className="rounded-[12px] border border-dashed border-border bg-muted/35 px-3 py-3 text-xs text-muted-foreground">
              No upcoming meetups are scheduled.
            </p>
          )}
        </div>
      </section>

      <section className="mt-4 mt-auto">
        <div className="mb-4 flex items-center justify-between gap-2">
          <p className="text-sm font-extrabold text-foreground">EXPLORE TOPICS</p>
          <Drawer open={isTopicsMenuOpen} onOpenChange={handleTopicsMenuOpenChange}>
            <DrawerTrigger asChild>
              <button className="text-sm font-semibold text-primary">View all topics</button>
            </DrawerTrigger>
            <DrawerContent className="h-[37vh] max-w-[730px] px-4 py-4 sm:max-w-[730px]">
              <DrawerHeader className="mb-3 w-full justify-center px-0">
                <div className="mx-auto mb-2 flex w-full max-w-[460px] flex-col items-center gap-2">
                  <div className="w-full text-center">
                    <DrawerTitle className="text-base">All topics</DrawerTitle>
                    <DrawerDescription className="text-xs">
                      Select topics to update the room list.
                    </DrawerDescription>
                  </div>
                  <div className="flex w-full max-w-[380px] items-center gap-[clamp(0.26rem,0.7vw,0.45rem)] rounded-full border border-border bg-muted/55 px-[clamp(0.48rem,1vw,0.78rem)] py-[clamp(0.28rem,0.55vw,0.44rem)]">
                    <MagnifyingGlass className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <Input
                      type="search"
                      placeholder="Search rooms"
                      value={roomSearch}
                      onChange={(event) => setRoomSearch(event.target.value)}
                      className="h-7 border-0 bg-transparent p-0 text-sm ring-0 focus-visible:ring-0"
                    />
                  </div>
                  <div
                    className={cn(
                      "flex min-h-6 w-full max-w-[380px] items-center text-[11px] text-muted-foreground",
                      hasTopicFilter ? "justify-between" : "justify-center",
                    )}
                  >
                    <span>
                      {activeTopicFilters.size} selected • {filteredRoomResults.length} room
                      {filteredRoomResults.length === 1 ? "" : "s"}
                    </span>
                    {hasTopicFilter ? (
                      <button
                        type="button"
                        className="font-semibold text-primary"
                        onClick={clearTopicFilters}
                      >
                        Clear filters
                      </button>
                    ) : null}
                  </div>
                </div>
              </DrawerHeader>

              <div className="grid min-h-0 flex-1 gap-3 md:grid-cols-[210px_minmax(0,1fr)]">
                <section className="min-h-0 rounded-[12px] border border-border bg-muted/25 p-2">
                  <div className="mb-2 flex items-center justify-between px-1">
                    <p className="text-[11px] font-extrabold uppercase text-muted-foreground">
                      Topic tags
                    </p>
                    <span className="text-[10px] font-bold text-muted-foreground">
                      {topicList.length}
                    </span>
                  </div>
                  <div className="thin-scrollbar flex max-h-[190px] flex-wrap gap-1.5 overflow-y-auto pr-1 md:max-h-none">
                    {topicList.length > 0 ? (
                      topicList.map((topic) => {
                        const Icon = getTopicIcon(topic.label);
                        const isSelected = activeTopicFilters.has(topic.label);

                        return (
                          <button
                            key={topic.label}
                            type="button"
                            onClick={() => toggleTopicFilter(topic.label)}
                            className={cn(
                              "inline-flex items-center gap-1 rounded-full border px-1.5 py-1 text-[10px] font-bold leading-none transition",
                              isSelected
                                ? "border-primary/70 bg-primary/10 text-primary shadow-sm"
                                : "border-border bg-card text-foreground hover:border-primary/40 hover:bg-background",
                            )}
                          >
                            <Icon className="h-3 w-3" />
                            {topic.label}
                            {isSelected ? <Check className="h-3 w-3" /> : null}
                          </button>
                        );
                      })
                    ) : (
                      <p className="rounded-[10px] border border-border bg-card px-3 py-2 text-xs text-muted-foreground">
                        No topics match your search.
                      </p>
                    )}
                  </div>
                </section>

                <section className="flex min-h-0 flex-col rounded-[12px] border border-border bg-card p-2">
                  <div className="mb-2 flex items-center justify-between gap-2 px-1">
                    <p className="text-[11px] font-extrabold uppercase text-muted-foreground">
                      Rooms
                    </p>
                    <span className="text-[10px] font-bold text-muted-foreground">
                      live / offline
                    </span>
                  </div>
                  <div className="thin-scrollbar min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
                    {filteredRoomResults.length > 0 ? (
                      filteredRoomResults.map((item) => {
                        const isLive = item.status === "live";
                        const isBookmarked = bookmarkedRoomIds.has(item.id);

                        return (
                          <div
                            key={item.id}
                            className={cn(
                              "group/topic-room rounded-[12px] border border-border bg-background p-3 text-left transition duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:bg-muted hover:shadow-sm",
                              isBookmarked ? "ring-2 ring-primary/50" : "",
                            )}
                          >
                            <div className="mb-2 flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-extrabold text-foreground">
                                  {item.title}
                                </p>
                                <Badge
                                  variant="secondary"
                                  className={cn("mt-1", topicTagClass.small, resolveTopicClass(item.topic))}
                                >
                                  {item.topic}
                                </Badge>
                              </div>
                              <Badge
                                tone={isLive ? "live" : "neutral"}
                                className="h-5 shrink-0 rounded-[6px] px-1.5 text-[10px] font-black uppercase"
                              >
                                {isLive ? "Live" : "Offline"}
                              </Badge>
                            </div>
                            <div className="flex flex-wrap items-center gap-3 text-[11px] font-semibold text-muted-foreground">
                              <span className="inline-flex items-center gap-1">
                                <UsersThree className="h-3.5 w-3.5 text-[#6684FF]" />
                                {item.listenerCount.toLocaleString()} listeners
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <MicrophoneStage className="h-3.5 w-3.5 text-chart-3" />
                                {item.speakerCount.toLocaleString()} speakers
                              </span>
                            </div>
                            <div className="mt-2 flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleTopicRoomBookmark(item.id, item.title)}
                                className={cn(
                                  "inline-flex h-7 w-7 items-center justify-center rounded-full border transition-colors hover:bg-muted",
                                  isBookmarked
                                    ? "border-primary/40 bg-primary/10 text-primary"
                                    : "border-border bg-background text-muted-foreground hover:text-foreground",
                                )}
                                aria-label={`Bookmark ${item.title}`}
                              >
                                <Bookmark className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleTopicRoomJoin(item.title)}
                                className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary/90 text-primary-foreground transition-colors hover:bg-primary"
                                aria-label={`Join ${item.title}`}
                              >
                                <ArrowRight className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <p className="rounded-[12px] border border-dashed border-border bg-muted/35 px-3 py-3 text-xs text-muted-foreground">
                        No rooms match the selected topics.
                      </p>
                    )}
                  </div>
                </section>
              </div>
            </DrawerContent>
          </Drawer>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {topicChips.map(({ label, icon: Icon }) => (
            <Badge
              key={label}
              variant="secondary"
              className={cn(
                "w-auto justify-center",
                topicTagClass.chip,
                resolveTopicClass(label),
              )}
            >
              <Icon className={topicTagClass.icon} />
              {label}
            </Badge>
          ))}
        </div>
      </section>

      <p className="mt-2 text-xs text-muted-foreground">© 2024 WaveCast</p>
    </aside>
  );
}
