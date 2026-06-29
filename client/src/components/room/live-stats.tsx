import {
  Clock as Clock3,
  Radio,
  ShieldCheck,
  Users,
  UsersThree as UsersRound,
} from "@phosphor-icons/react/ssr";
import { room } from "@/features/wavecast/mock-data";

const roomStatusItems = [
  { label: "Room Status", value: room.status === "live" ? "Live" : "Offline", icon: Radio },
  { label: "Listeners", value: room.listenerCount.toLocaleString(), icon: Users },
  { label: "Speakers", value: room.speakerCount.toLocaleString(), icon: UsersRound },
  { label: "Active Since", value: room.startedAt.replace(" ago", ""), icon: Clock3 },
  { label: "Recording", value: room.recording ? "On" : "Off", icon: Radio },
  { label: "Room Rules", value: "5", icon: ShieldCheck },
] as const;

type LiveStatsProps = {
  variant?: "cards" | "footer";
};

export function LiveStats({ variant = "cards" }: LiveStatsProps) {
  if (variant === "footer") {
    return (
      <footer className="rounded-[16px] border border-border/70 bg-gradient-to-br from-primary/12 via-card/70 to-card p-4">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {roomStatusItems.map(({ label, value }) => (
            <div key={label} className="rounded-[12px] border border-white/10 bg-card/50 p-3 text-center">
              <p className="text-[10px] font-semibold tracking-wide text-muted-foreground">{label}</p>
              <p className="mt-2 text-base font-extrabold text-foreground">{value}</p>
            </div>
          ))}
        </div>
      </footer>
    );
  }

  return (
    <div className="grid grid-cols-6 gap-4">
      {roomStatusItems.map(({ label, value }) => (
        <div key={label} className="h-[86px] rounded-[12px] border border-border bg-card p-4">
          <p className="mb-3 text-xs font-bold text-muted-foreground">{label}</p>
          <div className="flex items-center justify-between gap-3">
            <span className="text-lg font-extrabold text-foreground">{value}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
