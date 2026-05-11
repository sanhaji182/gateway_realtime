import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-3 bg-base px-4 text-center">
      <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">404</span>
      <h1 className="text-[15px] font-semibold text-primary">Page not found</h1>
      <p className="max-w-[320px] text-[13px] text-muted">The page you&rsquo;re looking for doesn&rsquo;t exist or has been moved.</p>
      <Link href="/overview" className="mt-2 flex h-8 items-center rounded bg-accent px-3 text-[13px] font-medium text-inverse hover:bg-accent-hover">Back to Overview</Link>
    </div>
  );
}
