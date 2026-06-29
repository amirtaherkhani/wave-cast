import { cn } from "@/lib/utils";

export function WaveCastLogo({
  compact = false,
  className,
  imageClassName,
}: {
  compact?: boolean;
  className?: string;
  imageClassName?: string;
}) {
  if (compact) {
    return (
      <div className={cn("flex items-center", className)}>
        <img src="/brand/wave.svg" alt="WaveCast" className={cn("h-8 w-auto", imageClassName)} />
      </div>
    );
  }

  return (
    <div className={cn("flex items-center", className)}>
      <img
        src="/brand/logo.svg"
        alt="WaveCast"
        className={cn("h-10 w-auto dark:hidden", imageClassName)}
      />
      <img
        src="/brand/logo-dark.svg"
        alt="WaveCast"
        className={cn("hidden h-10 w-auto dark:block", imageClassName)}
      />
    </div>
  );
}
