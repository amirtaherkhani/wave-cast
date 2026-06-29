import {
  ChatCircle as MessageCircle,
  DotsThreeVertical as MoreVertical,
  House as Home,
} from "@phosphor-icons/react/ssr";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NotificationMenu } from "@/components/common/notification-menu";
import { WaveCastLogo } from "@/components/common/logo";
import { ThemeToggle } from "@/components/common/theme-toggle";
import { UserMenu } from "@/components/common/user-menu";
import { useEffect, useMemo, useState } from "react";

type TopBarProps = {
  showPrivateChat?: boolean;
  privateChatUnreadCount?: number;
  onPrivateChatClick?: () => void;
};

type NetworkConnection = {
  effectiveType?: string;
  downlink?: number;
  addEventListener?: (type: "change", listener: EventListener) => void;
  removeEventListener?: (type: "change", listener: EventListener) => void;
};

type NavigatorWithConnection = Navigator & {
  connection?: NetworkConnection;
};

export function TopBar({
  showPrivateChat = false,
  privateChatUnreadCount = 0,
  onPrivateChatClick,
}: TopBarProps) {
  const [isOffline, setIsOffline] = useState(false);
  const [networkQuality, setNetworkQuality] = useState<"excellent" | "good" | "poor">("good");

  useEffect(() => {
    if (typeof window === "undefined" || !("navigator" in window)) {
      return;
    }

    const updateNetwork = () => {
      if (typeof navigator.onLine === "boolean") {
        setIsOffline(!navigator.onLine);

        if (!navigator.onLine) {
          return;
        }
      }

      const connection = (navigator as NavigatorWithConnection).connection;
      const effectiveType = connection?.effectiveType;
      const downlink = connection?.downlink ?? 0;

      if (effectiveType === "4g" && downlink >= 8) {
        setNetworkQuality("excellent");
        return;
      }

      if (effectiveType === "4g" || effectiveType === "3g" || downlink >= 4) {
        setNetworkQuality("good");
        return;
      }

      setNetworkQuality("poor");
    };

    const onConnectionChange = () => updateNetwork();

    window.addEventListener("online", onConnectionChange);
    window.addEventListener("offline", onConnectionChange);
    updateNetwork();

    const connection = (navigator as NavigatorWithConnection).connection;
    connection?.addEventListener?.("change", onConnectionChange);

    return () => {
      window.removeEventListener("online", onConnectionChange);
      window.removeEventListener("offline", onConnectionChange);
      connection?.removeEventListener?.("change", onConnectionChange);
    };
  }, []);

  const networkStatusLabel = useMemo(() => {
    if (isOffline) {
      return "Offline";
    }

    if (networkQuality === "excellent") {
      return "Excellent";
    }

    if (networkQuality === "good") {
      return "Good";
    }

    return "Weak";
  }, [isOffline, networkQuality]);

  const networkStatusBadgeClasses = useMemo(() => {
    if (isOffline) {
      return "border-destructive/30 bg-destructive/10 text-destructive";
    }

    if (networkQuality === "excellent") {
      return "border-emerald-400/40 bg-emerald-500/10 text-emerald-500";
    }

    if (networkQuality === "good") {
      return "border-chart-3/40 bg-chart-3/10 text-chart-3";
    }

    return "border-amber-400/40 bg-amber-500/10 text-amber-500";
  }, [isOffline, networkQuality]);

  return (
    <header className="h-[76px] border-b border-border bg-card">
      <div className="mx-auto flex h-full w-full items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <WaveCastLogo imageClassName="h-10" />
          <button className="inline-flex h-10 items-center gap-2 rounded-[8px] bg-muted px-3 text-sm font-bold text-primary">
            <Home className="h-5 w-5" />
            Home
          </button>
        </div>
        <div className="ml-auto flex items-center gap-5">
          {showPrivateChat ? (
            <span className="relative">
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 bg-transparent hover:bg-transparent"
                aria-label="Open private chat"
                onClick={onPrivateChatClick}
                disabled={!onPrivateChatClick}
              >
                <MessageCircle className="h-4 w-4" />
              </Button>
              {privateChatUnreadCount > 0 ? (
                <Badge
                  variant="destructive"
                  className="absolute -right-2 -top-2 min-w-5 border border-background px-1 py-0 text-[10px] font-bold"
                >
                  {privateChatUnreadCount}
                </Badge>
              ) : null}
            </span>
              ) : null}
          <span
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-bold ${networkStatusBadgeClasses}`}
            aria-live="polite"
            aria-label={`Network ${networkStatusLabel}`}
          >
            <span className="inline-flex items-center gap-1">
              <span className="flex items-end gap-0.5">
                <span className={`h-2 w-1 rounded-full ${isOffline ? "bg-destructive" : "bg-current"}`} />
                <span
                  className={`w-1 rounded-full ${isOffline || networkQuality === "poor" ? "bg-destructive/70" : "bg-current"}`}
                  style={{ height: isOffline ? "4px" : networkQuality === "good" ? "7px" : "9px" }}
                />
                <span
                  className={`w-1 rounded-full ${isOffline ? "bg-destructive/70" : "bg-current"}`}
                  style={{ height: isOffline ? "6px" : "11px" }}
                />
              </span>
              <span>{isOffline ? "Offline" : "NET"}</span>
            </span>
            <span>{networkStatusLabel}</span>
          </span>
          <NotificationMenu />
          <ThemeToggle />
          <UserMenu />
          <button className="text-muted-foreground" aria-label="More">
            <MoreVertical className="h-5 w-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
