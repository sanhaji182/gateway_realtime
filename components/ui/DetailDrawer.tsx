// File ini mendefinisikan drawer detail dari kanan layar. Dipakai untuk menampilkan metadata teknis tanpa meninggalkan halaman tabel.
"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Check, Copy, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

// DetailDrawer merender panel kanan untuk detail item tabel. open/onOpenChange dikontrol parent agar Escape, overlay, dan tombol close sinkron.
export function DetailDrawer({ open, onOpenChange, title, metadata, tabs, children }: { open: boolean; onOpenChange: (open: boolean) => void; title: string; metadata?: Record<string, React.ReactNode>; tabs?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
        <Dialog.Content className="fixed right-0 top-0 z-50 h-dvh w-full max-w-[520px] border-l bg-surface1 shadow-none focus:outline-none sm:min-w-[440px]">
          <div className="flex h-16 items-center justify-between border-b px-5">
            <Dialog.Title className="text-base font-semibold text-primary">{title}</Dialog.Title>
            <Dialog.Close asChild>
              <Button variant="ghost" className="h-8 w-8 px-0" aria-label="Close drawer">
                <X className="h-4 w-4" />
              </Button>
            </Dialog.Close>
          </div>
          <div className="h-[calc(100dvh-64px)] overflow-y-auto p-5">
            {metadata ? <MetadataList metadata={metadata} /> : null}
            {tabs ? <div className="mt-5">{tabs}</div> : null}
            {children ? <div className="mt-5">{children}</div> : null}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// MetadataList menampilkan key/value teknis dan otomatis memberi tombol copy untuk value string. Label teknis diberi font mono agar mudah discan.
function MetadataList({ metadata }: { metadata: Record<string, React.ReactNode> }) {
  return (
    <dl className="divide-y rounded-md border bg-surface2">
      {Object.entries(metadata).map(([label, value]) => (
        <div key={label} className="grid grid-cols-[120px_1fr_auto] items-center gap-3 px-3 py-2">
          <dt className="label normal-case tracking-normal">{label}</dt>
          <dd className={cn("truncate text-sm text-secondary", isTechnical(label) && "mono text-xs text-primary")}>{value}</dd>
          {typeof value === "string" ? <CopyButton value={value} /> : <span />}
        </div>
      ))}
    </dl>
  );
}

// CopyButton menulis value ke clipboard dan menampilkan state copied sementara. Timeout 1200ms cukup singkat agar tidak mengganggu operator.
function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      className="focus-ring rounded-sm p-1 text-muted hover:text-primary"
      aria-label="Copy value"
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1200);
      }}
    >
      {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
    </button>
  );
}

// isTechnical mendeteksi label teknis agar ID, IP, secret, token, dan key tampil monospace.
function isTechnical(label: string) {
  return /id|ip|hash|secret|token|key/i.test(label);
}
