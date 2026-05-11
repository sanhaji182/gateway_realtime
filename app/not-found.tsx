import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4 bg-canvas px-4 text-center">
      <span className="mono text-7xl font-bold text-muted">404</span>
      <h1 className="text-xl font-semibold text-primary">Page not found</h1>
      <p className="max-w-sm text-sm text-secondary">The page you&rsquo;re looking for doesn&rsquo;t exist or has been moved.</p>
      <Link href="/overview" className="focus-ring inline-flex h-9 items-center justify-center rounded-sm border border-accent bg-accent px-3 text-sm font-medium text-white hover:opacity-90 dark:text-[#06111d]">Back to Overview</Link>
    </div>
  );
}
