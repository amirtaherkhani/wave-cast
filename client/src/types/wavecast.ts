export type RoomStatus = "live" | "scheduled" | "finished";

export type UserRole = "Host" | "Speaker" | "Listener" | "Moderator" | "Admin";

export type Person = {
  id: string;
  name: string;
  username: string;
  role: UserRole;
  avatar: string;
  isFriend?: boolean;
  online?: boolean;
  isSpeaking?: boolean;
};

export type Room = {
  id: string;
  title: string;
  topic: string;
  status: RoomStatus;
  listenerCount: number;
  speakerCount: number;
  startedAt: string;
  duration: string;
  recording: boolean;
  hlsStatus: "Healthy" | "Pending" | "Off";
  language: string;
  owner: Person;
  speakers: Person[];
  listeners: Person[];
};

export type SpeakerRequest = {
  id: string;
  person: Person;
  message: string;
  requestedAt: string;
  status: "pending" | "approved" | "declined";
};

export type SystemJob = {
  id: string;
  type: string;
  status: "Running" | "Completed" | "Retrying" | "Failed";
  createdAt: string;
};

export type Report = {
  id: string;
  room: string;
  status: "Ready" | "Generating" | "Failed";
  createdAt: string;
};

export type Recording = {
  id: string;
  room: string;
  duration: string;
  size: string;
  status: "Ready" | "Processing";
};

export type RealtimeEvent = {
  time: string;
  event: string;
  room: string;
  user: string;
  details: string;
};
