import { create } from "zustand";

type PlaybackState = {
  status: "idle" | "connecting" | "playing" | "stalled";
  muted: boolean;
  setStatus: (status: PlaybackState["status"]) => void;
  toggleMuted: () => void;
};

export const usePlaybackStore = create<PlaybackState>((set) => ({
  status: "playing",
  muted: false,
  setStatus: (status) => set({ status }),
  toggleMuted: () => set((state) => ({ muted: !state.muted })),
}));
