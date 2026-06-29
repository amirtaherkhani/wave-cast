import ky from "ky";

export const http = ky.create({
  prefixUrl: process.env.NEXT_PUBLIC_WAVECAST_API_URL ?? "http://localhost:8080",
  timeout: 10_000,
});
