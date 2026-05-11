// File ini mendefinisikan error inline untuk kegagalan fetch panel. Dipakai agar error data tidak memutus navigasi halaman.
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";

// InlineError menampilkan kegagalan fetch di dalam panel. onRetry opsional agar parent bisa memicu mutate tanpa redirect ke error boundary global.
export function InlineError({ message = "Failed to load data.", onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-md border border-error bg-error/10 py-8 text-secondary">
      <AlertCircle className="h-8 w-8 text-error" />
      <p className="text-sm text-error">{message}</p>
      {onRetry ? <Button variant="ghost" onClick={onRetry} className="h-8 text-accent">Retry</Button> : null}
    </div>
  );
}
