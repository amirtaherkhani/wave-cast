 "use client";

import Link from "next/link";
import { CaretDown as ChevronDown, Radio, SignOut, User } from "@phosphor-icons/react/ssr";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { alex } from "@/features/wavecast/mock-data";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

export function UserMenu() {
  const userName = alex.name;
  const userRole = alex.role;

  const menuItems = [
    { href: "/profile", label: "Profile", icon: User },
    { href: "/my-room", label: "My Room", icon: Radio },
  ];

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          className="flex items-center gap-3 rounded-[10px] border border-border bg-card px-2 py-1 hover:bg-muted"
          aria-label="Current user menu"
        >
          <Avatar src={alex.avatar} name={userName} online size={42} />
          <span className="hidden text-left leading-tight md:block">
            <span className="block text-sm font-bold text-foreground">{userName}</span>
            <span className="block text-xs text-muted-foreground">{userRole}</span>
          </span>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          sideOffset={10}
          align="end"
          className="z-50 min-w-[210px] rounded-[12px] border border-border bg-card p-2 shadow-xl"
        >
          <div className="px-3 py-1.5">
            <p className="truncate text-xs font-black text-muted-foreground">{userName}</p>
            <p className="truncate text-[11px] text-muted-foreground">{userRole}</p>
          </div>
          <DropdownMenu.Separator className="my-2 h-px bg-border" />
          {menuItems.map((item) => (
            <DropdownMenu.Item key={item.label} className="list-none outline-none" asChild>
              <Link
                href={item.href}
                className="mb-1 flex items-center gap-2 rounded-[9px] px-2 py-2 text-sm font-semibold text-foreground transition hover:bg-muted"
              >
                <item.icon className="h-4 w-4 text-muted-foreground" />
                {item.label}
              </Link>
            </DropdownMenu.Item>
          ))}
          <DropdownMenu.Separator className="my-2 h-px bg-border" />
          <DropdownMenu.Item className="list-none outline-none" asChild>
            <Button size="sm" variant="ghost" className="mt-1 w-full justify-start px-2 text-sm font-semibold text-destructive">
              <SignOut className="h-4 w-4" />
              Sign out
            </Button>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
