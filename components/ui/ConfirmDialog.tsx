"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/Button";

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  onConfirm: () => void;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/20" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[360px] -translate-x-1/2 -translate-y-1/2 rounded border bg-surface p-5 shadow-sm focus:outline-none">
          <Dialog.Title className="text-[14px] font-semibold text-primary">{title}</Dialog.Title>
          <Dialog.Description className="mt-2 text-[13px] text-secondary">{description}</Dialog.Description>
          <div className="mt-4 flex justify-end gap-2">
            <Dialog.Close asChild>
              <Button variant="secondary" size="sm">Cancel</Button>
            </Dialog.Close>
            <Button variant="danger" size="sm" onClick={onConfirm}>{confirmLabel}</Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
