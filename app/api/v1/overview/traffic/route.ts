import { NextRequest, NextResponse } from "next/server";
import type { TimeRange } from "@/lib/api/types";

const counts: Record<TimeRange, number> = { "30m": 30, "1h": 60, "24h": 24 };
const steps: Record<TimeRange, number> = { "30m": 60, "1h": 60, "24h": 3600 };

export async function GET(request: NextRequest) {
  const range = (request.nextUrl.searchParams.get("range") ?? "1h") as TimeRange;
  const count = counts[range] ?? counts["1h"];
  const step = steps[range] ?? steps["1h"];
  const now = Math.floor(Date.now() / 1000);

  return NextResponse.json({
    data: {
      points: Array.from({ length: count }).map((_, index) => {
        const offset = count - index - 1;
        return {
          ts: now - offset * step,
          value: 280 + Math.round(Math.sin(index / 4) * 42) + (index % 7) * 9
        };
      })
    }
  });
}
