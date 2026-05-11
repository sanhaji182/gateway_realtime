"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function DetailDrawer({
  open,
  onOpenChange,
  title,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  metadata?: Record<string, React.ReactNode>;
  tabs?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/20" />
        <Dialog.Content className="fixed right-0 top-0 z-50 h-dvh w-full max-w-[480px] border-l bg-surface shadow-sm focus:outline-none">
          <div className="flex h-12 items-center justify-between border-b px-5">
            <Dialog.Title className="text-[14px] font-semibold text-primary">{title}</Dialog.Title>
            <Dialog.Close asChild>
              <Button variant="ghost" size="sm" className="h-7 w-7 px-0">
                <X className="h-4 w-4" />
              </Button>
            </Dialog.Close>
          </div>
          <div className="h-[calc(100dvh-48px)] overflow-y-auto px-5 py-4">
            {children}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
