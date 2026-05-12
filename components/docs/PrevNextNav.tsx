import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import type { DocsPage } from "@/lib/docs/nav";

export function PrevNextNav({ prev, next }: { prev: DocsPage | null; next: DocsPage | null }) {
  if (!prev && !next) return null;
  
  return (
    <nav className="mt-12 pt-8 border-t border-border/20 grid grid-cols-1 gap-4 sm:grid-cols-2">
      {prev ? (
        <Link
          href={`/docs/${prev.slug}`}
          className="group rounded-xl border border-border/30 bg-surface p-4 transition-all duration-200 hover:border-accent/20 hover:shadow-sm hover:bg-accent/3"
        >
          <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted group-hover:text-accent transition-colors">
            <ArrowLeft className="h-3 w-3" /> Previous
          </div>
          <div className="mt-1.5 text-[14px] font-medium text-secondary group-hover:text-primary transition-colors">
            {prev.title}
          </div>
        </Link>
      ) : <span />}
      {next ? (
        <Link
          href={`/docs/${next.slug}`}
          className="group rounded-xl border border-border/30 bg-surface p-4 text-right transition-all duration-200 hover:border-accent/20 hover:shadow-sm hover:bg-accent/3"
        >
          <div className="flex items-center justify-end gap-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted group-hover:text-accent transition-colors">
            Next <ArrowRight className="h-3 w-3" />
          </div>
          <div className="mt-1.5 text-[14px] font-medium text-secondary group-hover:text-primary transition-colors">
            {next.title}
          </div>
        </Link>
      ) : null}
    </nav>
  );
}
