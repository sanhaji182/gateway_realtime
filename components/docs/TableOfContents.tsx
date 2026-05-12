"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export type TocItem = { id: string; title: string; level?: number };

export function TableOfContents({ items }: { items: TocItem[] }) {
  const [active, setActive] = useState(items[0]?.id || "");

  useEffect(() => {
    if (!items.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.find((e) => e.isIntersecting);
        if (visible?.target.id) setActive(visible.target.id);
      },
      { rootMargin: "-96px 0px -70% 0px" }
    );
    items.forEach((item) => {
      const el = document.getElementById(item.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [items]);

  if (!items.length) return null;

  return (
    <aside className="sticky top-20 hidden h-[calc(100vh-96px)] w-[200px] shrink-0 xl:block">
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted mb-3 px-0.5">
        On this page
      </p>
      <nav className="space-y-0.5">
        {items.map((item) => (
          <a
            key={item.id}
            href={`#${item.id}`}
            className={cn(
              "block rounded-lg py-1.5 text-[12px] font-medium transition-all duration-150 relative",
              item.level === 3 ? "pl-4" : "",
              active === item.id
                ? "text-accent bg-accent/5"
                : "text-muted hover:text-secondary hover:bg-hover"
            )}
          >
            {active === item.id && (
              <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-full bg-gradient-to-b from-accent to-blue-400" />
            )}
            <span className={item.level === 3 ? "pl-0" : ""}>{item.title}</span>
          </a>
        ))}
      </nav>
    </aside>
  );
}
