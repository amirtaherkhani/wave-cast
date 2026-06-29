"use client";

import * as React from "react";
import { Avatar as AvatarPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

function Avatar({
  className,
  size = "default",
  src,
  name,
  online,
  children,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Root> & {
  size?: "default" | "sm" | "lg" | number;
  src?: string;
  name?: string;
  online?: boolean;
}) {
  const initials = name
    ?.split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const numericSize = typeof size === "number" ? size : undefined;
  const dataSize = typeof size === "number" ? "default" : size;

  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      data-size={dataSize}
      className={cn(
        "group/avatar relative flex size-8 shrink-0 rounded-full select-none after:absolute after:inset-0 after:rounded-full after:border after:border-border after:mix-blend-darken data-[size=lg]:size-10 data-[size=sm]:size-6 dark:after:mix-blend-lighten",
        className,
      )}
      style={
        numericSize ? { width: numericSize, height: numericSize, ...props.style } : props.style
      }
      {...props}
    >
      {src || name ? (
        <>
          {src ? (
            <img
              src={src}
              alt={name ?? "Avatar"}
              className="aspect-square size-full rounded-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <AvatarFallback>{initials}</AvatarFallback>
          )}
          {online ? <AvatarBadge className="bg-primary" /> : null}
        </>
      ) : (
        children
      )}
    </AvatarPrimitive.Root>
  );
}

function AvatarImage({ className, ...props }: React.ComponentProps<typeof AvatarPrimitive.Image>) {
  return (
    <AvatarPrimitive.Image
      data-slot="avatar-image"
      className={cn("aspect-square size-full rounded-full object-cover", className)}
      {...props}
    />
  );
}

function AvatarFallback({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Fallback>) {
  return (
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      className={cn(
        "flex size-full items-center justify-center rounded-full bg-muted text-sm text-muted-foreground group-data-[size=sm]/avatar:text-xs",
        className,
      )}
      {...props}
    />
  );
}

function AvatarBadge({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="avatar-badge"
      className={cn(
        "absolute right-0 bottom-0 z-10 inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground bg-blend-color ring-2 ring-background select-none",
        "group-data-[size=sm]/avatar:size-2 group-data-[size=sm]/avatar:[&>svg]:hidden",
        "group-data-[size=default]/avatar:size-2.5 group-data-[size=default]/avatar:[&>svg]:size-2",
        "group-data-[size=lg]/avatar:size-3 group-data-[size=lg]/avatar:[&>svg]:size-2",
        className,
      )}
      {...props}
    />
  );
}

function AvatarGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="avatar-group"
      className={cn(
        "group/avatar-group flex -space-x-2 *:data-[slot=avatar]:ring-2 *:data-[slot=avatar]:ring-background",
        className,
      )}
      {...props}
    />
  );
}

function AvatarGroupCount({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="avatar-group-count"
      className={cn(
        "relative flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm text-muted-foreground ring-2 ring-background group-has-data-[size=lg]/avatar-group:size-10 group-has-data-[size=sm]/avatar-group:size-6 [&>svg]:size-4 group-has-data-[size=lg]/avatar-group:[&>svg]:size-5 group-has-data-[size=sm]/avatar-group:[&>svg]:size-3",
        className,
      )}
      {...props}
    />
  );
}

function AvatarStack({
  people,
  size = 28,
  max = 5,
  remainder,
}: {
  people: { id: string; name: string; avatar: string }[];
  size?: number;
  max?: number;
  remainder?: number | string;
}) {
  return (
    <AvatarGroup>
      {people.slice(0, max).map((person) => (
        <Avatar key={person.id} src={person.avatar} name={person.name} size={size} />
      ))}
      {remainder ? (
        <AvatarGroupCount
          className="text-[11px] font-semibold"
          style={{ width: size, height: size }}
        >
          {remainder}
        </AvatarGroupCount>
      ) : null}
    </AvatarGroup>
  );
}

export {
  Avatar,
  AvatarImage,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarBadge,
  AvatarStack,
};
