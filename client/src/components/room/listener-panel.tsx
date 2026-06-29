"use client";

import type { ChangeEvent, CSSProperties } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  HandPalm as RaiseHandIcon,
  ChatCircle as MessageCircle,
  Microphone as Mic,
  SignOut as LogOut,
  UsersThree as UsersRound,
  X,
  MagnifyingGlass,
  ArrowLeft,
  ArrowBendUpLeft,
  PaperPlaneRight,
} from "@phosphor-icons/react/ssr";
import { AlertDialog, ContextMenu, Dialog as DialogPrimitive } from "radix-ui";
import { AnimatePresence, motion } from "framer-motion";
import { Avatar, AvatarGroupCount } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Message,
  MessageAvatar,
  MessageContent,
  MessageHeader,
  MessageGroup,
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
import {
  File as FileIcon,
  Image as ImageIcon,
  Paperclip as PaperclipIcon,
  ChevronDown,
  ChevronUp,
  Download,
  Smile,
  Video as VideoIcon,
} from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { alex, room } from "@/features/wavecast/mock-data";
import { useSpeakerStore } from "@/stores/speaker-store";
import { useUiStore } from "@/stores/ui-store";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { RaiseHandsList } from "@/components/room/raise-hands-list";
import type { Person } from "@/types/wavecast";

type P2PMessage = {
  id: string;
  name: string;
  avatar: string;
  time: string;
  text: string;
  replyTo?: {
    name: string;
    text: string;
  };
  isYou: boolean;
  isUnread?: boolean;
  likes?: number;
  dislikes?: number;
  userReaction?: "like" | "dislike" | null;
  emojiReactions?: Partial<Record<QuickReaction, number>>;
  userEmojiReaction?: QuickReaction | null;
  attachment?: {
    type: "file" | "image" | "video" | "other";
    name: string;
    size?: number;
    mimeType?: string;
    sourceLabel: string;
    previewUrl?: string;
    downloadUrl?: string;
  };
};

type P2PConversation = {
  messages: P2PMessage[];
  unreadCount: number;
};

type P2PChatListEntry = {
  person: Person;
  messages: P2PMessage[];
  unreadCount: number;
  lastMessage: P2PMessage | null;
  isActive: boolean;
  isHandRaised: boolean;
};

const TypingIndicator = () => (
  <span aria-live="polite" aria-label="Typing message" className="inline-flex items-end gap-1">
    <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/80 animate-bounce [animation-duration:900ms] [animation-delay:0ms]" />
    <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/80 animate-bounce [animation-duration:900ms] [animation-delay:120ms]" />
    <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/80 animate-bounce [animation-duration:900ms] [animation-delay:240ms]" />
  </span>
);

const listenerListItemVariants = {
  hidden: { opacity: 0, y: 12, scale: 0.98 },
  visible: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -8, scale: 0.98 },
};

const getRoleIcon = (role: string) => {
  if (role === "Listener") {
    return <UsersRound className="h-3 w-3 text-chart-3" />;
  }

  if (role === "Speaker") {
    return <Mic className="h-3 w-3 text-chart-2" />;
  }

  return <Mic className="h-3 w-3 text-chart-4" />;
};

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

const getP2PReactionCount = (message: P2PMessage, reaction: QuickReaction) => {
  if (reaction === "👍") return message.likes ?? 0;
  if (reaction === "👎") return message.dislikes ?? 0;

  return message.emojiReactions?.[reaction] ?? 0;
};

const hasP2PUserReaction = (message: P2PMessage, reaction: QuickReaction) => {
  if (reaction === "👍") return message.userReaction === "like";
  if (reaction === "👎") return message.userReaction === "dislike";

  return message.userEmojiReaction === reaction;
};

const getVisibleP2PReactions = (message: P2PMessage) =>
  QUICK_REACTIONS.filter((reaction) =>
    reaction === "👍" || reaction === "👎" || getP2PReactionCount(message, reaction) > 0,
  );

export function ListenerPanel() {
  const makeMessageId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

  const roomParticipants = useMemo(() => {
    const unique = new Map<string, Person>();
    [room.owner, ...room.speakers, ...room.listeners].forEach((person) => {
      if (person.id !== alex.id) {
        unique.set(person.id, person);
      }
    });

    return Array.from(unique.values());
  }, []);
  const activeFriendId = useUiStore((state) => state.activeP2PFriendId);
  const setActiveP2PFriendId = useUiStore((state) => state.setActiveP2PFriendId);
  const activeFriend = useMemo(
    () => roomParticipants.find((person) => person.id === activeFriendId),
    [activeFriendId, roomParticipants],
  );
  const makeSeedConversation = (person: Person, index: number): P2PConversation => {
    const hasHistory = index % 3 !== 2;
    const seededMessage = hasHistory
      ? [
              {
                id: `seed-${person.id}-0`,
                name: person.name,
                avatar: person.avatar,
                time: "2m ago",
                text: `${person.name.split(" ")[0]} was asking a question.`,
                isYou: false,
                isUnread: index % 3 === 0,
                likes: 0,
                dislikes: 0,
                userReaction: null,
              },
            ]
          : [];

    return {
      messages: seededMessage,
      unreadCount: hasHistory && index % 3 === 0 ? 1 : 0,
    };
  };
  const [p2pConversations, setP2PConversations] = useState<Record<string, P2PConversation>>(() =>
    roomParticipants.reduce<Record<string, P2PConversation>>((acc, person, index) => {
      acc[person.id] = makeSeedConversation(person, index);
      return acc;
    }, {}),
  );
  const [p2pText, setP2pText] = useState("");
  const [isP2PDrawerOpen, setIsP2PDrawerOpen] = useState(false);
  const [chatSearch, setChatSearch] = useState("");
  const [isAllListenersDialogOpen, setIsAllListenersDialogOpen] = useState(false);
  const [selectedListener, setSelectedListener] = useState<Person | null>(null);
  const [showP2PEmojiPicker, setShowP2PEmojiPicker] = useState(false);
  const [showP2PTyping, setShowP2PTyping] = useState(false);
  const [isThreadListOpen, setIsThreadListOpen] = useState(true);
  const [replyingP2PMessage, setReplyingP2PMessage] = useState<P2PMessage | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const p2pTypingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const attachmentUrlRef = useRef<Set<string>>(new Set());
  const setP2PUnreadCount = useUiStore((state) => state.setP2PUnreadCount);

  const { micEnabled, requestPending, toggleMic, toggleRequest, speakerRequests } =
    useSpeakerStore();

  const totalUnreadCount = useMemo(
    () =>
      Object.values(p2pConversations).reduce(
        (total, conversation) => total + conversation.unreadCount,
        0,
      ),
    [p2pConversations],
  );

  useEffect(() => {
    setP2PUnreadCount(totalUnreadCount);
  }, [setP2PUnreadCount, totalUnreadCount]);

  useEffect(() => {
    const urls = attachmentUrlRef.current;

    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
      urls.clear();
    };
  }, []);

  const activeFriendMessages = useMemo(() => {
    if (!activeFriend?.id) {
      return [];
    }

    return p2pConversations[activeFriend.id]?.messages ?? [];
  }, [activeFriend, p2pConversations]);

  const markConversationThreadAsRead = (personId: string) => {
    setP2PConversations((current) => {
      const conversation = current[personId];
      if (!conversation) {
        return current;
      }

      const hasUnread = conversation.messages.some((message) => message.isUnread);
      if (hasUnread) {
        return current;
      }

      if (conversation.unreadCount === 0) {
        return current;
      }

      return {
        ...current,
        [personId]: {
          ...conversation,
          messages: conversation.messages.map((message) => ({ ...message, isUnread: false })),
          unreadCount: 0,
        },
      };
    });
  };

  useEffect(() => {
    if (!activeFriendId) {
      setShowP2PTyping(false);
      if (p2pTypingTimeoutRef.current) {
        clearTimeout(p2pTypingTimeoutRef.current);
        p2pTypingTimeoutRef.current = null;
      }
      return;
    }

    if (!p2pText.trim()) {
      setShowP2PTyping(false);
      if (p2pTypingTimeoutRef.current) {
        clearTimeout(p2pTypingTimeoutRef.current);
        p2pTypingTimeoutRef.current = null;
      }
      return;
    }

    setShowP2PTyping(true);
    if (p2pTypingTimeoutRef.current) {
      clearTimeout(p2pTypingTimeoutRef.current);
    }
    p2pTypingTimeoutRef.current = setTimeout(() => {
      setShowP2PTyping(false);
      p2pTypingTimeoutRef.current = null;
    }, 900);

    return () => {
      if (p2pTypingTimeoutRef.current) {
        clearTimeout(p2pTypingTimeoutRef.current);
        p2pTypingTimeoutRef.current = null;
      }
    };
  }, [activeFriendId, p2pText]);
  const getAttachmentIcon = (type: "file" | "image" | "video" | "other") => {
    if (type === "image") {
      return <ImageIcon className="h-3.5 w-3.5 text-muted-foreground" />;
    }

    if (type === "video") {
      return <VideoIcon className="h-3.5 w-3.5 text-muted-foreground" />;
    }

    if (type === "other") {
      return <FileIcon className="h-3.5 w-3.5 text-muted-foreground" />;
    }

    return <PaperclipIcon className="h-3.5 w-3.5 text-muted-foreground" />;
  };

  const getAttachmentLabel = (type: "file" | "image" | "video" | "other") => {
    if (type === "image") {
      return "Image";
    }

    if (type === "video") {
      return "Video";
    }

    if (type === "other") {
      return "Other";
    }

    return "File";
  };

  const formatAttachmentSize = (size?: number) => {
    if (!size) {
      return "";
    }

    const kb = size / 1024;
    if (kb < 1024) {
      return ` · ${kb.toFixed(kb >= 100 ? 0 : 1)} KB`;
    }

    const mb = kb / 1024;
    return ` · ${mb.toFixed(mb >= 100 ? 0 : 1)} MB`;
  };

  const getAttachmentSummary = (file: File, kind: "file" | "image" | "video" | "other") => {
    const type = kind === "other" ? "file" : kind;
    const objectUrl = URL.createObjectURL(file);
    attachmentUrlRef.current.add(objectUrl);

    return {
      type,
      name: file.name,
      size: file.size,
      mimeType: file.type || "application/octet-stream",
      sourceLabel: getAttachmentLabel(type),
      previewUrl: type === "image" || type === "video" ? objectUrl : undefined,
      downloadUrl: objectUrl,
    };
  };

  const renderAttachmentPreview = (attachment: NonNullable<P2PMessage["attachment"]>) => {
    const downloadButton = attachment.downloadUrl ? (
      <a
        href={attachment.downloadUrl}
        download={attachment.name}
        className="absolute right-2 top-2 z-10 inline-flex h-7 w-7 items-center justify-center rounded-full border border-border/70 bg-background/90 text-foreground shadow-sm backdrop-blur transition hover:bg-muted"
        aria-label={`Download ${attachment.name}`}
        onClick={(event) => event.stopPropagation()}
      >
        <Download className="h-3.5 w-3.5" />
      </a>
    ) : null;

    if (attachment.type === "image" && attachment.previewUrl) {
      return (
        <div className="relative mt-1 w-full max-w-[280px] overflow-hidden rounded-[12px] border border-border/60 bg-background/90 text-foreground shadow-sm">
          {downloadButton}
          <img
            src={attachment.previewUrl}
            alt={attachment.name}
            className="h-36 w-full bg-muted object-cover"
          />
          <div className="flex min-w-0 items-center gap-2 px-3 py-2 text-[11px]">
            <ImageIcon className="h-3.5 w-3.5 shrink-0 text-primary" />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-extrabold">{attachment.name}</span>
              <span className="block truncate text-muted-foreground">
                {attachment.mimeType}
                {formatAttachmentSize(attachment.size)}
              </span>
            </span>
          </div>
        </div>
      );
    }

    if (attachment.type === "video" && attachment.previewUrl) {
      return (
        <div className="relative mt-1 w-full max-w-[280px] overflow-hidden rounded-[12px] border border-border/60 bg-background/90 text-foreground shadow-sm">
          {downloadButton}
          <video
            src={attachment.previewUrl}
            controls
            preload="metadata"
            className="h-36 w-full bg-black object-contain"
          />
          <div className="flex min-w-0 items-center gap-2 px-3 py-2 text-[11px]">
            <VideoIcon className="h-3.5 w-3.5 shrink-0 text-primary" />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-extrabold">{attachment.name}</span>
              <span className="block truncate text-muted-foreground">
                {attachment.mimeType}
                {formatAttachmentSize(attachment.size)}
              </span>
            </span>
          </div>
        </div>
      );
    }

    return (
      <div className="relative mt-1 flex min-w-0 items-center gap-2 rounded-[12px] border border-border/60 bg-background/90 px-3 py-3 pr-11 text-[11px] text-foreground shadow-sm">
        {downloadButton}
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-muted text-primary">
          {getAttachmentIcon(attachment.type)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-extrabold">{attachment.sourceLabel}</span>
          <span className="block truncate">{attachment.name}</span>
          <span className="mt-0.5 block truncate text-[10px] text-muted-foreground">
            {attachment.mimeType}
            {formatAttachmentSize(attachment.size)}
          </span>
        </span>
      </div>
    );
  };

  const visibleConversations = useMemo<P2PChatListEntry[]>(() => {
    const term = chatSearch.trim().toLowerCase();

    return roomParticipants
      .map((person) => {
        const conversation = p2pConversations[person.id] ?? { messages: [], unreadCount: 0 };
        const lastMessage = conversation.messages[conversation.messages.length - 1] ?? null;
        const isHandRaised = speakerRequests.some(
          (request) => request.status === "pending" && request.person.id === person.id,
        );

        return {
          person,
          messages: conversation.messages,
          unreadCount: conversation.unreadCount,
          lastMessage,
          isActive: person.id === activeFriendId,
          isHandRaised,
        };
      })
      .filter((entry) => {
        if (!term) {
          return true;
        }

        return (
          entry.person.name.toLowerCase().includes(term) ||
          entry.person.username.toLowerCase().includes(term) ||
          entry.person.role.toLowerCase().includes(term)
        );
      })
      .sort((a, b) => {
        if (a.unreadCount !== b.unreadCount) {
          return b.unreadCount - a.unreadCount;
        }

        const aLength = a.lastMessage ? a.lastMessage.text.length : 0;
        const bLength = b.lastMessage ? b.lastMessage.text.length : 0;
        return bLength - aLength;
      });
  }, [chatSearch, roomParticipants, p2pConversations, activeFriendId, speakerRequests]);
  const activeConversation = useMemo(
    () => visibleConversations.find((entry) => entry.isActive) ?? null,
    [visibleConversations],
  );
  const selectedListenerConversation = useMemo(() => {
    if (!selectedListener?.id) {
      return { messages: [], unreadCount: 0 };
    }

    return p2pConversations[selectedListener.id] ?? { messages: [], unreadCount: 0 };
  }, [p2pConversations, selectedListener?.id]);

  useEffect(() => {
    if (!activeFriendId) {
      setIsP2PDrawerOpen(false);
      setChatSearch("");
      setIsThreadListOpen(true);
      setReplyingP2PMessage(null);
      return;
    }

    setIsP2PDrawerOpen(true);
    setIsThreadListOpen(true);
    markConversationThreadAsRead(activeFriendId);
  }, [activeFriendId]);
  const micStateTextClass = micEnabled ? "text-emerald-600" : "text-destructive";
  const raisingHands = speakerRequests
    .filter((request) => request.status === "pending" && request.person.id !== alex.id)
    .map((request) => ({
      id: request.id,
      name: request.person.name,
      avatar: request.person.avatar,
      requestedAt: request.requestedAt,
    }));

  const getRoleTone = (role: string): "warning" | "neutral" | "brand" | "danger" => {
    if (role === "Speaker") {
      return "warning";
    }

    if (role === "Listener") {
      return "neutral";
    }

    if (role === "Host") {
      return "brand";
    }

    if (role === "Moderator") {
      return "danger";
    }

    return "neutral";
  };

  const handleRequestHand = () => {
    if (requestPending) {
      toast("Hand lowered", {
        description: "You withdrew your request to speak.",
      });
    } else {
      toast.success("Hand raised", {
        description: "Waiting for the host to approve your request.",
        duration: 2200,
      });
    }

    toggleRequest();
  };

  const handleLeaveRoom = () => {
    toast.success("You left the room", {
      description: `You have left ${room.title}.`,
    });
  };

  const handleOpenChatWithPerson = (person: Person) => {
    setP2pText("");
    setShowP2PEmojiPicker(false);
    setActiveP2PFriendId(person.id);
    setIsP2PDrawerOpen(true);
    setIsAllListenersDialogOpen(false);
    setSelectedListener(null);
    setReplyingP2PMessage(null);
  };

  const handleOpenListenerDetail = (listener: Person) => {
    setSelectedListener(listener);
  };

  const handleBackFromListenerDetail = () => {
    setSelectedListener(null);
  };

  const handleToggleConversationThread = () => {
    const next = !isThreadListOpen;
    setIsThreadListOpen(next);

    if (next && activeFriend?.id) {
      markConversationThreadAsRead(activeFriend.id);
    }
  };

  const toggleP2PMessageReaction = (friendId: string, messageId: string, action: "like" | "dislike") => {
    setP2PConversations((current) => {
      const conversation = current[friendId];
      if (!conversation) {
        return current;
      }

      return {
        ...current,
        [friendId]: {
          ...conversation,
          messages: conversation.messages.map((message) => {
            if (message.id !== messageId) {
              return message;
            }

            const currentReaction = message.userReaction ?? null;
            let likes = message.likes ?? 0;
            let dislikes = message.dislikes ?? 0;
            let nextReaction: P2PMessage["userReaction"] = action;

            if (currentReaction === action) {
              if (action === "like") {
                likes = Math.max(0, likes - 1);
              } else {
                dislikes = Math.max(0, dislikes - 1);
              }

              nextReaction = null;
            } else {
              if (currentReaction === "like") {
                likes = Math.max(0, likes - 1);
              } else if (currentReaction === "dislike") {
                dislikes = Math.max(0, dislikes - 1);
              }

              if (action === "like") {
                likes += 1;
              } else {
                dislikes += 1;
              }
            }

            return {
              ...message,
              likes,
              dislikes,
              userReaction: nextReaction,
            };
          }),
        },
      };
    });
  };

  const toggleP2PEmojiReaction = (friendId: string, messageId: string, reaction: QuickReaction) => {
    if (reaction === "👍") {
      toggleP2PMessageReaction(friendId, messageId, "like");
      return;
    }

    if (reaction === "👎") {
      toggleP2PMessageReaction(friendId, messageId, "dislike");
      return;
    }

    setP2PConversations((current) => {
      const conversation = current[friendId];
      if (!conversation) {
        return current;
      }

      return {
        ...current,
        [friendId]: {
          ...conversation,
          messages: conversation.messages.map((message) => {
            if (message.id !== messageId) {
              return message;
            }

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
        },
      };
    });
  };

  const handleP2PReplyMessage = (message: P2PMessage) => {
    if (replyingP2PMessage?.id === message.id) {
      setReplyingP2PMessage(null);
      return;
    }

    setReplyingP2PMessage(message);
  };

  const handleAllListenersOpenChange = (open: boolean) => {
    setIsAllListenersDialogOpen(open);
    if (!open) {
      setSelectedListener(null);
    }
  };

  const handleP2PDrawerOpenChange = (open: boolean) => {
    if (!open) {
      setIsP2PDrawerOpen(false);
      setActiveP2PFriendId(null);
      setP2pText("");
      setShowP2PEmojiPicker(false);
      setReplyingP2PMessage(null);
      return;
    }

    setIsP2PDrawerOpen(true);
  };

  const sendP2PMessage = () => {
    const cleanText = p2pText.trim();

    if (!cleanText || !activeFriend?.id) {
      return;
    }

    setP2PConversations((current) => {
      const updated = current[activeFriend.id] ?? { messages: [], unreadCount: 0 };

      return {
        ...current,
        [activeFriend.id]: {
          messages: [
            ...updated.messages,
              {
                id: makeMessageId(),
                name: "You",
                avatar: alex.avatar,
                time: "just now",
                text: cleanText,
                replyTo: replyingP2PMessage
                  ? {
                      name: replyingP2PMessage.name,
                      text: replyingP2PMessage.text,
                    }
                  : undefined,
                isYou: true,
                likes: 0,
                dislikes: 0,
                userReaction: null,
                emojiReactions: {},
                userEmojiReaction: null,
              },
            ],
            unreadCount: 0,
          },
        };
      });

    setP2pText("");
    setShowP2PEmojiPicker(false);
    setReplyingP2PMessage(null);
  };

  const addP2PEmoji = (emoji: string) => {
    setP2pText((current) => (current ? `${current} ${emoji}` : emoji));
    setShowP2PEmojiPicker(false);
  };

  const appendP2PMessageWithAttachment = (
    file: File | null,
    kind: "file" | "image" | "video" | "other",
  ) => {
    if (!file || !activeFriend?.id) {
      return;
    }

    const attachment = getAttachmentSummary(file, kind);
    const sourceLabel = kind === "file" ? "a file" : `an ${attachment.sourceLabel.toLowerCase()}`;

    setP2PConversations((current) => {
      const updated = current[activeFriend.id] ?? { messages: [], unreadCount: 0 };

      return {
        ...current,
        [activeFriend.id]: {
          messages: [
            ...updated.messages,
            {
              id: makeMessageId(),
              name: "You",
              avatar: alex.avatar,
              time: "just now",
              text: `Shared ${sourceLabel}: ${file.name}`,
              isYou: true,
              likes: 0,
              dislikes: 0,
              userReaction: null,
              emojiReactions: {},
              userEmojiReaction: null,
              attachment,
            },
          ],
          unreadCount: 0,
        },
      };
      });
  };

  const handleAttachmentChange = (
    kind: "file" | "image" | "video" | "other",
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0] ?? null;
    appendP2PMessageWithAttachment(file, kind);
    event.currentTarget.value = "";
  };

  const openAttachmentPicker = (kind: "file" | "image" | "video" | "other") => {
    setShowP2PEmojiPicker(false);
    if (!activeFriend) {
      toast.warning("Select a person first", {
        description: "Open a private conversation before sending an attachment.",
      });
      return;
    }

    if (kind === "image") {
      imageInputRef.current?.click();
      return;
    }

    if (kind === "video") {
      videoInputRef.current?.click();
      return;
    }

    fileInputRef.current?.click();
  };

  return (
    <div>
      <section className="rounded-[12px] border border-border bg-card p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-extrabold text-chart-3">
            <UsersRound className="h-4 w-4" />
            LISTENERS — 1,197
          </div>
          <DialogPrimitive.Root
            open={isAllListenersDialogOpen}
            onOpenChange={handleAllListenersOpenChange}
          >
            <DialogPrimitive.Trigger asChild>
              <button
                type="button"
                className="text-sm font-semibold text-primary"
                onClick={() => {
                  setSelectedListener(null);
                  setIsAllListenersDialogOpen(true);
                }}
              >
                View all listeners
              </button>
            </DialogPrimitive.Trigger>
            <DialogPrimitive.Portal>
              <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-[2px] data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
              <DialogPrimitive.Content className="fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[74vh] w-full max-w-[430px] flex-col overflow-hidden rounded-t-[18px] border border-border bg-card shadow-2xl outline-none data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-bottom-8 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-bottom-8">
                <div className="mx-auto mt-3 h-1 w-12 rounded-full bg-border" />
                <div className="flex items-center justify-between border-b border-border px-5 py-4">
                  <div>
                    <DialogPrimitive.Title className="text-base font-extrabold text-foreground">
                      Listeners
                    </DialogPrimitive.Title>
                    <p className="text-xs font-semibold text-muted-foreground">
                      {room.listenerCount.toLocaleString()} in this room
                    </p>
                  </div>
                </div>
                {selectedListener ? (
                  <div className="thin-scrollbar flex-1 overflow-y-auto px-4 py-3">
                    <div className="mb-3 rounded-[12px] border border-border bg-card px-3 py-2.5">
                      <div className="relative flex min-h-9 items-center">
                        <button
                          type="button"
                          onClick={handleBackFromListenerDetail}
                          className="z-10 inline-flex items-center gap-2 rounded-none px-1 py-1 text-sm font-semibold text-muted-foreground transition hover:text-foreground"
                        >
                          <ArrowLeft className="h-4 w-4" />
                          <span className="pr-0.5">Back</span>
                        </button>
                        <p className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-sm font-extrabold text-foreground">
                          Listener profile
                        </p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-start gap-3 rounded-[12px] border border-border bg-card p-3">
                        <Avatar
                          src={selectedListener.avatar}
                          name={selectedListener.name}
                          size={52}
                        />
                        <div className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-extrabold text-foreground">
                            {selectedListener.name}
                          </span>
                          <span className="block truncate text-xs text-muted-foreground">
                            @{selectedListener.username}
                          </span>
                          <span className="mt-2 flex flex-wrap items-center gap-1.5">
                            <Badge
                              tone={getRoleTone(selectedListener.role)}
                              className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold"
                            >
                              <span className="leading-none">{getRoleIcon(selectedListener.role)}</span>
                              {selectedListener.role}
                            </Badge>
                            {selectedListenerConversation.messages.length > 0 ? (
                              <Badge tone="neutral" className="h-5 px-2 py-0 text-[10px]">
                                {selectedListenerConversation.messages.length} comments
                              </Badge>
                            ) : null}
                          </span>
                        </div>
                      </div>
                      <section className="rounded-[12px] border border-border bg-card p-3">
                        <h3 className="mb-2 text-xs font-extrabold uppercase tracking-wide text-muted-foreground">
                          New comment info
                        </h3>
                        {selectedListenerConversation.messages.length > 0 ? (
                          <div className="space-y-2">
                            {selectedListenerConversation.messages.slice(-4).map((message) => (
                              <p
                                key={message.id}
                                className="rounded-[10px] border border-border/70 bg-muted/35 px-2 py-1.5 text-[11px] text-foreground"
                              >
                                {message.text}
                              </p>
                            ))}
                          </div>
                        ) : (
                          <p className="rounded-[10px] border border-dashed border-border/70 px-2.5 py-2 text-xs text-muted-foreground">
                            No comment history yet.
                          </p>
                        )}
                      </section>
                    </div>
                  </div>
                ) : (
                  <div className="thin-scrollbar max-h-[420px] overflow-y-auto px-4 py-3">
                    <motion.div layout className="space-y-1">
                      <AnimatePresence initial={false}>
                        {room.listeners.map((listener) => (
                          <motion.button
                            key={listener.id}
                            type="button"
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            variants={listenerListItemVariants}
                            transition={{ duration: 0.24 }}
                            layout
                            onClick={() => handleOpenListenerDetail(listener)}
                            className="group/card flex min-h-[80px] w-full items-center gap-3 rounded-[12px] border border-transparent p-3 text-left transition duration-200 hover:-translate-y-0.5 hover:scale-[1.01] hover:border-primary/40 hover:bg-muted hover:shadow-sm"
                          >
                            <span className="relative shrink-0 rounded-full bg-muted/25 p-1">
                              <Avatar src={listener.avatar} name={listener.name} size={56} />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-extrabold text-foreground">
                                {listener.name}
                              </span>
                              <span className="block truncate text-xs font-semibold text-muted-foreground">
                                @{listener.username}
                              </span>
                            </span>
                            <Badge
                              tone={getRoleTone(listener.role)}
                              className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold"
                            >
                              {getRoleIcon(listener.role)}
                              {listener.role}
                            </Badge>
                          </motion.button>
                        ))}
                      </AnimatePresence>
                    </motion.div>
                  </div>
                )}
              </DialogPrimitive.Content>
            </DialogPrimitive.Portal>
          </DialogPrimitive.Root>
        </div>
        <div
          className="mb-4 flex w-full items-center justify-between gap-[clamp(0.45rem,1.2vw,0.95rem)] overflow-x-auto overflow-y-visible rounded-md px-[2.5%] py-[1.2%] sm:px-[3.2%] sm:py-[1%]"
          style={{ "--listener-avatar-size": "clamp(2.9rem, 12%, 4.2rem)" } as CSSProperties}
        >
          <AnimatePresence initial={false}>
            {room.listeners.map((listener) => (
              <motion.span
                key={listener.id}
                layout
                initial="hidden"
                animate="visible"
                exit="exit"
                variants={listenerListItemVariants}
                transition={{ duration: 0.2 }}
                className="relative h-[var(--listener-avatar-size)] w-[var(--listener-avatar-size)] shrink-0"
              >
                <span className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center overflow-hidden px-1 text-center text-[clamp(0.66rem,1.2vw,0.84rem)] leading-none tracking-tight text-foreground/20">
                  {listener.name}
                </span>
                <Avatar
                  src={listener.avatar}
                  name={listener.name}
                  className="relative z-10 h-full w-full"
                />
              </motion.span>
              ))}
          </AnimatePresence>
          {room.listenerCount > room.listeners.length ? (
            <AvatarGroupCount
              className="shrink-0 text-[clamp(0.56rem,1.05vw,0.75rem)] font-bold text-foreground"
              style={{
                width: "var(--listener-avatar-size)",
                height: "var(--listener-avatar-size)",
              }}
            >
              +{room.listenerCount - room.listeners.length}
            </AvatarGroupCount>
          )
            : null}
        </div>

        <RaiseHandsList items={raisingHands} isCurrentUserRaised={requestPending} />

        <div className="flex min-h-[252px] flex-col items-center justify-start gap-5 rounded-[16px] border border-border bg-card px-6 pt-8 pb-4 shadow-sm">
          <div className="flex w-full items-start justify-center gap-16">
            <AlertDialog.Root>
              <AlertDialog.Trigger asChild>
                <button className="relative flex w-[112px] flex-col items-center gap-3 pt-4">
                  <span className="pointer-events-none absolute top-2 h-[86px] w-[86px] rounded-full bg-destructive/10 blur-xl" />
                  <span className="pointer-events-none absolute top-[7px] h-[88px] w-[88px] rounded-full border border-destructive/10" />
                  <span className="pointer-events-none absolute left-4 top-6 h-1.5 w-1.5 rounded-full bg-destructive/45" />
                  <span className="pointer-events-none absolute right-4 top-12 h-1 w-1 rounded-full bg-destructive/35" />
                  <span className="pointer-events-none absolute left-2 top-20 h-1 w-1 rounded-full bg-destructive/30" />
                  <span className="relative flex h-[72px] w-[72px] items-center justify-center rounded-full bg-destructive text-white shadow-xl shadow-destructive/25">
                    <LogOut className="h-8 w-8" />
                  </span>
                  <span className="text-sm font-extrabold text-foreground">Leave Room</span>
                </button>
              </AlertDialog.Trigger>
              <AlertDialog.Portal>
                <AlertDialog.Overlay className="fixed inset-0 z-40 bg-foreground/30 backdrop-blur-[2px] data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
                <AlertDialog.Content className="fixed inset-x-0 bottom-0 z-50 mx-auto mb-4 flex w-[min(95%,430px)] flex-col overflow-hidden rounded-[20px] border border-border bg-background p-5 shadow-2xl outline-none transition-transform data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-bottom-8 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-bottom-8">
                  <span className="mx-auto mb-2 h-1.5 w-10 rounded-full bg-border" />
                  <div className="mb-4 flex items-start gap-3 rounded-[14px] border border-destructive/20 bg-destructive/5 p-3">
                    <span className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-full bg-destructive/15 text-destructive">
                      <LogOut className="h-4 w-4" />
                    </span>
                    <div>
                      <AlertDialog.Title className="text-base font-extrabold text-foreground">
                        Leave room?
                      </AlertDialog.Title>
                      <AlertDialog.Description className="text-sm text-muted-foreground">
                        You will stop listening and return to the rooms list.
                      </AlertDialog.Description>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
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
                        onClick={handleLeaveRoom}
                      >
                        Leave Room
                      </Button>
                    </AlertDialog.Action>
                  </div>
                </AlertDialog.Content>
              </AlertDialog.Portal>
            </AlertDialog.Root>

            <button
              onClick={toggleMic}
              className="relative flex w-[156px] flex-col items-center gap-3"
            >
              <span
                aria-hidden="true"
                className={cn(
                  "pointer-events-none absolute -top-4 z-0 flex h-[142px] w-[142px] items-center justify-center rounded-full border",
                  micEnabled
                    ? "border-emerald-500/15 bg-emerald-500/10"
                    : "border-destructive/15 bg-destructive/10",
                )}
              >
                <span
                  className={cn(
                    "pointer-events-none absolute h-[126px] w-[126px] rounded-full border",
                    micEnabled
                      ? "mic-ring-pulse border-emerald-500/35 bg-emerald-500/10"
                      : "border-destructive/30 bg-destructive/10",
                  )}
                />
                <span
                  className={cn(
                    "pointer-events-none absolute h-[112px] w-[112px] rounded-full border",
                    micEnabled ? "border-emerald-500/25" : "border-destructive/25",
                  )}
                />
                <span
                  className={cn(
                    "relative z-10 flex h-[104px] w-[104px] items-center justify-center rounded-full text-white shadow-2xl",
                    micEnabled
                      ? "bg-emerald-500 shadow-emerald-500/30"
                      : "bg-destructive shadow-destructive/30",
                  )}
                >
                  <Mic
                    className={cn(
                      "h-11 w-11",
                      micEnabled ? "mic-icon-pulse text-white" : "text-white",
                    )}
                  />
                </span>
              </span>
              <span className={cn("mt-[126px] text-sm font-extrabold", micStateTextClass)}>
                {micEnabled ? "Mic On" : "Mic Off"}
              </span>
              <span className="text-xs text-muted-foreground">You are visible as a listener</span>
            </button>

            <button
              onClick={handleRequestHand}
              className="relative flex w-[112px] flex-col items-center gap-3 pt-4"
            >
              <span
                className={cn(
                  "pointer-events-none absolute top-2 h-[86px] w-[86px] rounded-full blur-xl",
                  requestPending ? "bg-yellow-400/20" : "bg-sky-400/20",
                )}
              />
              <span
                className={cn(
                  "pointer-events-none absolute top-[7px] h-[88px] w-[88px] rounded-full border",
                  requestPending ? "border-yellow-400/25" : "border-sky-400/30",
                )}
              />
              <span
                className={cn(
                  "pointer-events-none absolute left-4 top-7 h-1 w-1 rounded-full",
                  requestPending ? "bg-yellow-500/55" : "bg-sky-400/55",
                )}
              />
              <span
                className={cn(
                  "pointer-events-none absolute right-4 top-11 h-1.5 w-1.5 rounded-full",
                  requestPending ? "bg-yellow-400/65" : "bg-sky-400/65",
                )}
              />
              <span
                className={cn(
                  "pointer-events-none absolute right-2 top-20 h-1 w-1 rounded-full",
                  requestPending ? "bg-yellow-500/45" : "bg-sky-400/45",
                )}
              />
              <span
                className={cn(
                  "relative flex h-[72px] w-[72px] items-center justify-center rounded-full shadow-xl",
                  requestPending
                    ? "bg-yellow-400 text-yellow-950 shadow-yellow-400/30"
                    : "bg-sky-200 text-sky-950 shadow-sky-400/25",
                )}
              >
                <RaiseHandIcon className={cn("h-8 w-8", requestPending ? "hand-shake" : "")} />
              </span>
              <span
                className={cn(
                  "text-sm font-extrabold",
                  requestPending ? "text-yellow-600" : "text-sky-600",
                )}
              >
                {requestPending ? "Hand Raised" : "Raise Hand"}
              </span>
              <span className={cn("text-xs", requestPending ? "text-yellow-600" : "text-sky-500")}>
                Request to speak
              </span>
            </button>
          </div>
        </div>
      </section>

      <Drawer open={isP2PDrawerOpen} onOpenChange={handleP2PDrawerOpenChange}>
        <DrawerContent className="h-[36vh] max-w-[95vw] px-4 py-4 sm:max-w-[1040px] sm:px-6 flex flex-col overflow-hidden">
          <DrawerHeader className="mb-3 px-0 justify-start">
            <div className="flex items-start gap-3">
              <div className="flex flex-1 items-start gap-2">
                <MessageCircle className="mt-0.5 h-4 w-4 text-chart-3" />
                <div>
                  <DrawerTitle className="text-base">Chats</DrawerTitle>
                  <DrawerDescription className="text-xs">
                    Private chat with room members and recent history.
                  </DrawerDescription>
                </div>
              </div>
            </div>
          </DrawerHeader>
          <div className="grid min-h-0 flex-1 gap-3 md:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
            <section className="min-h-0 flex flex-1 flex-col rounded-[12px] border border-border bg-card p-3 shadow-sm">
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <MagnifyingGlass className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <input
                    type="search"
                    className="min-w-0 flex-1 border-0 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                    value={chatSearch}
                    onChange={(event) => setChatSearch(event.target.value)}
                    placeholder="Search chats"
                  />
                </div>
                {totalUnreadCount > 0 ? (
                  <Badge tone="brand" className="h-6 px-2 text-[11px]">
                    {totalUnreadCount} new
                  </Badge>
                ) : null}
                <Button
                  type="button"
                  onClick={handleToggleConversationThread}
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full"
                  aria-label={isThreadListOpen ? "Hide thread list" : "Show thread list"}
                >
                  {isThreadListOpen ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                History
              </p>
              {isThreadListOpen ? (
                <div className="thin-scrollbar min-h-0 flex-1 space-y-2 overflow-y-auto pr-0.5">
                  {visibleConversations.length > 0 ? (
                    visibleConversations.map((entry) => (
                      <button
                        key={entry.person.id}
                        type="button"
                        onClick={() => handleOpenChatWithPerson(entry.person)}
                        className={cn(
                          "group/card flex w-full items-start gap-2 rounded-[12px] border border-border/60 bg-card px-2.5 py-2 text-left transition duration-200 hover:border-primary/40 hover:bg-muted/60",
                          entry.isActive
                            ? "border-primary/65 ring-2 ring-primary/20"
                            : entry.unreadCount > 0
                              ? "border-muted/70"
                              : "",
                        )}
                      >
                        <Avatar src={entry.person.avatar} name={entry.person.name} size={30} />
                        <span className="min-w-0 flex-1">
                          <span className="mb-1 flex min-w-0 items-center justify-between gap-2">
                            <span className="truncate text-sm font-extrabold text-foreground">
                              {entry.person.name}
                            </span>
                            {entry.unreadCount > 0 ? (
                              <Badge variant="destructive" className="h-5 px-1.5 py-0 text-[10px]">
                                {entry.unreadCount}
                              </Badge>
                            ) : null}
                          </span>
                          <span className="mb-1 flex min-w-0 items-center gap-1.5">
                            <Badge
                              tone={getRoleTone(entry.person.role)}
                              className="inline-flex h-5 items-center gap-1 px-2 py-0 text-[10px]"
                            >
                              <span className="leading-none">{getRoleIcon(entry.person.role)}</span>
                              {entry.person.role}
                            </Badge>
                            {entry.isHandRaised ? (
                              <Badge
                                tone="danger"
                                className="h-5 px-2 py-0 text-[10px] text-destructive/90"
                              >
                                <RaiseHandIcon className="h-3 w-3" />
                                Hand up
                              </Badge>
                            ) : null}
                          </span>
                          <span className="truncate text-[11px] leading-4 text-muted-foreground">
                            {entry.lastMessage?.text ??
                              `${entry.person.name.split(" ")[0]} says hi first!`}
                          </span>
                          {entry.lastMessage ? (
                            <span className="mt-0.5 text-[10px] text-muted-foreground/70">
                              {entry.lastMessage.time}
                            </span>
                          ) : null}
                        </span>
                      </button>
                    ))
                  ) : (
                    <p className="rounded-[12px] border border-dashed border-border/70 px-3 py-3 text-center text-xs text-muted-foreground">
                      No chats match your search.
                    </p>
                  )}
                </div>
              ) : null}
            </section>

            <section className="min-h-0 flex flex-1 flex-col">
              {activeFriend ? (
                <div className="flex min-h-0 flex-1 flex-col rounded-[12px] border border-border bg-card p-3 shadow-sm">
                  <div className="mb-3 flex min-h-0 items-center gap-2 border-b border-border pb-3">
                    <Avatar src={activeFriend.avatar} name={activeFriend.name} size={30} />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-extrabold text-foreground">
                        {activeFriend.name}
                      </span>
                      <span className="block truncate text-[11px] text-muted-foreground">
                        @{activeFriend.username}
                      </span>
                      <span className="mt-1 flex min-w-0 items-center gap-1.5">
                        <Badge
                          tone={getRoleTone(activeFriend.role)}
                          className="inline-flex h-5 items-center gap-1 px-2 py-0 text-[10px]"
                        >
                          <span className="leading-none">{getRoleIcon(activeFriend.role)}</span>
                          {activeFriend.role}
                        </Badge>
                        {activeConversation?.isHandRaised ? (
                          <Badge
                            tone="danger"
                            className="h-5 px-2 py-0 text-[10px] text-destructive/90"
                          >
                            <RaiseHandIcon className="h-3 w-3" />
                            Hand up
                          </Badge>
                        ) : null}
                      </span>
                    </span>
                    <div className="ml-auto flex items-center gap-2">
                      {activeConversation?.unreadCount ? (
                        <Badge variant="destructive" className="h-5 px-2 py-0 text-[10px]">
                          {activeConversation.unreadCount} unread
                        </Badge>
                      ) : null}
                    </div>
                  </div>

                  <MessageGroup className="min-h-0 flex-1">
                    <MessageScrollerProvider autoScroll>
                      <MessageScroller className="min-h-0 flex-1 rounded-[12px] bg-card">
                        <MessageScrollerViewport className="px-2 py-3">
                          <MessageScrollerContent className="space-y-3">
                            {activeFriendMessages.length > 0 ? (
                              activeFriendMessages.map((message) => (
                                <MessageScrollerItem
                                  key={message.id}
                                  messageId={message.id}
                                  scrollAnchor={message.isYou}
                                >
                                  <Message align={message.isYou ? "end" : "start"}>
                                    <MessageAvatar>
                                      <Avatar src={message.avatar} name={message.name} size={28} />
                                    </MessageAvatar>
                                    <MessageContent>
                                      <MessageHeader className="justify-between">
                                        <span className="max-w-[70%] truncate font-extrabold text-foreground">
                                          {message.name}
                                        </span>
                                        <span className="shrink-0 text-muted-foreground">
                                          {message.time}
                                        </span>
                                      </MessageHeader>
                                      <ContextMenu.Root>
                                        <ContextMenu.Trigger asChild>
                                          <Bubble
                                            align={message.isYou ? "end" : "start"}
                                            variant={message.isYou ? "secondary" : "default"}
                                            className={cn(
                                              "mb-5",
                                              message.isYou
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
                                                    {message.replyTo.text}
                                                  </span>
                                                </div>
                                              ) : null}
                                              <ChatMessageText text={message.text} />
                                              <ChatLinkPreviews text={message.text} />
                                              {message.attachment ? (
                                                renderAttachmentPreview(message.attachment)
                                              ) : null}
                                            </BubbleContent>
                                            <BubbleReactions
                                              side="bottom"
                                              align="start"
                                              className={bubbleReactionTrayClass}
                                              aria-label={`Reactions for ${message.name}`}
                                            >
                                              {getVisibleP2PReactions(message).map((reaction) => (
                                                <button
                                                  key={reaction}
                                                  type="button"
                                                  onClick={() =>
                                                    activeFriend?.id
                                                      ? toggleP2PEmojiReaction(
                                                          activeFriend.id,
                                                          message.id,
                                                          reaction,
                                                        )
                                                      : null
                                                  }
                                                  className={cn(
                                                    reactionCircleClass,
                                                    hasP2PUserReaction(message, reaction)
                                                      ? "reaction-added-pop border-primary/45 bg-primary/15 text-primary"
                                                      : "text-muted-foreground",
                                                  )}
                                                  aria-label={`React ${reaction} to ${message.name}'s message`}
                                                  aria-pressed={hasP2PUserReaction(message, reaction)}
                                                >
                                                  <span aria-hidden>{reaction}</span>
                                                  <span
                                                    key={`${message.id}-${reaction}-${getP2PReactionCount(message, reaction)}`}
                                                    className={cn(
                                                      reactionCountClass,
                                                      hasP2PUserReaction(message, reaction) && "reaction-count-pop",
                                                    )}
                                                  >
                                                    {getP2PReactionCount(message, reaction)}
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
                                                    hasP2PUserReaction(message, reaction)
                                                      ? "border-primary/45 bg-primary/15 text-primary"
                                                      : "",
                                                  )}
                                                  onSelect={() =>
                                                    activeFriend?.id
                                                      ? toggleP2PEmojiReaction(
                                                          activeFriend.id,
                                                          message.id,
                                                          reaction,
                                                        )
                                                      : null
                                                  }
                                                  aria-label={`React with ${reaction}`}
                                                >
                                                  {reaction}
                                                </ContextMenu.Item>
                                              ))}
                                            </div>
                                            <ContextMenu.Separator className="my-2 h-px bg-border" />
                                            <ContextMenu.Item
                                              className={contextMenuItemClass}
                                              onSelect={() => handleP2PReplyMessage(message)}
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
                              ))
                            ) : !showP2PTyping ? (
                              <MessageScrollerItem>
                                <div className="rounded-[12px] border border-dashed border-border bg-muted/40 px-3 py-3 text-xs text-muted-foreground">
                                  <p>No messages yet.</p>
                                  <p className="mt-1 text-[11px]">
                                    Send a message to start a conversation.
                                  </p>
                                </div>
                              </MessageScrollerItem>
                            ) : null}
                            {showP2PTyping && activeFriend ? (
                              <MessageScrollerItem>
                                <Message align="start">
                                  <MessageAvatar>
                                    <Avatar
                                      src={activeFriend.avatar}
                                      name={activeFriend.name}
                                      size={28}
                                    />
                                  </MessageAvatar>
                                  <MessageContent>
                                    <MessageHeader className="justify-between">
                                      <span className="max-w-[70%] truncate font-extrabold text-foreground">
                                        {activeFriend.name}
                                      </span>
                                      <span className="shrink-0 text-muted-foreground">typing...</span>
                                    </MessageHeader>
                                    <Bubble align="start">
                                      <BubbleContent className="space-y-1 chat-bubble-enter">
                                        <TypingIndicator />
                                      </BubbleContent>
                                    </Bubble>
                                  </MessageContent>
                                </Message>
                              </MessageScrollerItem>
                            ) : null}
                          </MessageScrollerContent>
                        </MessageScrollerViewport>
                        <MessageScrollerButton direction="end" className="px-3 py-1 text-[11px]">
                          Jump to latest
                        </MessageScrollerButton>
                      </MessageScroller>
                    </MessageScrollerProvider>
                  </MessageGroup>

                  {replyingP2PMessage ? (
                    <div className={replyPreviewClass}>
                      <span className="min-w-0 border-l-2 border-primary/70 pl-2.5 text-[11px] text-muted-foreground">
                        <span className="block font-extrabold text-foreground">
                          {replyingP2PMessage.name}
                        </span>
                        <span className="block truncate">{replyingP2PMessage.text}</span>
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 rounded-full"
                        onClick={() => setReplyingP2PMessage(null)}
                        aria-label="Cancel reply"
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ) : null}
                  <div className="mt-2 border-t border-border/80 pt-3">
                    <div className="relative flex h-11 items-center rounded-[10px] border border-border px-3">
                      <input
                        ref={fileInputRef}
                        type="file"
                        className="hidden"
                        onChange={(event) => handleAttachmentChange("file", event)}
                      />
                      <input
                        ref={imageInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(event) => handleAttachmentChange("image", event)}
                      />
                      <input
                        ref={videoInputRef}
                        type="file"
                        accept="video/*"
                        className="hidden"
                        onChange={(event) => handleAttachmentChange("video", event)}
                      />
                      <span className="mr-1 flex items-center gap-1">
                        <Button
                          type="button"
                          onClick={() => openAttachmentPicker("file")}
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 rounded-full"
                          aria-label="Attach file"
                        >
                          <PaperclipIcon className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          onClick={() => openAttachmentPicker("image")}
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 rounded-full"
                          aria-label="Attach image"
                        >
                          <ImageIcon className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          onClick={() => openAttachmentPicker("video")}
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 rounded-full"
                          aria-label="Attach video"
                        >
                          <VideoIcon className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          onClick={() => setShowP2PEmojiPicker((current) => !current)}
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 rounded-full"
                          aria-label="Insert emoji"
                        >
                          <Smile className="h-4 w-4" />
                        </Button>
                      </span>
                      {showP2PEmojiPicker ? (
                        <div className="absolute inset-x-0 bottom-full mb-2 flex flex-wrap gap-1 rounded-[10px] border border-border bg-card p-2 shadow-lg">
                          {EMOJI_OPTIONS.map((emoji) => (
                            <button
                              key={emoji}
                              type="button"
                              className="min-w-8 rounded-[6px] bg-muted/60 px-1.5 py-1 text-base leading-none hover:bg-muted"
                              onClick={() => addP2PEmoji(emoji)}
                              aria-label={`Insert emoji ${emoji}`}
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      ) : null}
                      <input
                        className="min-w-0 flex-1 border-0 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                        placeholder={`Message ${activeFriend.name}`}
                        value={p2pText}
                        onChange={(event) => setP2pText(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            setShowP2PEmojiPicker(false);
                            sendP2PMessage();
                          }
                        }}
                      />
                      <Button
                        onClick={sendP2PMessage}
                        size="icon"
                        variant="ghost"
                        aria-label={`Send message to ${activeFriend.name}`}
                        className={cn("h-8 w-8 rounded-full", {
                          "text-muted-foreground": !p2pText.trim(),
                          "text-primary": Boolean(p2pText.trim()),
                        })}
                      >
                        <PaperPlaneRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex min-h-0 flex-1 flex-col justify-center rounded-[12px] border border-border bg-card p-4">
                  <p className="text-sm font-semibold text-muted-foreground">
                    Select a room member to open a private chat.
                  </p>
                </div>
              )}
            </section>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
