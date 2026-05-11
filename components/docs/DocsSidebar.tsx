"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { docsNav, flatDocsPages } from "@/lib/docs/nav";
import { cn } from "@/lib/utils";

export function DocsSidebar() {
  const pathname = usePathname();
  const activeSlug = pathname.replace(/^\/docs\/?/, "") || "introduction";
  const [query, setQuery] = useState("");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const results = useMemo(() => query.trim() ? flatDocsPages.filter((page) => page.title.toLowerCase().includes(query.toLowerCase()) || page.slug.includes(query.toLowerCase())) : null, [query]);

  return <aside className="fixed inset-y-0 left-0 z-30 hidden w-[260px] flex-col border-r bg-surface1 lg:flex"><div className="border-b px-5 py-4"><Link href="/docs" className="block text-sm font-semibold text-primary">Event Gateway <span className="text-muted">Docs</span></Link><label className="relative mt-4 block"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search docs" className="focus-ring h-9 w-full rounded-sm border bg-surface2 pl-9 pr-14 text-sm text-primary placeholder:text-muted" /><span className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-muted">⌘K</span></label></div><nav className="flex-1 overflow-y-auto px-3 py-4">{results ? <SearchResults activeSlug={activeSlug} results={results} /> : docsNav.map((section) => { const isCollapsed = collapsed[section.title] === true; return <div key={section.title} className="mb-4"><button type="button" onClick={() => setCollapsed((current) => ({ ...current, [section.title]: !isCollapsed }))} className="label mb-2 w-full px-2 text-left">{section.title}</button>{!isCollapsed ? <div className="space-y-1">{section.pages.map((page) => <DocsLink key={page.slug} page={page} active={activeSlug === page.slug} />)}</div> : null}</div>; })}</nav></aside>;
}

function SearchResults({ results, activeSlug }: { results: typeof flatDocsPages; activeSlug: string }) { return <div className="space-y-1">{results.map((page) => <DocsLink key={page.slug} page={page} active={activeSlug === page.slug} />)}</div>; }
function DocsLink({ page, active }: { page: { title: string; slug: string }; active: boolean }) { return <Link href={`/docs/${page.slug}`} className={cn("block rounded-sm px-2 py-1.5 text-sm", active ? "bg-surface3 text-primary" : "text-muted hover:bg-surface2 hover:text-secondary")}>{page.title}</Link>; }
