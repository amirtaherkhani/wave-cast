"use client";

import Link from "next/link";
import { ArrowLeft } from "@phosphor-icons/react/ssr";
import { usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";
import { useUiStore } from "@/stores/ui-store";

export function ActiveRoomBackBar() {
  const pathname = usePathname();
  const activeRoomId = useUiStore((state) => state.activeRoomId);
  const activeRoomTitle = useUiStore((state) => state.activeRoomTitle);

  if (!activeRoomId || !pathname || pathname === "/") {
    return null;
  }

  return (
    <div className="fixed inset-x-0 bottom-4 z-40 flex justify-center px-4">
      <Button asChild variant="primary" size="sm" className="h-12 rounded-full border border-primary/20 px-5 shadow-lg">
        <Link href="/" aria-label="Back to active room">
          <ArrowLeft className="h-4 w-4" />
          <span className="truncate max-w-[55vw] text-sm font-black">Back to current room</span>
          <span className="truncate max-w-[34vw] text-xs font-semibold text-primary-foreground/75">
            {activeRoomTitle ?? "Current room"}
          </span>
        </Link>
      </Button>
    </div>
  );
}
