import { create } from "zustand";
import { alex, speakerRequests as seededSpeakerRequests } from "@/features/wavecast/mock-data";
import type { SpeakerRequest, Person } from "@/types/wavecast";

type SpeakerState = {
  micEnabled: boolean;
  requestPending: boolean;
  speakerRequests: SpeakerRequest[];
  toggleMic: () => void;
  toggleRequest: () => void;
  addSpeakerRequest: (person: Person) => void;
  removeSpeakerRequest: (requestId: string) => void;
};

const makeRequestId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
const currentUserRequestId = "request_current_user";
const nowText = () => "Just now";

const toPendingRequest = (person: Person): SpeakerRequest => ({
  id: makeRequestId(),
  person,
  message: `${person.name} is requesting to speak.`,
  requestedAt: nowText(),
  status: "pending",
});

export const useSpeakerStore = create<SpeakerState>((set) => ({
  micEnabled: false,
  requestPending: seededSpeakerRequests.some(
    (request) => request.status === "pending" && request.person.id === alex.id,
  ),
  speakerRequests: seededSpeakerRequests
    .filter((request) => request.status === "pending")
    .map((request) => ({ ...request })),
  toggleMic: () => set((state) => ({ micEnabled: !state.micEnabled })),
  toggleRequest: () =>
    set((state) => {
      const hasCurrentUserRequest = state.speakerRequests.some(
        (request) => request.person.id === alex.id && request.status === "pending",
      );

      if (hasCurrentUserRequest) {
        return {
          requestPending: false,
          speakerRequests: state.speakerRequests.filter((request) => request.person.id !== alex.id),
        };
      }

      return {
        requestPending: true,
        speakerRequests: [...state.speakerRequests, { ...toPendingRequest(alex), id: currentUserRequestId }],
      };
    }),
  addSpeakerRequest: (person) =>
    set((state) => {
      const hasActiveRequest = state.speakerRequests.some(
        (request) => request.person.id === person.id && request.status === "pending",
      );

      if (hasActiveRequest) return state;

      return {
        speakerRequests: [...state.speakerRequests, toPendingRequest(person)],
      };
    }),
  removeSpeakerRequest: (requestId) =>
    set((state) => {
      const removedPerson = state.speakerRequests.find((request) => request.id === requestId)?.person;

      if (!removedPerson) {
        return state;
      }

      const requestWasCurrentUser = removedPerson.id === alex.id;

      return {
        requestPending: requestWasCurrentUser ? false : state.requestPending,
        speakerRequests: state.speakerRequests.filter((request) => request.id !== requestId),
      };
    }),
}));
