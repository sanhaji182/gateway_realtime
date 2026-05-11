"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export type TocItem = { id: string; title: string; level?: number };

export function TableOfContents({ items }: { items: TocItem[] }) {
  const [active, setActive] = useState(items[0]?.id);
  useEffect(() => { if (!items.length) return; const observer = new IntersectionObserver((entries) => { const visible = entries.find((entry) => entry.isIntersecting); if (visible?.target.id) setActive(visible.target.id); }, { rootMargin: "-96px 0px -70% 0px" }); items.forEach((item) => { const element = document.getElementById(item.id); if (element) observer.observe(element); }); return () => observer.disconnect(); }, [items]);
  if (!items.length) return null;
  return <aside className="sticky top-20 hidden h-[calc(100vh-96px)] w-[220px] shrink-0 overflow-y-auto px-4 xl:block"><div className="label mb-3">On this page</div><nav className="space-y-1">{items.map((item) => <a key={item.id} href={`#${item.id}`} className={cn("block rounded-sm py-1 text-sm", item.level === 3 ? "pl-4" : "", active === item.id ? "text-primary" : "text-muted hover:text-secondary")}>{item.title}</a>)}</nav></aside>;
}
