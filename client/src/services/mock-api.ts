import {
  analyticsCards,
  chartData,
  jobs,
  people,
  recordings,
  reports,
  room,
  rooms,
  speakerRequests,
  realtimeEvents,
} from "@/features/wavecast/mock-data";

export const mockApi = {
  getRooms: async () => rooms,
  getRoom: async () => room,
  getPeople: async () => people,
  getSpeakerRequests: async () => speakerRequests,
  getJobs: async () => jobs,
  getReports: async () => reports,
  getRecordings: async () => recordings,
  getAnalytics: async () => ({ cards: analyticsCards, chartData }),
  getRealtimeEvents: async () => realtimeEvents,
};
