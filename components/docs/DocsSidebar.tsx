"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, ChevronDown, Search, Zap } from "lucide-react";
import { useMemo, useState } from "react";
import { docsNav, flatDocsPages } from "@/lib/docs/nav";
import { cn } from "@/lib/utils";

export function DocsSidebar() {
  const pathname = usePathname();
  const activeSlug = pathname.replace(/^\/docs\/?/, "") || "introduction";
  const [query, setQuery] = useState("");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const results = useMemo(
    () => query.trim().length > 0
      ? flatDocsPages.filter(p => p.title.toLowerCase().includes(query.toLowerCase()) || p.slug.includes(query.toLowerCase()))
      : null,
    [query]
  );

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[272px] flex-col border-r border-border/30 bg-surface/60 backdrop-blur-xl lg:flex">
      {/* Header */}
      <div className="border-b border-border/20 px-5 py-5">
        <Link href="/docs" className="flex items-center gap-2.5 group">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-blue-400 shadow-sm shadow-accent/20 transition-transform group-hover:scale-105">
            <BookOpen className="h-4 w-4 text-white" />
          </div>
          <div>
            <span className="text-[15px] font-semibold tracking-[-0.02em] text-primary">Gateway</span>
            <span className="text-[15px] font-medium text-muted"> Docs</span>
          </div>
        </Link>

        {/* Search */}
        <div className="relative mt-4">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search documentation..."
            className="w-full h-9 rounded-lg border border-border/50 bg-surface px-3 pl-9 pr-3 text-[13px] text-primary placeholder:text-muted outline-none transition-all focus:border-accent/40 focus:ring-2 focus:ring-accent/10"
          />
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-4 py-3">
        {results ? (
          <div className="space-y-0.5">
            <p className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">
              {results.length} result{results.length !== 1 ? 's' : ''}
            </p>
            {results.map((page) => (
              <Link
                key={page.slug}
                href={`/docs/${page.slug}`}
                className={cn(
                  "block rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-150",
                  activeSlug === page.slug
                    ? "bg-accent/8 text-accent"
                    : "text-secondary hover:bg-hover hover:text-primary"
                )}
              >
                {page.title}
              </Link>
            ))}
          </div>
        ) : (
          docsNav.map((section) => {
            const isCollapsed = collapsed[section.title] === true;
            return (
              <div key={section.title} className="mb-5">
                <button
                  type="button"
                  onClick={() => setCollapsed((c) => ({ ...c, [section.title]: !isCollapsed }))}
                  className="flex w-full items-center justify-between px-2 py-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted hover:text-secondary transition-colors"
                >
                  {section.title}
                  <ChevronDown className={cn("h-3 w-3 transition-transform duration-200", isCollapsed && "-rotate-90")} />
                </button>
                {!isCollapsed && (
                  <div className="mt-1 space-y-0.5">
                    {section.pages.map((page) => (
                      <Link
                        key={page.slug}
                        href={`/docs/${page.slug}`}
                        className={cn(
                          "block rounded-lg px-3 py-1.5 text-[13px] font-medium transition-all duration-150",
                          activeSlug === page.slug
                            ? "bg-accent/8 text-accent"
                            : "text-secondary hover:bg-hover hover:text-primary"
                        )}
                      >
                        {page.title}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </nav>

      {/* Footer */}
      <div className="border-t border-border/20 px-5 py-3.5">
        <Link
          href="/"
          className="flex items-center gap-2 text-[11px] text-muted hover:text-secondary transition-colors"
        >
          <Zap className="h-3 w-3" />
          Back to Dashboard
        </Link>
      </div>
    </aside>
  );
}
