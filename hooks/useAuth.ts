// Hook ini mengambil sesi user aktif dan menyediakan logout. Dipakai TopBar serta komponen yang perlu membaca status autentikasi.
"use client";

import { useRouter } from "next/navigation";
import useSWR from "swr";
import type { AuthUser } from "@/lib/api/types";

// fetcher mengambil user aktif dari API auth. Error sengaja dilempar agar SWR menandai sesi sebagai tidak terautentikasi.
const fetcher = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) throw new Error("Unauthenticated");
  return response.json() as Promise<{ data: AuthUser }>;
};

// useAuth mengembalikan user, loading state, status authenticated, dan logout. Re-render dipicu SWR saat /api/auth/me selesai atau mutate logout dipanggil.
export function useAuth() {
  const router = useRouter();
  const { data, error, mutate } = useSWR("/api/auth/me", fetcher);

  // logout memanggil API untuk menghapus HttpOnly cookie lalu membersihkan cache SWR lokal sebelum redirect ke login.
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    await mutate(undefined, { revalidate: false });
    router.push("/login");
  }

  return {
    user: data?.data,
    isLoading: !data && !error,
    isAuthenticated: !!data?.data,
    logout
  };
}
