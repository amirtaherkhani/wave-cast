"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ComponentType } from "react";
import { motion } from "framer-motion";
import {
  Bell,
  Camera,
  CheckCircle,
  Microphone,
  Radio,
  ShieldCheck,
  SlidersHorizontal,
  SpeakerHigh,
  Trash,
  User,
  WarningCircle,
  Waveform,
} from "@phosphor-icons/react/ssr";

import { TopBar } from "@/components/common/top-bar";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { alex } from "@/features/wavecast/mock-data";
import { cn } from "@/lib/utils";

type PermissionStatus = "idle" | "ready" | "blocked";
type DevicePanel = "profile" | "devices" | "preferences";

const panelTabs = [
  { id: "profile", label: "Profile", icon: User },
  { id: "devices", label: "Devices", icon: Microphone },
  { id: "preferences", label: "Preferences", icon: SlidersHorizontal },
] as const;

const voiceLevelSteps = [1, 2, 3] as const;

export default function ProfilePage() {
  const [activePanel, setActivePanel] = useState<DevicePanel>("devices");
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [permissionStatus, setPermissionStatus] = useState<PermissionStatus>("idle");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(alex.avatar);
  const [avatarFileName, setAvatarFileName] = useState("");
  const [voiceLevelStep, setVoiceLevelStep] = useState(0);
  const [isMicTesting, setIsMicTesting] = useState(false);
  const [selectedMic, setSelectedMic] = useState("");
  const [selectedSpeaker, setSelectedSpeaker] = useState("");
  const [noiseSuppression, setNoiseSuppression] = useState(true);
  const [echoCancellation, setEchoCancellation] = useState(true);
  const [autoGain, setAutoGain] = useState(true);
  const [joinMuted, setJoinMuted] = useState(true);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const avatarObjectUrlRef = useRef<string | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const microphones = useMemo(() => devices.filter((device) => device.kind === "audioinput"), [devices]);
  const speakers = useMemo(() => devices.filter((device) => device.kind === "audiooutput"), [devices]);

  const refreshDevices = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return;

    const nextDevices = await navigator.mediaDevices.enumerateDevices();
    setDevices(nextDevices);
    setSelectedMic((current) => current || nextDevices.find((device) => device.kind === "audioinput")?.deviceId || "");
    setSelectedSpeaker((current) => current || nextDevices.find((device) => device.kind === "audiooutput")?.deviceId || "");
  }, []);

  useEffect(() => {
    void refreshDevices();
  }, [refreshDevices]);

  const stopMicrophoneTest = useCallback(() => {
    if (animationFrameRef.current) {
      window.cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    micStreamRef.current?.getTracks().forEach((track) => track.stop());
    micStreamRef.current = null;
    void audioContextRef.current?.close();
    audioContextRef.current = null;
    setIsMicTesting(false);
    setVoiceLevelStep(0);
  }, []);

  const testMicrophone = async () => {
    if (isMicTesting) {
      stopMicrophoneTest();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          noiseSuppression,
          echoCancellation,
          autoGainControl: autoGain,
          deviceId: selectedMic ? { exact: selectedMic } : undefined,
        },
      });

      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.62;

      const source = audioContext.createMediaStreamSource(stream);
      const timeData = new Uint8Array(analyser.fftSize);

      source.connect(analyser);
      await audioContext.resume();
      micStreamRef.current = stream;
      audioContextRef.current = audioContext;
      setIsMicTesting(true);
      setPermissionStatus("ready");
      await refreshDevices();

      const updateVoiceLevel = () => {
        analyser.getByteTimeDomainData(timeData);

        let sumSquares = 0;
        for (const value of timeData) {
          const normalizedSample = (value - 128) / 128;
          sumSquares += normalizedSample * normalizedSample;
        }

        const rms = Math.sqrt(sumSquares / timeData.length);
        const inputLevel = Math.min(100, Math.round(rms * 420));
        const nextStep = inputLevel > 62 ? 3 : inputLevel > 28 ? 2 : inputLevel > 8 ? 1 : 0;

        setVoiceLevelStep(nextStep);
        animationFrameRef.current = window.requestAnimationFrame(updateVoiceLevel);
      };

      updateVoiceLevel();
    } catch {
      setPermissionStatus("blocked");
      setIsMicTesting(false);
    }
  };

  useEffect(() => stopMicrophoneTest, [stopMicrophoneTest]);

  useEffect(
    () => () => {
      if (avatarObjectUrlRef.current) {
        URL.revokeObjectURL(avatarObjectUrlRef.current);
      }
    },
    [],
  );

  const handleAvatarChange = (file: File | null) => {
    if (!file) return;

    if (avatarObjectUrlRef.current) {
      URL.revokeObjectURL(avatarObjectUrlRef.current);
    }

    const previewUrl = URL.createObjectURL(file);
    avatarObjectUrlRef.current = previewUrl;
    setAvatarPreview(previewUrl);
    setAvatarFileName(file.name);
  };

  const removeAvatar = () => {
    if (avatarObjectUrlRef.current) {
      URL.revokeObjectURL(avatarObjectUrlRef.current);
      avatarObjectUrlRef.current = null;
    }

    setAvatarPreview(null);
    setAvatarFileName("");
    if (avatarInputRef.current) {
      avatarInputRef.current.value = "";
    }
  };

  const permissionCopy = {
    idle: {
      label: "Not tested",
      detail: "Test your microphone before going on stage.",
      tone: "bg-muted text-muted-foreground",
      icon: WarningCircle,
    },
    ready: {
      label: "Ready",
      detail: "Microphone permission is enabled for live rooms.",
      tone: "bg-emerald-500/12 text-emerald-500",
      icon: CheckCircle,
    },
    blocked: {
      label: "Blocked",
      detail: "Browser permission is blocked. Enable microphone access in site settings.",
      tone: "bg-destructive/10 text-destructive",
      icon: WarningCircle,
    },
  }[permissionStatus];

  return (
    <div className="min-h-screen bg-card text-foreground">
      <TopBar />
      <main className="mx-auto flex w-full max-w-[1440px] flex-col gap-5 px-5 py-6">
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.38, ease: "easeOut" }}
          className="overflow-hidden rounded-[22px] border border-border bg-background shadow-[0_20px_70px_rgba(15,23,42,0.10)]"
        >
          <div className="relative grid gap-6 bg-[radial-gradient(circle_at_top_left,rgba(102,132,255,0.16),transparent_34%),linear-gradient(135deg,rgba(186,230,253,0.26),rgba(224,242,254,0.18),rgba(240,253,250,0.18))] p-6 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div className="flex min-w-0 flex-col justify-between gap-8">
              <div>
                <Badge variant="brand" className="mb-3 h-6 rounded-[8px] px-2.5 text-[11px] font-black">
                  Profile and setup
                </Badge>
                <h1 className="text-3xl font-black leading-tight text-foreground">Brian Miller</h1>
                <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-muted-foreground">
                  Manage your room identity, audio devices, and stage preferences before you join or host a live room.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <StatusCard icon={User} label="User ID" value={alex.id} tone="bg-sky-500/10 text-sky-600" />
                <StatusCard icon={Radio} label="Role" value={alex.role} tone="bg-primary/10 text-primary" />
                <StatusCard icon={Microphone} label="Mic" value={permissionCopy.label} tone={permissionCopy.tone} />
              </div>
            </div>

            <div className="rounded-[24px] border border-sky-200/55 bg-sky-50/95 p-5 shadow-[0_22px_70px_rgba(14,35,70,0.14)] dark:border-sky-200/15 dark:bg-[#22344b]">
              <div className="mx-auto mb-4 flex h-36 w-36 items-center justify-center rounded-[32px] border border-sky-200/70 bg-white/85 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_16px_34px_rgba(15,23,42,0.14)] dark:border-sky-100/10 dark:bg-[#31465e]">
                <div className="flex h-28 w-28 items-center justify-center rounded-[26px] border border-white/80 bg-slate-100 shadow-[0_12px_26px_rgba(15,23,42,0.16)] dark:border-white/10 dark:bg-[#40566f]">
                  <Avatar src={avatarPreview ?? undefined} name={alex.name} online size={92} className="shadow-xl ring-4 ring-white/85 dark:ring-[#27394f]" />
                </div>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => handleAvatarChange(event.target.files?.[0] ?? null)}
                />
              </div>
              <div className="text-center">
                <p className="text-lg font-black text-foreground">{alex.name}</p>
                <p className="text-xs font-semibold text-muted-foreground">
                  @{alex.username} • {alex.id}
                </p>
                <p className="mt-1 min-h-4 text-[10px] font-semibold text-muted-foreground">
                  {avatarFileName || "Profile photo synced with your room identity"}
                </p>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <Button variant="soft" size="sm" className="rounded-[12px]" onClick={() => avatarInputRef.current?.click()}>
                  <Camera className="h-4 w-4" />
                  Change
                </Button>
                <Button variant="danger" size="sm" className="rounded-[12px]" onClick={removeAvatar}>
                  <Trash className="h-4 w-4" />
                  Remove
                </Button>
              </div>
              <div className="mt-4 rounded-[14px] border border-sky-200/55 bg-white/70 p-3 shadow-sm dark:border-sky-100/10 dark:bg-[#2b4058]">
                <div className="mb-2 flex items-center justify-between text-xs font-bold">
                  <span className="text-muted-foreground">Voice level</span>
                  <span className={cn(isMicTesting ? "text-emerald-500" : "text-primary")}>
                    {isMicTesting ? `Step ${voiceLevelStep}/3` : "Mic inactive"}
                  </span>
                </div>
                <div className="flex h-12 items-end gap-2">
                  {voiceLevelSteps.map((stepNumber) => {
                    const isActiveStep = isMicTesting && voiceLevelStep >= stepNumber;

                    return (
                      <motion.span
                        key={stepNumber}
                        aria-label={`Voice level step ${stepNumber}`}
                        className={cn(
                          "block flex-1 rounded-full transition-colors",
                          isActiveStep
                            ? "bg-emerald-500/85 shadow-[0_8px_20px_rgba(16,185,129,0.24)]"
                            : "bg-primary/25 dark:bg-sky-100/18",
                        )}
                        animate={{ height: isActiveStep ? "18px" : "6px", opacity: isActiveStep ? 1 : 0.62 }}
                        transition={{ duration: 0.14, ease: "easeOut" }}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </motion.section>

        <section className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
          <motion.nav
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.32, delay: 0.08 }}
            className="h-fit rounded-[18px] border border-border bg-background p-2 shadow-sm"
          >
            {panelTabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setActivePanel(id)}
                className={cn(
                  "mb-1 flex h-12 w-full items-center gap-3 rounded-[12px] px-3 text-left text-sm font-bold transition last:mb-0",
                  activePanel === id
                    ? "bg-primary/10 text-primary shadow-sm"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon className="h-5 w-5" />
                {label}
              </button>
            ))}
          </motion.nav>

          <motion.div
            key={activePanel}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.24 }}
            className="min-w-0"
          >
            {activePanel === "profile" ? <ProfilePanel /> : null}
            {activePanel === "devices" ? (
              <DevicesPanel
                microphones={microphones}
                speakers={speakers}
                selectedMic={selectedMic}
                selectedSpeaker={selectedSpeaker}
                setSelectedMic={setSelectedMic}
                setSelectedSpeaker={setSelectedSpeaker}
                permissionCopy={permissionCopy}
                testMicrophone={testMicrophone}
                isMicTesting={isMicTesting}
                noiseSuppression={noiseSuppression}
                echoCancellation={echoCancellation}
                autoGain={autoGain}
                joinMuted={joinMuted}
                setNoiseSuppression={setNoiseSuppression}
                setEchoCancellation={setEchoCancellation}
                setAutoGain={setAutoGain}
                setJoinMuted={setJoinMuted}
              />
            ) : null}
            {activePanel === "preferences" ? <PreferencesPanel /> : null}
          </motion.div>
        </section>
      </main>
    </div>
  );
}

function ProfilePanel() {
  return (
    <PanelShell title="Profile details" description="How other listeners and hosts see you in rooms." icon={User}>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Display name" defaultValue={alex.name} />
        <Field label="Username" defaultValue={alex.username} />
        <label className="md:col-span-2">
          <span className="mb-1 block text-xs font-bold text-muted-foreground">Bio</span>
          <textarea
            defaultValue="Host of practical AI rooms, product sessions, and builder roundtables."
            className="min-h-28 w-full resize-none rounded-[14px] border border-border bg-muted/25 px-3 py-3 text-sm font-semibold outline-none transition focus:border-primary/40 focus:ring-3 focus:ring-primary/15"
          />
        </label>
      </div>
    </PanelShell>
  );
}

function DevicesPanel({
  microphones,
  speakers,
  selectedMic,
  selectedSpeaker,
  setSelectedMic,
  setSelectedSpeaker,
  permissionCopy,
  testMicrophone,
  isMicTesting,
  noiseSuppression,
  echoCancellation,
  autoGain,
  joinMuted,
  setNoiseSuppression,
  setEchoCancellation,
  setAutoGain,
  setJoinMuted,
}: {
  microphones: MediaDeviceInfo[];
  speakers: MediaDeviceInfo[];
  selectedMic: string;
  selectedSpeaker: string;
  setSelectedMic: (value: string) => void;
  setSelectedSpeaker: (value: string) => void;
  permissionCopy: {
    label: string;
    detail: string;
    tone: string;
    icon: ComponentType<{ className?: string }>;
  };
  testMicrophone: () => Promise<void>;
  isMicTesting: boolean;
  noiseSuppression: boolean;
  echoCancellation: boolean;
  autoGain: boolean;
  joinMuted: boolean;
  setNoiseSuppression: (value: boolean) => void;
  setEchoCancellation: (value: boolean) => void;
  setAutoGain: (value: boolean) => void;
  setJoinMuted: (value: boolean) => void;
}) {
  const PermissionIcon = permissionCopy.icon;

  return (
    <PanelShell title="Device studio" description="Choose your microphone, speaker, camera, and stage defaults." icon={Microphone}>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_330px]">
        <div className="grid gap-4">
          <DeviceSelect
            icon={Microphone}
            label="Microphone"
            value={selectedMic}
            onChange={setSelectedMic}
            devices={microphones}
            fallback="No microphone detected"
          />
          <DeviceSelect
            icon={SpeakerHigh}
            label="Speaker output"
            value={selectedSpeaker}
            onChange={setSelectedSpeaker}
            devices={speakers}
            fallback="Default browser output"
          />
        </div>

        <div className="rounded-[18px] border border-border bg-muted/25 p-4">
          <div className={cn("mb-3 flex items-start gap-3 rounded-[14px] p-3", permissionCopy.tone)}>
            <PermissionIcon className="mt-0.5 h-5 w-5" />
            <div>
              <p className="text-sm font-black">{permissionCopy.label}</p>
              <p className="mt-1 text-xs font-semibold opacity-80">{permissionCopy.detail}</p>
            </div>
          </div>
          <Button className="w-full rounded-[12px]" onClick={() => void testMicrophone()}>
            <Waveform className="h-4 w-4" />
            {isMicTesting ? "Stop microphone test" : "Test microphone"}
          </Button>
          <div className="mt-4 grid gap-2">
            <ToggleRow label="Noise suppression" checked={noiseSuppression} onChange={setNoiseSuppression} />
            <ToggleRow label="Echo cancellation" checked={echoCancellation} onChange={setEchoCancellation} />
            <ToggleRow label="Auto gain" checked={autoGain} onChange={setAutoGain} />
            <ToggleRow label="Join muted" checked={joinMuted} onChange={setJoinMuted} />
          </div>
        </div>
      </div>
    </PanelShell>
  );
}

function PreferencesPanel() {
  return (
    <PanelShell title="Room preferences" description="Default behaviors for reminders, privacy, and room entry." icon={SlidersHorizontal}>
      <div className="grid gap-3 md:grid-cols-2">
        <PreferenceCard icon={Bell} title="Smart reminders" description="Notify me before saved rooms go live." />
        <PreferenceCard icon={ShieldCheck} title="Private presence" description="Hide my listening activity from people outside the room." />
        <PreferenceCard icon={Radio} title="Auto room recovery" description="Reconnect me to the last active room after network drops." />
        <PreferenceCard icon={Waveform} title="Audio safety" description="Keep stage audio normalized before joining as a speaker." />
      </div>
    </PanelShell>
  );
}

function PanelShell({
  title,
  description,
  icon: Icon,
  children,
}: {
  title: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[20px] border border-border bg-background p-5 shadow-lg">
      <div className="mb-5 flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-xl font-black text-foreground">{title}</h2>
          <p className="mt-1 text-sm font-medium text-muted-foreground">{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function StatusCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <div className="rounded-[16px] border border-border bg-card/75 p-3 shadow-sm">
      <span className={cn("mb-3 flex h-9 w-9 items-center justify-center rounded-[12px]", tone)}>
        <Icon className="h-4 w-4" />
      </span>
      <p className="text-[11px] font-black uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-black text-foreground">{value}</p>
    </div>
  );
}

function Field({ label, defaultValue }: { label: string; defaultValue: string }) {
  return (
    <label>
      <span className="mb-1 block text-xs font-bold text-muted-foreground">{label}</span>
      <Input defaultValue={defaultValue} className="h-11 rounded-[14px] border-border bg-muted/25 px-3 font-semibold" />
    </label>
  );
}

function DeviceSelect({
  icon: Icon,
  label,
  value,
  onChange,
  devices,
  fallback,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  onChange: (value: string) => void;
  devices: MediaDeviceInfo[];
  fallback: string;
}) {
  const resolvedDevices = devices.map((device, index) => ({
    device,
    value: device.deviceId || `${device.kind}-${index}`,
  }));
  const selectedValue = resolvedDevices.some((item) => item.value === value)
    ? value
    : (resolvedDevices[0]?.value ?? "__fallback");

  return (
    <label className="block rounded-[18px] border border-border bg-card p-4 shadow-sm">
      <span className="mb-3 flex items-center gap-2 text-sm font-black text-foreground">
        <span className="flex h-9 w-9 items-center justify-center rounded-[12px] bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </span>
        {label}
      </span>
      <Select
        value={selectedValue}
        onValueChange={(nextValue) => {
          if (nextValue !== "__fallback") {
            onChange(nextValue);
          }
        }}
        disabled={resolvedDevices.length === 0}
      >
        <SelectTrigger className="h-11 rounded-[14px] border-border bg-muted/25 px-3 font-semibold">
          <SelectValue placeholder={fallback} />
        </SelectTrigger>
        <SelectContent className="rounded-[14px] border-border bg-card">
          {resolvedDevices.length > 0 ? (
            resolvedDevices.map(({ device, value: deviceValue }, index) => (
              <SelectItem key={deviceValue} value={deviceValue} className="rounded-[10px]">
                {device.label || `${label} ${index + 1}`}
              </SelectItem>
            ))
          ) : (
            <SelectItem value="__fallback" disabled className="rounded-[10px]">
              {fallback}
            </SelectItem>
          )}
        </SelectContent>
      </Select>
    </label>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-center justify-between rounded-[12px] bg-background px-3 py-2 text-sm font-bold"
    >
      <span>{label}</span>
      <span className={cn("flex h-6 w-11 items-center rounded-full p-1 transition", checked ? "bg-primary" : "bg-muted")}>
        <span
          className={cn(
            "h-4 w-4 rounded-full bg-white shadow transition",
            checked ? "translate-x-5" : "translate-x-0",
          )}
        />
      </span>
    </button>
  );
}

function PreferenceCard({
  icon: Icon,
  title,
  description,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-[18px] border border-border bg-card p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
      <span className="mb-4 flex h-10 w-10 items-center justify-center rounded-[13px] bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </span>
      <h3 className="text-sm font-black text-foreground">{title}</h3>
      <p className="mt-1 text-xs font-medium leading-5 text-muted-foreground">{description}</p>
    </div>
  );
}
