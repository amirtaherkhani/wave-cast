"use client";

import Link from "next/link";
import { useMemo, useState, type ComponentType, type ReactNode } from "react";
import {
  ArrowLeft,
  ChartBar,
  CheckCircle,
  Clock,
  FileText,
  GearSix,
  Microphone,
  Radio,
  Record,
  ShieldCheck,
  SignOut,
  SlidersHorizontal,
  UserCirclePlus,
  UsersThree,
  Waveform,
  XCircle,
} from "@phosphor-icons/react/ssr";

import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TopBar } from "@/components/common/top-bar";
import { alex, room } from "@/features/wavecast/mock-data";
import { cn } from "@/lib/utils";

type RoomStatus = "draft" | "scheduled" | "live" | "ending" | "finished" | "cancelled";
type StreamProtocol = "hls" | "ll_hls";

const roomStatuses: RoomStatus[] = ["draft", "scheduled", "live", "ending", "finished", "cancelled"];
const streamProtocols: StreamProtocol[] = ["hls", "ll_hls"];

const endpointGroups = [
  {
    title: "Lifecycle",
    items: [
      ["POST", "/v1/rooms", "Create room"],
      ["GET", "/v1/rooms/{roomId}", "Get room"],
      ["POST", "/v1/rooms/{roomId}/start", "Start room"],
      ["POST", "/v1/rooms/{roomId}/finish", "Finish room"],
      ["GET", "/v1/rooms/{roomId}/active-counts", "Active counts"],
    ],
  },
  {
    title: "Access",
    items: [
      ["POST", "/v1/rooms/{roomId}/join", "Join room"],
      ["POST", "/v1/rooms/{roomId}/leave", "Leave room"],
      ["POST", "/v1/rooms/{roomId}/listener-sessions/{sessionId}/heartbeat", "Listener heartbeat"],
      ["GET", "/v1/rooms/{roomId}/listener-stream", "Listener stream"],
    ],
  },
  {
    title: "Moderation",
    items: [
      ["POST", "/v1/rooms/{roomId}/speaker-requests", "Request to speak"],
      ["POST", "/v1/rooms/{roomId}/speaker-requests/{requestId}/approve", "Approve speaker"],
      ["POST", "/v1/rooms/{roomId}/participants/{userId}/block-speaking", "Block speaking"],
      ["POST", "/v1/rooms/{roomId}/participants/{userId}/remove", "Remove participant"],
    ],
  },
  {
    title: "Recording and reports",
    items: [
      ["POST", "/v1/rooms/{roomId}/recording/start", "Start recording"],
      ["POST", "/v1/rooms/{roomId}/recording/stop", "Stop recording"],
      ["GET", "/v1/rooms/{roomId}/recordings", "List recordings"],
      ["POST", "/v1/rooms/{roomId}/report/generate", "Generate report"],
      ["GET", "/v1/rooms/{roomId}/report", "Get report"],
    ],
  },
] as const;

const moderationActions = [
  { label: "Approve speaker", icon: UserCirclePlus, tone: "text-primary", path: "speaker-requests/{requestId}/approve" },
  { label: "Decline request", icon: XCircle, tone: "text-destructive", path: "speaker-requests/{requestId}/decline" },
  { label: "Revoke speaker", icon: Microphone, tone: "text-chart-5", path: "participants/{userId}/revoke-speaker" },
  { label: "Block speaking", icon: ShieldCheck, tone: "text-destructive", path: "participants/{userId}/block-speaking" },
  { label: "Remove participant", icon: SignOut, tone: "text-destructive", path: "participants/{userId}/remove" },
];

const permissions = [
  ["Can speak", true],
  ["Can moderate", true],
  ["Can record", true],
  ["Can report", true],
] as const;

function SettingPanel({
  title,
  description,
  icon: Icon,
  children,
  action,
}: {
  title: string;
  description?: string;
  icon: ComponentType<{ className?: string }>;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="self-start rounded-[8px] border border-border bg-card p-4 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] bg-primary/10 text-primary">
            <Icon className="h-4 w-4" />
          </span>
          <span className="min-w-0">
            <h2 className="text-base font-extrabold text-foreground">{title}</h2>
            {description ? <p className="mt-0.5 text-xs text-muted-foreground">{description}</p> : null}
          </span>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold uppercase text-muted-foreground">{label}</span>
      <Input
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 rounded-[8px] border-border bg-background px-3"
      />
    </label>
  );
}

function ToggleRow({
  label,
  description,
  enabled,
  onClick,
}: {
  label: string;
  description: string;
  enabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between gap-4 rounded-[8px] border border-border bg-background px-3 py-3 text-left transition hover:bg-muted"
    >
      <span>
        <span className="block text-sm font-bold text-foreground">{label}</span>
        <span className="block text-xs text-muted-foreground">{description}</span>
      </span>
      <span
        className={cn(
          "flex h-6 w-11 shrink-0 items-center rounded-full p-1 transition",
          enabled ? "justify-end bg-primary" : "justify-start bg-muted-foreground/25",
        )}
      >
        <span className="h-4 w-4 rounded-full bg-background shadow-sm" />
      </span>
    </button>
  );
}

export default function RoomSettingsPage() {
  const [title, setTitle] = useState(room.title);
  const [status, setStatus] = useState<RoomStatus>("live");
  const [ownerId, setOwnerId] = useState(room.owner.id);
  const [adminIds, setAdminIds] = useState("user_brian,user_floyd");
  const [moderatorIds, setModeratorIds] = useState("user_floyd");
  const [recordingEnabled, setRecordingEnabled] = useState(room.recording);
  const [passiveEnabled, setPassiveEnabled] = useState(true);
  const [protocol, setProtocol] = useState<StreamProtocol>("ll_hls");
  const [targetLatency, setTargetLatency] = useState("2500");
  const [segmentDuration, setSegmentDuration] = useState("2000");
  const [partDuration, setPartDuration] = useState("500");
  const [reportEnabled, setReportEnabled] = useState(true);
  const [moderationEnabled, setModerationEnabled] = useState(true);

  const backendRoom = useMemo(
    () => ({
      id: room.id,
      liveKitRoomName: `lk_${room.id}`,
      listenerStreamId: `lst_${room.id.slice(-8).toLowerCase()}`,
      ownerId,
      adminIds: adminIds.split(",").map((item) => item.trim()).filter(Boolean),
      moderatorIds: moderatorIds.split(",").map((item) => item.trim()).filter(Boolean),
    }),
    [adminIds, moderatorIds, ownerId],
  );

  const statusTone = status === "live" ? "live" : status === "finished" || status === "cancelled" ? "neutral" : "brand";

  return (
    <div className="min-h-screen bg-background">
      <TopBar />
      <main className="mx-auto flex w-full max-w-[1440px] flex-col gap-5 px-5 py-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <Button asChild variant="secondary" size="icon" className="h-10 w-10 rounded-[8px]">
              <Link href="/" aria-label="Back to live room">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div className="min-w-0">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <Badge tone={statusTone} className="h-6 rounded-[6px] px-2 text-[11px] font-bold uppercase">
                  {status}
                </Badge>
                <span className="text-xs font-semibold text-muted-foreground">{backendRoom.id}</span>
              </div>
              <h1 className="truncate text-2xl font-extrabold text-foreground">Room Settings</h1>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" className="rounded-[8px]">
              <Clock className="h-4 w-4" />
              Schedule
            </Button>
            <Button variant="destructive" className="rounded-[8px]">
              <SignOut className="h-4 w-4" />
              Finish Room
            </Button>
            <Button className="rounded-[8px]">
              <CheckCircle className="h-4 w-4" />
              Save
            </Button>
          </div>
        </div>

        <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
          <Tabs defaultValue="general" className="min-w-0">
            <TabsList className="mb-3 flex h-auto w-full flex-wrap justify-start rounded-[8px] bg-muted p-1">
              <TabsTrigger value="general" className="h-8 rounded-[7px] px-3">
                <GearSix className="h-4 w-4" />
                General
              </TabsTrigger>
              <TabsTrigger value="access" className="h-8 rounded-[7px] px-3">
                <UsersThree className="h-4 w-4" />
                Access
              </TabsTrigger>
              <TabsTrigger value="media" className="h-8 rounded-[7px] px-3">
                <Waveform className="h-4 w-4" />
                Media
              </TabsTrigger>
              <TabsTrigger value="recording" className="h-8 rounded-[7px] px-3">
                <Record className="h-4 w-4" />
                Recording
              </TabsTrigger>
              <TabsTrigger value="moderation" className="h-8 rounded-[7px] px-3">
                <ShieldCheck className="h-4 w-4" />
                Moderation
              </TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="grid items-start gap-4 lg:grid-cols-2">
              <SettingPanel title="Lifecycle" description="Room state and host-owned identity." icon={SlidersHorizontal}>
                <div className="grid gap-3">
                  <Field label="Title" value={title} onChange={setTitle} />
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-bold uppercase text-muted-foreground">Status</span>
                    <Select value={status} onValueChange={(value) => setStatus(value as RoomStatus)}>
                      <SelectTrigger className="h-10 w-full rounded-[8px] border-border bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {roomStatuses.map((item) => (
                          <SelectItem key={item} value={item}>
                            {item}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-[8px] border border-border bg-background p-3">
                      <p className="text-xs font-bold uppercase text-muted-foreground">Started</p>
                      <p className="mt-1 text-sm font-bold text-foreground">{room.startedAt.replace(" ago", "")}</p>
                    </div>
                    <div className="rounded-[8px] border border-border bg-background p-3">
                      <p className="text-xs font-bold uppercase text-muted-foreground">Duration</p>
                      <p className="mt-1 text-sm font-bold text-foreground">{room.duration}</p>
                    </div>
                  </div>
                </div>
              </SettingPanel>

              <SettingPanel title="Room Object" description="Fields returned by GET /v1/rooms/{roomId}." icon={FileText}>
                <div className="grid gap-2 text-sm">
                  {[
                    ["roomId", backendRoom.id],
                    ["livekitRoomName", backendRoom.liveKitRoomName],
                    ["listenerStreamId", backendRoom.listenerStreamId],
                    ["ownerId", backendRoom.ownerId],
                  ].map(([label, value]) => (
                    <div key={label} className="flex items-center justify-between gap-3 rounded-[8px] border border-border bg-background px-3 py-2">
                      <span className="text-xs font-bold text-muted-foreground">{label}</span>
                      <span className="truncate text-xs font-semibold text-foreground">{value}</span>
                    </div>
                  ))}
                </div>
              </SettingPanel>
            </TabsContent>

            <TabsContent value="access" className="grid items-start gap-4 lg:grid-cols-2">
              <SettingPanel title="Roles" description="Owner, admins, and moderators from the backend room model." icon={UsersThree}>
                <div className="grid gap-3">
                  <Field label="Owner ID" value={ownerId} onChange={setOwnerId} />
                  <Field label="Admin IDs" value={adminIds} onChange={setAdminIds} />
                  <Field label="Moderator IDs" value={moderatorIds} onChange={setModeratorIds} />
                </div>
              </SettingPanel>

              <SettingPanel title="Resolved Permissions" description="Permissions returned from join room." icon={ShieldCheck}>
                <div className="grid gap-2">
                  <div className="flex items-center gap-3 rounded-[8px] border border-border bg-background p-3">
                    <Avatar src={alex.avatar} name={alex.name} size={38} />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold text-foreground">{alex.name}</span>
                      <span className="block text-xs text-muted-foreground">owner session</span>
                    </span>
                  </div>
                  {permissions.map(([label, enabled]) => (
                    <div key={label} className="flex items-center justify-between rounded-[8px] border border-border bg-background px-3 py-2">
                      <span className="text-sm font-semibold text-foreground">{label}</span>
                      <Badge tone={enabled ? "success" : "neutral"} className="h-6 rounded-[6px] px-2 text-[11px]">
                        {enabled ? "allowed" : "off"}
                      </Badge>
                    </div>
                  ))}
                </div>
              </SettingPanel>
            </TabsContent>

            <TabsContent value="media" className="grid items-start gap-4 lg:grid-cols-2">
              <SettingPanel title="Listener Stream" description="Passive HLS or LL-HLS path for listeners." icon={Radio}>
                <div className="grid gap-3">
                  <ToggleRow
                    label="Passive stream"
                    description="listenerStream endpoint"
                    enabled={passiveEnabled}
                    onClick={() => setPassiveEnabled((value) => !value)}
                  />
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-bold uppercase text-muted-foreground">Protocol</span>
                    <Select value={protocol} onValueChange={(value) => setProtocol(value as StreamProtocol)}>
                      <SelectTrigger className="h-10 w-full rounded-[8px] border-border bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {streamProtocols.map((item) => (
                          <SelectItem key={item} value={item}>
                            {item}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <Field label="Latency MS" value={targetLatency} onChange={setTargetLatency} />
                    <Field label="Segment MS" value={segmentDuration} onChange={setSegmentDuration} />
                    <Field label="Part MS" value={partDuration} onChange={setPartDuration} />
                  </div>
                </div>
              </SettingPanel>

              <SettingPanel title="Speaker Path" description="LiveKit participant session for speakers and moderators." icon={Microphone}>
                <div className="grid gap-3">
                  <div className="rounded-[8px] border border-border bg-background p-3">
                    <p className="text-xs font-bold uppercase text-muted-foreground">Provider</p>
                    <p className="mt-1 text-sm font-bold text-foreground">livekit</p>
                  </div>
                  <div className="rounded-[8px] border border-border bg-background p-3">
                    <p className="text-xs font-bold uppercase text-muted-foreground">Room name</p>
                    <p className="mt-1 truncate text-sm font-bold text-foreground">{backendRoom.liveKitRoomName}</p>
                  </div>
                  <div className="rounded-[8px] border border-border bg-background p-3">
                    <p className="text-xs font-bold uppercase text-muted-foreground">Session endpoint</p>
                    <p className="mt-1 truncate text-xs font-semibold text-foreground">POST /v1/rooms/{backendRoom.id}/speaker-session</p>
                  </div>
                </div>
              </SettingPanel>
            </TabsContent>

            <TabsContent value="recording" className="grid items-start gap-4 lg:grid-cols-2">
              <SettingPanel title="Recording" description="Room recording config and active recording ID." icon={Record}>
                <div className="grid gap-3">
                  <ToggleRow
                    label="Recording enabled"
                    description="recording.enabled"
                    enabled={recordingEnabled}
                    onClick={() => setRecordingEnabled((value) => !value)}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="secondary" className="rounded-[8px]">
                      <Record className="h-4 w-4" />
                      Start
                    </Button>
                    <Button variant="danger" className="rounded-[8px]">
                      <XCircle className="h-4 w-4" />
                      Stop
                    </Button>
                  </div>
                  <div className="rounded-[8px] border border-border bg-background p-3">
                    <p className="text-xs font-bold uppercase text-muted-foreground">Active recording</p>
                    <p className="mt-1 text-sm font-bold text-foreground">
                      {recordingEnabled ? "activeRecordingId pending" : "disabled"}
                    </p>
                  </div>
                </div>
              </SettingPanel>

              <SettingPanel title="Reports" description="Generate room report after finish." icon={ChartBar}>
                <div className="grid gap-3">
                  <ToggleRow
                    label="Report jobs"
                    description="generate_room_report"
                    enabled={reportEnabled}
                    onClick={() => setReportEnabled((value) => !value)}
                  />
                  <div className="rounded-[8px] border border-border bg-background p-3">
                    <p className="text-xs font-bold uppercase text-muted-foreground">Report status</p>
                    <p className="mt-1 text-sm font-bold text-foreground">requested / generating / completed</p>
                  </div>
                  <Button variant="secondary" className="rounded-[8px]">
                    <FileText className="h-4 w-4" />
                    Generate report
                  </Button>
                </div>
              </SettingPanel>
            </TabsContent>

            <TabsContent value="moderation" className="grid items-start gap-4 lg:grid-cols-2">
              <SettingPanel title="Speaker Queue" description="Speaker requests and speaking blocks." icon={ShieldCheck}>
                <div className="grid gap-3">
                  <ToggleRow
                    label="Moderation queue"
                    description="speaker-requests"
                    enabled={moderationEnabled}
                    onClick={() => setModerationEnabled((value) => !value)}
                  />
                  {moderationActions.map(({ label, icon: Icon, tone, path }) => (
                    <div key={label} className="flex items-center justify-between gap-3 rounded-[8px] border border-border bg-background px-3 py-2">
                      <span className="flex min-w-0 items-center gap-2">
                        <Icon className={cn("h-4 w-4 shrink-0", tone)} />
                        <span className="truncate text-sm font-bold text-foreground">{label}</span>
                      </span>
                      <span className="hidden truncate text-[11px] font-semibold text-muted-foreground md:block">{path}</span>
                    </div>
                  ))}
                </div>
              </SettingPanel>

              <SettingPanel title="Realtime Events" description="Room event stream and connection tokens." icon={Waveform}>
                <div className="grid gap-2">
                  {[
                    "voice.room.started",
                    "voice.speaker.requested",
                    "voice.speaker.approved",
                    "voice.moderation.user_removed",
                    "voice.recording.completed",
                    "voice.report.completed",
                  ].map((event) => (
                    <div key={event} className="rounded-[8px] border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground">
                      {event}
                    </div>
                  ))}
                </div>
              </SettingPanel>
            </TabsContent>
          </Tabs>

          <aside className="flex flex-col gap-4">
            <SettingPanel title="Backend Map" description="Current HTTP surface for this settings page." icon={FileText}>
              <div className="space-y-4">
                {endpointGroups.map((group) => (
                  <div key={group.title}>
                    <p className="mb-2 text-xs font-extrabold uppercase text-muted-foreground">{group.title}</p>
                    <div className="space-y-2">
                      {group.items.map(([method, path, label]) => (
                        <div key={`${method}-${path}`} className="rounded-[8px] border border-border bg-background p-2">
                          <div className="mb-1 flex items-center justify-between gap-2">
                            <Badge variant="secondary" className="h-5 rounded-[6px] px-1.5 text-[10px] font-bold">
                              {method}
                            </Badge>
                            <span className="truncate text-xs font-bold text-foreground">{label}</span>
                          </div>
                          <p className="truncate text-[10px] font-semibold text-muted-foreground">{path}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </SettingPanel>
          </aside>
        </div>
      </main>
    </div>
  );
}
