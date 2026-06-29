import { Command, MagnifyingGlass as Search } from "@phosphor-icons/react/ssr";
import { cn } from "@/lib/utils";

export function SearchBox({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex h-10 items-center gap-2 rounded-[10px] border border-border bg-card px-3 text-muted-foreground",
        className,
      )}
    >
      <Search className="h-4 w-4" />
      <input
        aria-label="Search"
        placeholder="Search rooms, people, topics..."
        className="min-w-0 flex-1 border-0 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
      />
      <span className="inline-flex h-6 items-center gap-1 rounded-[6px] bg-muted px-2 text-xs font-semibold text-muted-foreground">
        <Command className="h-3 w-3" />K
      </span>
    </div>
  );
}
