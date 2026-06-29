import { create } from "zustand";

type UiState = {
  activeRoomTab: "chat" | "people" | "activity";
  activeP2PFriendId: string | null;
  p2pUnreadCount: number;
  activeRoomId: string | null;
  activeRoomTitle: string | null;
  setActiveRoomTab: (tab: UiState["activeRoomTab"]) => void;
  setActiveP2PFriendId: (friendId: string | null) => void;
  setP2PUnreadCount: (count: number) => void;
  setActiveRoom: (payload: { id: string; title: string }) => void;
  clearActiveRoom: () => void;
};

export const useUiStore = create<UiState>((set) => ({
  activeRoomTab: "chat",
  activeP2PFriendId: null,
  p2pUnreadCount: 0,
  activeRoomId: null,
  activeRoomTitle: null,
  setActiveRoomTab: (tab) => set({ activeRoomTab: tab }),
  setActiveP2PFriendId: (friendId) => set({ activeP2PFriendId: friendId }),
  setP2PUnreadCount: (count) => set({ p2pUnreadCount: count }),
  setActiveRoom: ({ id, title }) => set({ activeRoomId: id, activeRoomTitle: title }),
  clearActiveRoom: () => set({ activeRoomId: null, activeRoomTitle: null }),
}));
