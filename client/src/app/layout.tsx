import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ActiveRoomBackBar } from "@/components/common/active-room-back-bar";
import { AppProviders } from "@/providers/app-providers";
import { Inter } from "next/font/google";
import { cn } from "@/lib/utils";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "WaveCast",
  description: "Clubhouse-style live voice rooms for web.",
  icons: {
    icon: { url: "/brand/wave.svg", type: "image/svg+xml" },
    shortcut: "/brand/wave.svg",
    apple: "/brand/wave.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#6684FF",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={cn("font-sans", inter.variable)}>
      <body>
        <AppProviders>
          {children}
          <ActiveRoomBackBar />
        </AppProviders>
      </body>
    </html>
  );
}
