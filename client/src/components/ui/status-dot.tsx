import { cn } from "@/lib/utils";

export function StatusDot({
  tone = "green",
  className,
}: {
  tone?: "green" | "red" | "yellow" | "purple";
  className?: string;
}) {
  const colors = {
    green: "bg-chart-3",
    red: "bg-destructive",
    yellow: "bg-[var(--chart-2)]",
    purple: "bg-primary",
  };

  return <span className={cn("inline-block h-2.5 w-2.5 rounded-full", colors[tone], className)} />;
}
