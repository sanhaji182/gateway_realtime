"use client";

import { SWRConfig } from "swr";
import { ThemeProvider } from "@/components/ThemeProvider";
import { TimeRangeProvider } from "@/context/TimeRangeContext";
import { swrConfig } from "@/lib/swr";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig value={swrConfig}>
      <TimeRangeProvider>
        <ThemeProvider>{children}</ThemeProvider>
      </TimeRangeProvider>
    </SWRConfig>
  );
}
