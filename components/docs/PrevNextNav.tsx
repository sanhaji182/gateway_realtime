import Link from "next/link";
import type { DocsPage } from "@/lib/docs/nav";

export function PrevNextNav({ prev, next }: { prev: DocsPage | null; next: DocsPage | null }) {
  return <nav className="mt-12 grid grid-cols-1 gap-3 border-t pt-6 sm:grid-cols-2">{prev ? <Link href={`/docs/${prev.slug}`} className="rounded-md border bg-surface2 p-3 text-sm hover:bg-surface3"><div className="text-muted">Previous</div><div className="mt-1 text-primary">{prev.title}</div></Link> : <span />}{next ? <Link href={`/docs/${next.slug}`} className="rounded-md border bg-surface2 p-3 text-right text-sm hover:bg-surface3"><div className="text-muted">Next</div><div className="mt-1 text-primary">{next.title}</div></Link> : null}</nav>;
}
