// Hook ini membuka koneksi SSE untuk alert sistem realtime. Dipakai AlertBanner agar masalah health muncul tanpa menunggu polling.
"use client";

import { useEffect, useState } from "react";

// SystemAlert merepresentasikan alert health realtime dari SSE. Severity menentukan warna banner tanpa mengubah layout halaman.
export type SystemAlert = {
  id: string;
  severity: "warning" | "error";
  message: string;
};

// useSystemAlert membuka EventSource ke /api/stream/alerts. Re-render terjadi saat alert baru masuk atau user dismiss alert.
export function useSystemAlert() {
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);

  // useEffect hanya jalan saat mount karena endpoint SSE tetap sama. Cleanup menutup EventSource agar koneksi tidak bocor saat komponen unmount.
  useEffect(() => {
    const eventSource = new EventSource("/api/stream/alerts");

    eventSource.onmessage = (event) => {
      try {
        const alert = JSON.parse(event.data) as SystemAlert;
        setAlerts((current) => [alert, ...current.filter((item) => item.id !== alert.id)].slice(0, 5));
      } catch {
        // Ignore malformed alert payloads.
      }
    };

    eventSource.onerror = () => {
      // Browser EventSource handles reconnects automatically.
    };

    return () => eventSource.close();
  }, []);

  // dismiss menghapus alert dari state lokal tanpa memanggil server karena alert banner bersifat presentasional.
  function dismiss(id: string) {
    setAlerts((current) => current.filter((alert) => alert.id !== id));
  }

  return { alerts, dismiss };
}
