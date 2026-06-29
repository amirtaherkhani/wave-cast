"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { AnimatePresence, motion } from "framer-motion";
import {
  CheckCircle,
  HandPalm,
  Microphone as Mic,
  Plus,
  UserCirclePlus as UserRoundPlus,
} from "@phosphor-icons/react/ssr";
import { Avatar } from "@/components/ui/avatar";
import { alex, room } from "@/features/wavecast/mock-data";
import { SpeakerProfileTooltip } from "@/components/room/speaker-profile-tooltip";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { Person } from "@/types/wavecast";
import { useSpeakerStore } from "@/stores/speaker-store";

const speakerCardVariants = {
  hidden: { opacity: 0, y: 10, scale: 0.98 },
  visible: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -6, scale: 0.98 },
};

const speakerPanelVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

type RaiseHandPulse = {
  id: string;
  person: Person;
  requestedAt: string;
};

export function StagePanel() {
  const [onStageSpeakers, setOnStageSpeakers] = useState<Person[]>(() => room.speakers);
  const [openInviteMenu, setOpenInviteMenu] = useState(false);
  const [raiseHandPulse, setRaiseHandPulse] = useState<RaiseHandPulse | null>(null);
  const seenRequestIdsRef = useRef<Set<string> | null>(null);
  const speakerRequests = useSpeakerStore((state) => state.speakerRequests);
  const removeSpeakerRequest = useSpeakerStore((state) => state.removeSpeakerRequest);
  const micEnabled = useSpeakerStore((state) => state.micEnabled);
  const onStageIds = useMemo(
    () => new Set(onStageSpeakers.map((speaker) => speaker.id)),
    [onStageSpeakers],
  );
  const currentUserSpeaker = useMemo(
    () => onStageSpeakers.find((speaker) => speaker.id === alex.id),
    [onStageSpeakers],
  );
  const isCurrentUserSpeaking = micEnabled && Boolean(currentUserSpeaker);
  const shouldPrioritizeCurrentUser = isCurrentUserSpeaking;
  const activeSpeakerIds = useMemo(() => {
    const activeIds = new Set(
      onStageSpeakers.filter((speaker) => speaker.isSpeaking).map((speaker) => speaker.id),
    );

    if (isCurrentUserSpeaking && currentUserSpeaker) {
      activeIds.add(currentUserSpeaker.id);
    }

    return activeIds;
  }, [currentUserSpeaker, isCurrentUserSpeaking, onStageSpeakers]);

  const activeSpeakers = useMemo(
    () => onStageSpeakers.filter((speaker) => activeSpeakerIds.has(speaker.id)),
    [activeSpeakerIds, onStageSpeakers],
  );
  const hasSingleActiveSpeaker = activeSpeakers.length === 1;
  const hasMultipleActiveSpeakers = activeSpeakers.length > 1;
  const focusedSpeaker = activeSpeakers[0] ?? null;
  const speakingCount = activeSpeakers.length;
  const orderedSpeakers = useMemo(
    () =>
      shouldPrioritizeCurrentUser && currentUserSpeaker
        ? [currentUserSpeaker, ...onStageSpeakers.filter((speaker) => speaker.id !== alex.id)]
        : onStageSpeakers,
    [currentUserSpeaker, onStageSpeakers, shouldPrioritizeCurrentUser],
  );
  const visibleSpeakers = useMemo(
    () =>
      shouldPrioritizeCurrentUser && currentUserSpeaker
        ? orderedSpeakers.filter((speaker) => speaker.id !== currentUserSpeaker.id)
        : [],
    [currentUserSpeaker, orderedSpeakers, shouldPrioritizeCurrentUser],
  );

  const requestQueue = useMemo(
    () =>
      speakerRequests
        .filter((request) => request.status === "pending")
        .filter((request) => !onStageIds.has(request.person.id)),
    [speakerRequests, onStageIds],
  );

  const pendingHandRequests = useMemo(
    () => speakerRequests.filter((request) => request.status === "pending"),
    [speakerRequests],
  );

  useEffect(() => {
    const pendingIds = new Set(pendingHandRequests.map((request) => request.id));

    if (!seenRequestIdsRef.current) {
      seenRequestIdsRef.current = pendingIds;
      return;
    }

    const newRequest = pendingHandRequests.find(
      (request) => !seenRequestIdsRef.current?.has(request.id),
    );

    seenRequestIdsRef.current = pendingIds;

    if (!newRequest) return;

    setRaiseHandPulse({
      id: newRequest.id,
      person: newRequest.person,
      requestedAt: newRequest.requestedAt,
    });

    const hidePulse = window.setTimeout(() => {
      setRaiseHandPulse((current) => (current?.id === newRequest.id ? null : current));
    }, 3200);

    return () => window.clearTimeout(hidePulse);
  }, [pendingHandRequests]);

  const listenerInviteCandidates = useMemo(
    () => room.listeners.filter((listener) => !onStageIds.has(listener.id)),
    [onStageIds],
  );
  const addSpeakerToStage = (person: Person, requestId?: string) => {
    if (onStageIds.has(person.id)) return;

    setOnStageSpeakers((current) => [...current, { ...person, role: "Speaker" }]);
    if (requestId) {
      removeSpeakerRequest(requestId);
    }
    setOpenInviteMenu(false);
    toast.success(`${person.name} is now on stage`, {
      description: "You invited this listener as a speaker.",
    });
  };

  const renderSpeakerCard = (
    speaker: Person,
    options: { compact?: boolean; primary?: boolean; isCurrentUserFocus?: boolean } = {},
  ) => {
    const { compact = false, primary = false, isCurrentUserFocus = false } = options;
    const isCurrentUser = speaker.id === alex.id;
    const isActive = activeSpeakerIds.has(speaker.id) && (!isCurrentUser || micEnabled);
    const isHost = speaker.role === "Host";
    const avatarSize = primary ? 92 : compact ? 54 : 74;
    const micSize = primary ? "h-4 w-4" : compact ? "h-3.5 w-3.5" : "h-4 w-4";
    const iconSize = primary ? "h-7 w-7" : compact ? "h-6 w-6" : "h-7 w-7";
    const nameTextClass = compact ? "text-[11px]" : "text-sm";
        const statusText = isHost
          ? isActive
            ? "Host • Speaking"
            : isCurrentUserFocus
              ? "You • Speaking"
              : "Host"
          : isCurrentUserFocus
            ? "You • Speaking"
            : "Speaker";
    const speakingRingBase = avatarSize + (primary ? 34 : compact ? 26 : 28);

    return (
      <motion.div
        key={speaker.id}
        layout
        layoutId={`speaker-card-${speaker.id}`}
        initial="hidden"
        animate="visible"
        exit="exit"
        variants={speakerCardVariants}
        transition={{ duration: 0.24, ease: "easeOut" }}
        className={cn("relative flex min-w-0 flex-col items-center", compact ? "gap-1" : "gap-0")}
      >
        <span
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute inset-x-1 mx-auto flex min-h-[54px] items-center justify-center text-center font-black leading-tight tracking-tight text-foreground/10",
            primary ? "top-4 text-[10px]" : "top-2 text-[9px]",
          )}
        >
          {speaker.name}
        </span>
        <SpeakerProfileTooltip speaker={speaker} isRoomCreator={isHost}>
          <div
            data-testid={`speaker-tooltip-${speaker.id}`}
            tabIndex={0}
            data-speaker-active={isActive ? "true" : "false"}
            className={cn(
              "relative cursor-pointer rounded-full border-[3px] border-muted p-1 outline-none transition-transform duration-150 hover:scale-[1.03] focus-visible:ring-3 focus-visible:ring-primary/30",
              isActive ? "border-emerald-500/90" : "",
              isCurrentUserFocus ? "speaker-ring-pulse" : "",
            )}
          >
            {isActive ? (
              <>
                <span
                  aria-hidden="true"
                  className="speaker-talk-ring speaker-talk-ring--outer pointer-events-none absolute z-0 rounded-full"
                  style={{
                    width: `${speakingRingBase}px`,
                    height: `${speakingRingBase}px`,
                    left: "50%",
                    top: "50%",
                    transform: "translate(-50%, -50%)",
                  }}
                />
                <span
                  aria-hidden="true"
                  className="speaker-talk-ring speaker-talk-ring--inner pointer-events-none absolute z-0 rounded-full"
                  style={{
                    width: `${speakingRingBase + 14}px`,
                    height: `${speakingRingBase + 14}px`,
                    left: "50%",
                    top: "50%",
                      transform: "translate(-50%, -50%)",
                    }}
                  />
                <span
                  aria-hidden="true"
                  className="speaker-talk-wave pointer-events-none absolute z-0 rounded-full"
                  style={{
                    width: `${speakingRingBase + 26}px`,
                    height: `${speakingRingBase + 26}px`,
                    left: "50%",
                    top: "50%",
                    transform: "translate(-50%, -50%)",
                  }}
                />
              </>
            ) : null}
            <Avatar
              src={speaker.avatar}
              name={speaker.name}
              size={avatarSize}
              className="relative z-10"
            />
            <span
                className={cn(
                  "absolute -right-1 -bottom-1 z-10 flex items-center justify-center rounded-full border-[2.5px] border-background shadow-lg transition-all duration-200",
                  iconSize,
                  isActive
                  ? "bg-emerald-500 text-white shadow-emerald-500/55 ring-2 ring-emerald-400/45"
                  : "bg-primary/90 text-white shadow-primary/35 ring-2 ring-primary/35",
                )}
              >
                <Mic className={cn(micSize, "text-white")} />
              </span>
          </div>
        </SpeakerProfileTooltip>
        <h3
          className={cn(
            "relative z-10 mt-2.5 line-clamp-1 font-extrabold",
            nameTextClass,
            isCurrentUserFocus ? "text-emerald-500" : isActive ? "text-emerald-600" : "text-foreground",
          )}
        >
          {speaker.name}
        </h3>
        <span
          className={cn(
            "mt-2 rounded-[7px] bg-muted px-3 py-1 text-xs font-bold",
            isHost ? (isActive ? "text-emerald-600" : "text-primary") : "text-primary",
          )}
        >
          {statusText}
        </span>
      </motion.div>
    );
  };

  const renderInviteButton = () => (
    <motion.div
      layout
      initial="hidden"
      animate="visible"
      exit="exit"
      variants={speakerCardVariants}
      transition={{ duration: 0.24, ease: "easeOut" }}
    >
      <DropdownMenu.Root open={openInviteMenu} onOpenChange={setOpenInviteMenu}>
        <DropdownMenu.Trigger asChild>
          <button className="flex flex-col items-center justify-center pt-4">
            <span className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-border bg-card text-muted-foreground">
              <Plus className="h-6 w-6" />
            </span>
            <span className="mt-2 text-sm font-medium text-muted-foreground">Invite</span>
            <span className="mt-2 text-base text-muted-foreground">Add Speaker</span>
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            align="end"
            sideOffset={10}
            className="z-50 w-72 rounded-[14px] border border-border bg-card p-3 shadow-xl"
          >
            <div className="mb-2 flex items-center justify-between rounded-[8px] px-1 py-1">
              <span className="text-xs font-extrabold uppercase tracking-[0.12em] text-muted-foreground">
                Invite listener
              </span>
              <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
            </div>

            <div className="mb-3">
              <p className="mb-2 text-xs font-extrabold text-muted-foreground">Raising hand</p>
              {requestQueue.length > 0 ? (
                <motion.div layout className="thin-scrollbar max-h-32 space-y-2 overflow-y-auto">
                  <AnimatePresence initial={false}>
                    {requestQueue.map((request) => (
                      <motion.div
                        key={request.id}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        variants={speakerCardVariants}
                        transition={{ duration: 0.2 }}
                      >
                        <DropdownMenu.Item
                          className="rounded-[10px] border border-border bg-muted/45 px-2 py-2 outline-none"
                          onSelect={() => addSpeakerToStage(request.person, request.id)}
                        >
                          <span className="flex w-full items-center justify-between gap-2 text-left">
                            <span className="flex min-w-0 items-center gap-2">
                              <Avatar
                                src={request.person.avatar}
                                name={request.person.name}
                                size={28}
                              />
                              <span className="min-w-0">
                                <span className="block truncate text-sm font-bold text-foreground">
                                  {request.person.name}
                                </span>
                                <span className="block truncate text-[10px] text-muted-foreground">
                                  {request.requestedAt}
                                </span>
                              </span>
                            </span>
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/12 px-2 py-1 text-[10px] font-bold text-emerald-600">
                              <HandPalm className="h-3.5 w-3.5" />
                              Add
                            </span>
                          </span>
                        </DropdownMenu.Item>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </motion.div>
              ) : (
                <p className="rounded-[10px] border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                  No listeners are currently raising hand.
                </p>
              )}
            </div>

            <div>
              <p className="mb-2 text-xs font-extrabold text-muted-foreground">Other listeners</p>
              <div className="thin-scrollbar max-h-28 space-y-2 overflow-y-auto">
                {listenerInviteCandidates.length > 0 ? (
                  <AnimatePresence initial={false}>
                    {listenerInviteCandidates.map((listener) => (
                      <motion.div
                        key={listener.id}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        variants={speakerCardVariants}
                        transition={{ duration: 0.2 }}
                      >
                        <DropdownMenu.Item
                          className="rounded-[10px] border border-border bg-muted/35 px-2 py-2 outline-none"
                          onSelect={() => addSpeakerToStage(listener)}
                        >
                          <span className="flex w-full items-center justify-between gap-2 text-left">
                            <span className="flex min-w-0 items-center gap-2">
                              <Avatar src={listener.avatar} name={listener.name} size={28} />
                              <span className="min-w-0">
                                <span className="block truncate text-sm font-bold text-foreground">
                                  {listener.name}
                                </span>
                                <span className="block truncate text-[10px] text-muted-foreground">
                                  @{listener.username}
                                </span>
                              </span>
                            </span>
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/12 px-2 py-1 text-[10px] font-bold text-primary">
                              <Plus className="h-3 w-3" />
                              Add
                            </span>
                          </span>
                        </DropdownMenu.Item>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                ) : (
                  <p className="rounded-[10px] border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                    No additional listeners available.
                  </p>
                )}
              </div>
            </div>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </motion.div>
  );

  return (
    <section className="rounded-[12px] border border-border bg-card p-5 shadow-sm">
      <div className="mb-3 flex min-h-9 flex-wrap items-center gap-2 text-sm font-extrabold text-primary">
        <span className="inline-flex items-center gap-2">
          <UserRoundPlus className="h-4 w-4" />
          ON STAGE — {onStageSpeakers.length} • {speakingCount} speaking
        </span>
        <AnimatePresence mode="popLayout">
          {raiseHandPulse ? (
            <motion.div
              key={raiseHandPulse.id}
              layout
              initial={{ opacity: 0, y: 12, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.96 }}
              transition={{ duration: 0.28, ease: "easeOut" }}
              className="relative ml-auto flex min-w-0 items-center gap-2 overflow-hidden rounded-full border border-yellow-300/35 bg-gradient-to-r from-yellow-300/20 via-amber-200/18 to-sky-200/18 px-2.5 py-1.5 text-foreground shadow-[0_12px_34px_rgba(245,158,11,0.16)]"
            >
              <motion.span
                aria-hidden="true"
                className="absolute inset-y-0 left-0 w-10 bg-white/25 blur-xl"
                initial={{ x: -44 }}
                animate={{ x: 190 }}
                transition={{ duration: 1.15, repeat: 1, ease: "easeInOut" }}
              />
              {[0, 1, 2].map((item) => (
                <motion.span
                  key={item}
                  aria-hidden="true"
                  className="absolute right-4 top-1 h-1.5 w-1.5 rounded-full bg-yellow-400/75"
                  initial={{ opacity: 0, y: 8, scale: 0.5 }}
                  animate={{ opacity: [0, 1, 0], y: [-2, -18, -30], scale: [0.5, 1, 0.75] }}
                  transition={{ duration: 1.4, delay: item * 0.18, repeat: 1, ease: "easeOut" }}
                />
              ))}
              <Avatar
                src={raiseHandPulse.person.avatar}
                name={raiseHandPulse.person.name}
                size={24}
                className="relative z-10 border border-background shadow-sm"
              />
              <span className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-yellow-400 text-yellow-950 shadow-sm">
                <HandPalm className="h-3.5 w-3.5" />
              </span>
              <span className="relative z-10 min-w-0 truncate text-xs font-black text-foreground">
                {raiseHandPulse.person.name} raised hand
              </span>
              <span className="relative z-10 text-[10px] font-bold text-muted-foreground">
                {raiseHandPulse.requestedAt}
              </span>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
      <div className="mx-auto w-full min-h-[320px]">
        <div className="flex w-full flex-col gap-4">
          <AnimatePresence mode="wait" initial={false}>
            {shouldPrioritizeCurrentUser && currentUserSpeaker ? (
              <motion.div
                key="layout-current-user"
                initial="hidden"
                animate="visible"
                exit="exit"
                variants={speakerPanelVariants}
                transition={{ duration: 0.24, ease: "easeOut" }}
                className="flex w-full flex-col gap-4"
              >
                <div className="flex w-full justify-center">
                  {renderSpeakerCard(currentUserSpeaker, {
                    primary: true,
                    isCurrentUserFocus: true,
                  })}
                </div>
                <div className="flex min-h-0 flex-wrap items-end justify-center gap-3">
                  {visibleSpeakers.map((speaker) => renderSpeakerCard(speaker, { compact: true }))}
                  {renderInviteButton()}
                </div>
              </motion.div>
            ) : hasMultipleActiveSpeakers ? (
              <motion.div
                key="layout-multiple"
                initial="hidden"
                animate="visible"
                exit="exit"
                variants={speakerPanelVariants}
                transition={{ duration: 0.24, ease: "easeOut" }}
                className="flex min-w-0 flex-wrap items-start gap-3 pb-1"
              >
                {onStageSpeakers.map((speaker) => renderSpeakerCard(speaker, { compact: true }))}
                {renderInviteButton()}
              </motion.div>
            ) : hasSingleActiveSpeaker && focusedSpeaker ? (
              <motion.div
                key="layout-single"
                initial="hidden"
                animate="visible"
                exit="exit"
                variants={speakerPanelVariants}
                transition={{ duration: 0.24, ease: "easeOut" }}
                className="flex w-full flex-col gap-4"
              >
                <div className="flex w-full justify-center">
                  {renderSpeakerCard(focusedSpeaker, { primary: true })}
                </div>
                <div className="flex min-h-0 flex-wrap items-end justify-center gap-3">
                  {onStageSpeakers
                    .filter((speaker) => speaker.id !== focusedSpeaker.id)
                    .map((speaker) => renderSpeakerCard(speaker, { compact: true }))}
                  {renderInviteButton()}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="layout-grid"
                initial="hidden"
                animate="visible"
                exit="exit"
                variants={speakerPanelVariants}
                transition={{ duration: 0.24, ease: "easeOut" }}
                className="grid w-full grid-cols-[repeat(auto-fit,minmax(120px,1fr))] items-start gap-4"
              >
                {onStageSpeakers.map((speaker) => renderSpeakerCard(speaker))}
                {renderInviteButton()}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
