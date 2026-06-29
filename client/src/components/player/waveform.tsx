import { waveform } from "@/features/wavecast/mock-data";
import { cn } from "@/lib/utils";

export function Waveform({ className }: { className?: string }) {
  return (
    <div className={cn("flex h-20 items-center justify-center gap-[5px]", className)}>
      {waveform.map((value, index) => (
        <span
          key={`${value}-${index}`}
          className="w-[3px] rounded-full bg-border"
          style={{ height: `${Math.max(14, value * 0.72)}px` }}
        />
      ))}
    </div>
  );
}
