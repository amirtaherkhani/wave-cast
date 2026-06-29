import { create } from "zustand";

type RoomReminderState = {
  remindedRoomIds: string[];
  addReminder: (roomId: string) => void;
  removeReminder: (roomId: string) => void;
  toggleReminder: (roomId: string) => void;
};

export const useRoomReminderStore = create<RoomReminderState>((set) => ({
  remindedRoomIds: [],
  addReminder: (roomId) =>
    set((state) =>
      state.remindedRoomIds.includes(roomId)
        ? state
        : { remindedRoomIds: [...state.remindedRoomIds, roomId] },
    ),
  removeReminder: (roomId) =>
    set((state) => ({
      remindedRoomIds: state.remindedRoomIds.filter((id) => id !== roomId),
    })),
  toggleReminder: (roomId) =>
    set((state) =>
      state.remindedRoomIds.includes(roomId)
        ? { remindedRoomIds: state.remindedRoomIds.filter((id) => id !== roomId) }
        : { remindedRoomIds: [...state.remindedRoomIds, roomId] },
    ),
}));
