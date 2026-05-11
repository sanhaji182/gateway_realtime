// File ini mendefinisikan dialog konfirmasi untuk aksi destruktif. Dipakai sebelum rotate secret, disable app, disconnect socket, atau hapus user.
"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/Button";

// ConfirmDialog merender modal konfirmasi untuk aksi destruktif. open/onOpenChange dikontrol parent agar side effect API tetap berada di halaman pemanggil.
export function ConfirmDialog({ open, onOpenChange, title, description, confirmLabel = "Confirm", cancelLabel = "Cancel", onConfirm }: { open: boolean; onOpenChange: (open: boolean) => void; title: string; description: string; confirmLabel?: string; cancelLabel?: string; onConfirm: () => void }) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100vw-32px)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border bg-surface1 p-5 shadow-none focus:outline-none">
          <Dialog.Title className="text-base font-semibold text-primary">{title}</Dialog.Title>
          <Dialog.Description className="mt-2 text-sm leading-6 text-secondary">{description}</Dialog.Description>
          <div className="mt-6 flex justify-end gap-2">
            <Dialog.Close asChild>
              <Button type="button" variant="secondary">{cancelLabel}</Button>
            </Dialog.Close>
            <Button type="button" variant="destructive" onClick={onConfirm}>{confirmLabel}</Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
