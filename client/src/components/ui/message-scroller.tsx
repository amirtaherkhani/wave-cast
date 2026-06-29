"use client";

import * as React from "react";
import { MessageScroller as ShadcnMessageScroller } from "@shadcn/react/message-scroller";
import { cn } from "@/lib/utils";

const {
  Provider: MessageScrollerProviderPrimitive,
  Root: MessageScrollerRoot,
  Viewport: MessageScrollerViewportPrimitive,
  Content: MessageScrollerContentPrimitive,
  Item: MessageScrollerItemPrimitive,
  Button: MessageScrollerButtonPrimitive,
} = ShadcnMessageScroller;

function MessageScrollerProvider({ ...props }: React.ComponentProps<typeof MessageScrollerProviderPrimitive>) {
  return <MessageScrollerProviderPrimitive {...props} />;
}

function MessageScroller({ className, ...props }: React.ComponentProps<typeof MessageScrollerRoot>) {
  return (
    <MessageScrollerRoot
      className={cn("relative flex min-h-0 flex-1 flex-col overflow-hidden", className)}
      {...props}
    />
  );
}

function MessageScrollerViewport({
  className,
  ...props
}: React.ComponentProps<typeof MessageScrollerViewportPrimitive>) {
  return (
    <MessageScrollerViewportPrimitive
      className={cn("min-h-0 flex-1 overflow-y-auto", className)}
      {...props}
    />
  );
}

function MessageScrollerContent({
  className,
  ...props
}: React.ComponentProps<typeof MessageScrollerContentPrimitive>) {
  return (
    <MessageScrollerContentPrimitive
      className={cn("flex min-w-0 flex-1 flex-col gap-3 px-3 py-3", className)}
      {...props}
    />
  );
}

function MessageScrollerItem({
  className,
  ...props
}: React.ComponentProps<typeof MessageScrollerItemPrimitive>) {
  return <MessageScrollerItemPrimitive className={cn("min-h-0", className)} {...props} />;
}

function MessageScrollerButton({
  className,
  direction = "end",
  ...props
}: React.ComponentProps<typeof MessageScrollerButtonPrimitive>) {
  return (
    <MessageScrollerButtonPrimitive
      direction={direction}
      className={cn(
        "absolute bottom-3 left-1/2 z-10 inline-flex -translate-x-1/2 items-center gap-2 rounded-full border border-border bg-background px-4 py-1.5 text-xs font-semibold text-muted-foreground transition hover:border-foreground/30 hover:text-foreground",
        "data-[active=false]:pointer-events-none data-[active=false]:invisible data-[active=true]:pointer-events-auto",
        className,
      )}
      {...props}
    />
  );
}

export {
  MessageScroller,
  MessageScrollerProvider,
  MessageScrollerViewport,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerButton,
};
