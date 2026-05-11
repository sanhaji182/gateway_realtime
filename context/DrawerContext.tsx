// Context/helper ini menyediakan state drawer lokal yang reusable. Dipakai halaman tabel untuk membuka dan menutup detail item tanpa state duplikatif.
"use client";

import { useState } from "react";

// useDrawer menyimpan item yang sedang dibuka di drawer. Nilai item null berarti drawer tertutup; open/close dipakai halaman tabel untuk side effect UI lokal.
export function useDrawer<T>() {
  const [item, setItem] = useState<T | null>(null);
  const open = (nextItem: T) => setItem(nextItem);
  const close = () => setItem(null);

  return { item, isOpen: item !== null, open, close };
}
