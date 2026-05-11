// Context ini membagikan time range observability ke TopBar dan halaman live. Dipakai Overview, Events, Webhooks, dan Connections untuk query realtime.
"use client";

import { createContext, useContext, useMemo, useState } from "react";
import type { TimeRange } from "@/lib/api";

type TimeRangeContextValue = {
  range: TimeRange;
  setRange: (range: TimeRange) => void;
};

// TimeRangeContext membagikan range global observability. Default 1h dipilih agar halaman pertama punya window data yang cukup tanpa query terlalu besar.
const TimeRangeContext = createContext<TimeRangeContextValue>({ range: "1h", setRange: () => {} });

// TimeRangeProvider menyimpan range di state React. Re-render terjadi saat user mengubah selector di TopBar sehingga hook SWR halaman terkait ikut revalidate.
export function TimeRangeProvider({ children }: { children: React.ReactNode }) {
  const [range, setRange] = useState<TimeRange>("1h");
  const value = useMemo(() => ({ range, setRange }), [range]);

  return <TimeRangeContext.Provider value={value}>{children}</TimeRangeContext.Provider>;
}

// useTimeRange mengembalikan range aktif dan setter. Dipakai halaman observability agar query data mengikuti pilihan TopBar.
export function useTimeRange() {
  return useContext(TimeRangeContext);
}
