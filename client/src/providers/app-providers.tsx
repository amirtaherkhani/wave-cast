"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { useState } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "sonner";

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60_000,
            retry: 0,
          },
        },
      }),
  );

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <TooltipProvider delayDuration={180}>
        <QueryClientProvider client={queryClient}>
          <Toaster
            position="bottom-right"
            closeButton
            richColors
            expand
            toastOptions={{
              className:
                "rounded-[14px] border border-border/70 bg-gradient-to-t from-muted/50 to-background/50 text-foreground shadow-lg shadow-black/10 backdrop-blur-sm",
              descriptionClassName: "text-sm text-muted-foreground",
              classNames: {
                title: "text-sm font-extrabold text-foreground",
                description: "text-sm text-muted-foreground",
                actionButton:
                  "h-7 rounded-full bg-primary/10 px-3 text-xs font-semibold text-primary hover:bg-primary/20",
                cancelButton:
                  "h-7 rounded-full bg-muted px-3 text-xs font-semibold text-muted-foreground hover:bg-muted/80",
              },
            }}
          />
          {children}
        </QueryClientProvider>
      </TooltipProvider>
    </ThemeProvider>
  );
}
