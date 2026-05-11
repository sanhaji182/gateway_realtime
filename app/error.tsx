"use client";

import { Button } from "@/components/ui/Button";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4 bg-canvas px-4 text-center">
      <span className="mono text-5xl font-bold text-error">Error</span>
      <h1 className="text-xl font-semibold text-primary">Something went wrong</h1>
      <p className="max-w-sm text-sm text-secondary">{error.message}</p>
      <Button variant="default" onClick={reset}>Try Again</Button>
    </div>
  );
}
