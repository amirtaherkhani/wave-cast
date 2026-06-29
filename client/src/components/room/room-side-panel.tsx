"use client";

import { useMemo, useState } from "react";
import {
  ChatCircle as MessageCircle,
  PaperPlaneRight,
  UserCirclePlus as UserRoundPlus,
  UsersThree as UsersRound,
  X,
  Pulse,
  ArrowBendUpLeft,
} from "@phosphor-icons/react/ssr";
import { ContextMenu } from "radix-ui";

import { Avatar } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { WaveCastLogo } from "@/components/common/logo";
import { alex, people, realtimeEvents, room } from "@/features/wavecast/mock-data";
import { useUiStore } from "@/stores/ui-store";
import { cn } from "@/lib/utils";
import {
  Message,
  MessageAvatar,
  MessageContent,
  MessageHeader,
} from "@/components/ui/message";
import { Bubble, BubbleContent, BubbleReactions } from "@/components/ui/bubble";
import { ChatLinkPreviews, ChatMessageText } from "@/components/room/chat-media-preview";
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@/components/ui/message-scroller";
import type { Person } from "@/types/wavecast";
import { toast } from "sonner";
import { Smile } from "lucide-react";

type RoomChatMessage = {
  id: string;
  name: string;
  avatar: string;
  time: string;
  body: string;
  replyTo?: {
    name: string;
    body: string;
  };
  likes: number;
  dislikes: number;
  userReaction?: "like" | "dislike" | null;
  emojiReactions?: Partial<Record<QuickReaction, number>>;
  userEmojiReaction?: QuickReaction | null;
};

const tabs = [
  { key: "chat", label: "Room", icon: MessageCircle },
  { key: "people", label: "People", icon: UsersRound },
  { key: "activity", label: "Activity", icon: Pulse },
] as const;

type HubTab = (typeof tabs)[number]["key"];

const EMOJI_OPTIONS = ["😀", "😂", "🔥", "🚀", "🙌", "❤️", "🎉", "👍", "💬", "🤔"];
const QUICK_REACTIONS = ["👍", "👎", "😂", "❤️", "🔥"] as const;
type QuickReaction = (typeof QUICK_REACTIONS)[number];

const bubbleReactionTrayClass = "gap-1 bg-transparent p-0 ring-0 has-[button]:p-0";
const reactionCircleClass =
  "relative inline-flex h-7 w-7 items-center justify-center rounded-full border border-border/70 bg-card text-[13px] shadow-sm transition hover:-translate-y-0.5 hover:bg-muted";
const reactionCountClass =
  "absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full border border-border bg-background px-1 text-[9px] font-extrabold leading-none text-muted-foreground shadow-sm";
const contextMenuContentClass =
  "z-50 min-w-[220px] rounded-[14px] border border-border bg-popover/95 p-2 text-popover-foreground shadow-2xl outline-none backdrop-blur data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95";
const contextEmojiButtonClass =
  "flex h-9 w-9 cursor-default select-none items-center justify-center rounded-full border border-border/70 bg-card text-lg shadow-sm outline-none transition data-[highlighted]:-translate-y-0.5 data-[highlighted]:bg-muted data-[highlighted]:ring-2 data-[highlighted]:ring-ring/25";
const contextMenuItemClass =
  "flex h-9 cursor-default select-none items-center gap-2 rounded-[10px] px-3 text-sm font-semibold outline-none transition data-[highlighted]:bg-muted data-[highlighted]:text-foreground";
const replyQuoteClass =
  "rounded-[10px] border-l-2 border-primary/70 bg-background/25 px-2.5 py-2 text-xs shadow-inner";
const replyPreviewClass =
  "mb-2 flex min-w-0 items-start justify-between gap-2 rounded-[12px] border border-border bg-muted/70 px-3 py-2 shadow-sm";

const seedRoomMessages: RoomChatMessage[] = [
  {
    id: "seed-room-message-sarah",
    name: "Sarah Wilson",
    avatar: people[3].avatar,
    time: "2m ago",
    body: "Great insights so far! 👏",
    likes: 12,
    dislikes: 0,
    userReaction: null,
  },
  {
    id: "seed-room-message-james",
    name: "James Lee",
    avatar: people[4].avatar,
    time: "1m ago",
    body: "Can we talk about the real-world applications of this?",
    likes: 8,
    dislikes: 0,
    userReaction: null,
  },
  {
    id: "seed-room-message-priya",
    name: "Priya Shah",
    avatar: people[5].avatar,
    time: "just now",
    body: "Would love to hear more about the future trends!",
    likes: 5,
    dislikes: 0,
    userReaction: null,
  },
];

const makeMessageId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const getRoomReactionCount = (message: RoomChatMessage, reaction: QuickReaction) => {
  if (reaction === "👍") return message.likes;
  if (reaction === "👎") return message.dislikes;

  return message.emojiReactions?.[reaction] ?? 0;
};

const hasRoomUserReaction = (message: RoomChatMessage, reaction: QuickReaction) => {
  if (reaction === "👍") return message.userReaction === "like";
  if (reaction === "👎") return message.userReaction === "dislike";

  return message.userEmojiReaction === reaction;
};

const getVisibleRoomReactions = (message: RoomChatMessage) =>
  QUICK_REACTIONS.filter((reaction) =>
    reaction === "👍" || reaction === "👎" || getRoomReactionCount(message, reaction) > 0,
  );

export function RoomSidePanel() {
  const { activeRoomTab, setActiveRoomTab, setActiveP2PFriendId } = useUiStore();
  const initialRoomPeople = useMemo(
    () =>
      Array.from(
        new Map([room.owner, ...room.listeners].map((person) => [person.id, person])).values(),
      ),
    [],
  );
  const [roomPeople, setRoomPeople] = useState(initialRoomPeople);
  const friendIds = useMemo(
    () => new Set(roomPeople.filter((person) => person.isFriend).map((person) => person.id)),
    [roomPeople],
  );
  const [roomMessages, setRoomMessages] = useState<RoomChatMessage[]>(seedRoomMessages);
  const [requestedIds, setRequestedIds] = useState<Set<string>>(new Set());
  const [chatText, setChatText] = useState("");
  const [showRoomEmojiPicker, setShowRoomEmojiPicker] = useState(false);
  const [replyingToMessage, setReplyingToMessage] = useState<RoomChatMessage | null>(null);

  const isFriend = (personId: string) => friendIds.has(personId);
  const isSelf = (personId: string) => personId === alex.id;
  const canModerateRoom = ["Host", "Moderator", "Admin"].includes(alex.role);

  const roomActivity = useMemo(
    () => realtimeEvents.filter((event) => event.room === room.title),
    [],
  );

  const appendRoomMessage = (body: string) => {
    const text = body.trim();
    if (!text) return;

    setRoomMessages((current) => [
      ...current,
      {
        id: makeMessageId(),
        name: "You",
        avatar: alex.avatar,
        time: "just now",
        body: text,
        replyTo: replyingToMessage
          ? {
              name: replyingToMessage.name,
              body: replyingToMessage.body,
            }
          : undefined,
        likes: 0,
        dislikes: 0,
        userReaction: null,
        emojiReactions: {},
        userEmojiReaction: null,
      },
    ]);

    setReplyingToMessage(null);
  };

  const toggleRoomMessageReaction = (messageId: string, action: "like" | "dislike") => {
    setRoomMessages((current) =>
      current.map((message) => {
        if (message.id !== messageId) return message;

        const currentReaction = message.userReaction ?? null;
        let nextLikes = message.likes;
        let nextDislikes = message.dislikes;
        let nextReaction: RoomChatMessage["userReaction"] = action;

        if (currentReaction === action) {
          if (action === "like") {
            nextLikes = Math.max(0, nextLikes - 1);
          } else {
            nextDislikes = Math.max(0, nextDislikes - 1);
          }

          nextReaction = null;
        } else {
          if (currentReaction === "like") {
            nextLikes = Math.max(0, nextLikes - 1);
          } else if (currentReaction === "dislike") {
            nextDislikes = Math.max(0, nextDislikes - 1);
          }

          if (action === "like") {
            nextLikes += 1;
          } else {
            nextDislikes += 1;
          }
        }

        return {
          ...message,
          likes: nextLikes,
          dislikes: nextDislikes,
          userReaction: nextReaction,
        };
      }),
    );
  };

  const toggleRoomEmojiReaction = (messageId: string, reaction: QuickReaction) => {
    if (reaction === "👍") {
      toggleRoomMessageReaction(messageId, "like");
      return;
    }

    if (reaction === "👎") {
      toggleRoomMessageReaction(messageId, "dislike");
      return;
    }

    setRoomMessages((current) =>
      current.map((message) => {
        if (message.id !== messageId) return message;

        const currentReaction = message.userEmojiReaction ?? null;
        const emojiReactions = { ...(message.emojiReactions ?? {}) };
        const currentCount = emojiReactions[reaction] ?? 0;

        if (currentReaction === reaction) {
          emojiReactions[reaction] = Math.max(0, currentCount - 1);
          return {
            ...message,
            emojiReactions,
            userEmojiReaction: null,
          };
        }

        if (currentReaction && currentReaction !== "👍" && currentReaction !== "👎") {
          emojiReactions[currentReaction] = Math.max(0, (emojiReactions[currentReaction] ?? 0) - 1);
        }

        emojiReactions[reaction] = currentCount + 1;

        return {
          ...message,
          emojiReactions,
          userEmojiReaction: reaction,
        };
      }),
    );
  };

  const handleSendRoomChat = () => {
    appendRoomMessage(chatText);
    setChatText("");
    setShowRoomEmojiPicker(false);
  };

  const addRoomEmoji = (emoji: string) => {
    setChatText((current) => (current ? `${current} ${emoji}` : emoji));
    setShowRoomEmojiPicker(false);
  };

  const handleReplyToMessage = (message: RoomChatMessage) => {
    if (replyingToMessage?.id === message.id) {
      setReplyingToMessage(null);
      return;
    }

    setReplyingToMessage(message);
  };

  const requestFriend = (person: Person) => {
    setRequestedIds((current) => {
      const next = new Set(current);
      next.add(person.id);
      return next;
    });

    toast.success("Connection request sent", {
      description: `Your request was sent to ${person.name}.`,
    });
  };

  const handleKickPerson = (person: Person) => {
    if (person.id === alex.id) {
      toast.error("Cannot remove yourself", {
        description: "You cannot remove yourself from this room from the people list.",
      });
      return;
    }

    if (!canModerateRoom) {
      toast.error("Permission denied", {
        description: "Only moderators can remove people from the room.",
      });
      return;
    }

    if (person.role === "Host") {
      toast.error("Cannot remove host", {
        description: "The room host cannot be removed from the room.",
      });
      return;
    }

    if (window.confirm(`Remove ${person.name} from this room?`)) {
      setRoomPeople((current) => current.filter((member) => member.id !== person.id));
      setRequestedIds((current) => {
        const next = new Set(current);
        next.delete(person.id);
        return next;
      });

      toast.success("Person removed", {
        description: `${person.name} has been kicked from the room.`,
      });
    }
  };

  return (
    <aside className="live-room-aside flex h-full min-h-0 flex-col overflow-hidden border-l border-border bg-card px-2 py-9">
      <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[12px] border border-border bg-card shadow-sm">
        <Tabs
          value={activeRoomTab}
          onValueChange={(value) => setActiveRoomTab(value as HubTab)}
          className="flex min-h-0 flex-1 flex-col gap-0"
        >
          <TabsList className="relative z-20 mx-auto mb-3 mt-2 grid min-h-12 w-[calc(100%-2rem)] shrink-0 grid-cols-3 overflow-visible rounded-[12px] bg-muted/75 p-1.5 text-xs shadow-sm sm:text-sm">
            {tabs.map(({ key, label, icon: Icon }) => (
              <TabsTrigger
                key={key}
                value={key}
                className="flex h-9 w-full items-center justify-center gap-1.5 whitespace-nowrap rounded-[10px] px-2 py-0 leading-none after:hidden data-active:shadow-sm"
              >
                <Icon className="h-4 w-4" />
                {label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="chat" className="relative z-0 mt-0 min-h-0 flex-1 overflow-hidden">
            <div className="flex min-h-0 h-full flex-col">
              <MessageScrollerProvider autoScroll>
                <MessageScroller className="rounded-[14px] shadow-sm">
                  <MessageScrollerViewport className="px-3 py-3">
                        <MessageScrollerContent className="space-y-4">
                      {roomMessages.map((message) => (
                        <MessageScrollerItem
                          key={message.id}
                          messageId={message.id}
                          scrollAnchor={message.name === "You"}
                        >
                          <Message align={message.name === "You" ? "end" : "start"}>
                            <MessageAvatar>
                              <Avatar src={message.avatar} name={message.name} size={34} />
                            </MessageAvatar>
                            <MessageContent>
                              <MessageHeader className="justify-between">
                                <span className="max-w-[70%] truncate font-extrabold text-foreground">
                                  {message.name}
                                </span>
                                <span className="shrink-0 text-muted-foreground">{message.time}</span>
                              </MessageHeader>
                              <ContextMenu.Root>
                                <ContextMenu.Trigger asChild>
                                  <Bubble
                                    align={message.name === "You" ? "end" : "start"}
                                    variant={message.name === "You" ? "secondary" : "default"}
                                    className={cn(
                                      "mb-5",
                                      message.name === "You"
                                        ? "chat-bubble-enter-right"
                                        : "chat-bubble-enter-left",
                                    )}
                                  >
                                    <BubbleContent className="space-y-2">
                                      {message.replyTo ? (
                                        <div className={replyQuoteClass}>
                                          <span className="block font-extrabold opacity-95">
                                            {message.replyTo.name}
                                          </span>
                                          <span className="mt-0.5 block max-h-10 overflow-hidden opacity-75">
                                            {message.replyTo.body}
                                          </span>
                                        </div>
                                      ) : null}
                                      <ChatMessageText text={message.body} />
                                      <ChatLinkPreviews text={message.body} />
                                    </BubbleContent>
                                    <BubbleReactions
                                      side="bottom"
                                      align="start"
                                      className={bubbleReactionTrayClass}
                                      aria-label={`Reactions for ${message.name}`}
                                    >
                                      {getVisibleRoomReactions(message).map((reaction) => (
                                        <button
                                          key={reaction}
                                          type="button"
                                          onClick={() => toggleRoomEmojiReaction(message.id, reaction)}
                                          className={cn(
                                            reactionCircleClass,
                                            hasRoomUserReaction(message, reaction)
                                              ? "reaction-added-pop border-primary/45 bg-primary/15 text-primary"
                                              : "text-muted-foreground",
                                          )}
                                          aria-label={`React ${reaction} to ${message.name}'s message`}
                                          aria-pressed={hasRoomUserReaction(message, reaction)}
                                        >
                                          <span aria-hidden>{reaction}</span>
                                          <span
                                            key={`${message.id}-${reaction}-${getRoomReactionCount(message, reaction)}`}
                                            className={cn(
                                              reactionCountClass,
                                              hasRoomUserReaction(message, reaction) && "reaction-count-pop",
                                            )}
                                          >
                                            {getRoomReactionCount(message, reaction)}
                                          </span>
                                        </button>
                                      ))}
                                    </BubbleReactions>
                                  </Bubble>
                                </ContextMenu.Trigger>
                                <ContextMenu.Portal>
                                  <ContextMenu.Content className={contextMenuContentClass}>
                                    <div className="grid grid-cols-5 gap-1.5 rounded-[12px] bg-muted/55 p-1.5">
                                      {QUICK_REACTIONS.map((reaction) => (
                                        <ContextMenu.Item
                                          key={reaction}
                                          className={cn(
                                            contextEmojiButtonClass,
                                            hasRoomUserReaction(message, reaction)
                                              ? "border-primary/45 bg-primary/15 text-primary"
                                              : "",
                                          )}
                                          onSelect={() => toggleRoomEmojiReaction(message.id, reaction)}
                                          aria-label={`React with ${reaction}`}
                                        >
                                          {reaction}
                                        </ContextMenu.Item>
                                      ))}
                                    </div>
                                    <ContextMenu.Separator className="my-2 h-px bg-border" />
                                    <ContextMenu.Item
                                      className={contextMenuItemClass}
                                      onSelect={() => handleReplyToMessage(message)}
                                    >
                                      <ArrowBendUpLeft className="h-4 w-4 text-muted-foreground" />
                                      Reply
                                    </ContextMenu.Item>
                                  </ContextMenu.Content>
                                </ContextMenu.Portal>
                              </ContextMenu.Root>
                            </MessageContent>
                          </Message>
                        </MessageScrollerItem>
                      ))}

                      <MessageScrollerItem>
                        <div className="rounded-[14px] bg-muted p-4">
                          <div className="mb-2 flex items-center gap-3">
                            <WaveCastLogo compact imageClassName="h-7" />
                            <div>
                              <p className="font-extrabold text-foreground">WaveCast</p>
                              <p className="text-xs text-muted-foreground">just now</p>
                            </div>
                          </div>
                          <p className="text-sm font-medium text-foreground">
                            Brian Miller has invited you to speak
                          </p>
                          <Button className="mt-3 h-7 rounded-[7px] px-3 !text-xs" variant="soft">
                            Go On Stage
                          </Button>
                        </div>
                      </MessageScrollerItem>
                    </MessageScrollerContent>
                  </MessageScrollerViewport>
                  <MessageScrollerButton direction="end" className="px-3 py-1 text-[11px]">
                    Jump to latest
                  </MessageScrollerButton>
                </MessageScroller>
              </MessageScrollerProvider>

              <div className="border-t border-border/80 px-4 py-4">
                {replyingToMessage ? (
                  <div className={replyPreviewClass}>
                    <span className="min-w-0 border-l-2 border-primary/70 pl-2.5 text-[11px] text-muted-foreground">
                      <span className="block font-extrabold text-foreground">
                        {replyingToMessage.name}
                      </span>
                      <span className="block truncate">
                        {replyingToMessage.body}
                      </span>
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 rounded-full"
                      onClick={() => setReplyingToMessage(null)}
                      aria-label="Cancel reply"
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ) : null}
                <div className="relative flex h-12 items-center rounded-[10px] border border-border px-4">
                  <input
                    className="min-w-0 flex-1 border-0 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                    placeholder="Send a message..."
                    value={chatText}
                    onChange={(event) => setChatText(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        setShowRoomEmojiPicker(false);
                        handleSendRoomChat();
                      }
                    }}
                  />
                  <Button
                    type="button"
                    onClick={() => setShowRoomEmojiPicker((current) => !current)}
                    size="icon"
                    variant="ghost"
                    className="h-9 w-9 rounded-full"
                    aria-label="Insert emoji"
                  >
                    <Smile className="h-4 w-4" />
                  </Button>
                  {showRoomEmojiPicker ? (
                    <div className="absolute inset-x-0 bottom-full mb-2 flex flex-wrap gap-1 rounded-[10px] border border-border bg-card p-2 shadow-lg">
                      {EMOJI_OPTIONS.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          className="min-w-8 rounded-[6px] bg-muted/60 px-1.5 py-1 text-base leading-none hover:bg-muted"
                          onClick={() => addRoomEmoji(emoji)}
                          aria-label={`Insert emoji ${emoji}`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  ) : null}
                  <Button
                    onClick={handleSendRoomChat}
                    size="icon"
                    variant="ghost"
                    aria-label="Send message"
                    className={cn("h-9 w-9 rounded-full", {
                      "text-muted-foreground": !chatText.trim(),
                      "text-primary": Boolean(chatText.trim()),
                    })}
                  >
                    <PaperPlaneRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="people" className="relative z-0 mt-0 h-full min-h-0 overflow-hidden">
            <div className="flex min-h-0 h-full flex-col space-y-4 p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-extrabold text-foreground">Room People</p>
                <span className="text-xs font-semibold text-muted-foreground">
                  {roomPeople.length} in room
                </span>
              </div>
              <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">
                {roomPeople.map((person) => {
                  const isPersonFriend = isFriend(person.id);
                  const requestSent = requestedIds.has(person.id);

                  return (
                    <div
                      key={person.id}
                      className={cn(
                        "group/card flex min-h-[64px] items-center gap-3 rounded-[12px] border px-2 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:scale-[1.01] hover:border-primary/40 hover:bg-muted/70 hover:shadow-sm",
                        person.role === "Speaker"
                          ? "bg-gradient-to-br from-chart-2/3 via-chart-2/3 to-chart-2/3 border-chart-2/8"
                          : "bg-card border-border",
                      )}
                    >
                      <Avatar src={person.avatar} name={person.name} size={36} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-extrabold text-foreground">
                          {person.name}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          @{person.username}
                        </span>
                      </span>
                      <span className="rounded-full bg-muted px-2 py-1 text-[10px] font-bold text-muted-foreground">
                        {person.role}
                      </span>
                      <span className="shrink-0">
                        {isSelf(person.id) ? (
                          <span className="text-xs font-semibold text-muted-foreground">You</span>
                        ) : isPersonFriend ? (
                          <span className="flex items-center gap-1.5">
                            <Button
                              onClick={() => {
                                setActiveP2PFriendId(person.id);
                              }}
                              size="icon"
                              variant="outline"
                              className="h-7 w-7"
                              aria-label={`Open chat with ${person.name}`}
                            >
                              <MessageCircle className="h-4 w-4" />
                            </Button>
                            {canModerateRoom ? (
                              <Button
                                onClick={() => handleKickPerson(person)}
                                size="icon"
                                variant="danger"
                                className="h-7 w-7"
                                aria-label={`Kick ${person.name} from room`}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            ) : null}
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5">
                            <Button
                              onClick={() => requestFriend(person)}
                              disabled={requestSent}
                              size="icon"
                              variant="secondary"
                              className="h-7 w-7"
                              aria-label={
                                requestSent
                                  ? `Request already sent to ${person.name}`
                                  : `Send request to ${person.name}`
                              }
                            >
                              <UserRoundPlus className="h-4 w-4" />
                            </Button>
                            {canModerateRoom ? (
                              <Button
                                onClick={() => handleKickPerson(person)}
                                size="icon"
                                variant="danger"
                                className="h-7 w-7"
                                aria-label={`Kick ${person.name} from room`}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            ) : null}
                          </span>
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="activity" className="relative z-0 mt-0 h-full min-h-0 overflow-hidden p-4">
            <p className="mb-3 text-sm font-extrabold text-foreground">Room Activity</p>
            {roomActivity.length > 0 ? (
              <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">
                {roomActivity.map((event) => (
                  <div
                    key={`${event.time}-${event.event}`}
                    className="rounded-[10px] border border-border bg-muted/40 p-3 shadow-sm"
                  >
                    <p className="text-xs font-extrabold text-foreground">
                      {event.time} · {event.event.replace(/\./g, " ")}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">{event.details}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No activity updates yet.</p>
            )}
          </TabsContent>
        </Tabs>
      </section>
    </aside>
  );
}
