// Hook ini mengecek apakah user boleh melakukan aksi edit/destruktif. Dipakai tombol aksi untuk membatasi role viewer.
"use client";

import { useAuth } from "@/hooks/useAuth";
import { canEdit } from "@/lib/auth/session";

// useCanEdit menyederhanakan guard role viewer. Hook ini ikut re-render saat useAuth menerima user baru dari SWR.
export function useCanEdit() {
  const { user, isLoading } = useAuth();

  return {
    canEdit: canEdit(user),
    isLoading,
    disabledReason: user?.role === "viewer" ? "Viewer access only" : undefined
  };
}
