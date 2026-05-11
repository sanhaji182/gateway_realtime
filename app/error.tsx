"use client";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-3 bg-base px-4 text-center">
      <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-error">Error</span>
      <h1 className="text-[15px] font-semibold text-primary">Something went wrong</h1>
      <p className="max-w-[320px] text-[13px] text-muted">An unexpected error occurred. Please try again.</p>
      <button onClick={reset} className="mt-2 flex h-8 items-center rounded bg-accent px-3 text-[13px] font-medium text-inverse hover:bg-accent-hover">
        Try again
      </button>
    </div>
  );
}
