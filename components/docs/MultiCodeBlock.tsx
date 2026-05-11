"use client";

import { useState } from "react";
import { CodeCopyButton } from "@/components/docs/CodeCopyButton";
import { cn } from "@/lib/utils";

export type CodeTab = { label: string; language: string; code: string };

export function MultiCodeBlock({ tabs }: { tabs: CodeTab[] }) {
  const [active, setActive] = useState(0);
  const tab = tabs[active] ?? tabs[0];
  if (!tab) return null;
  return <div className="my-5 overflow-hidden rounded-md border bg-surface2"><div className="flex items-center justify-between border-b"><div className="flex">{tabs.map((item, index) => <button key={item.label} type="button" onClick={() => setActive(index)} className={cn("border-r px-3 py-2 text-xs", active === index ? "bg-surface3 text-primary" : "text-muted hover:text-secondary")}>{item.label}</button>)}</div><div className="px-2"><CodeCopyButton code={tab.code} /></div></div><pre className="overflow-x-auto p-4 text-[13px] leading-6 text-primary"><code className={`language-${tab.language}`}>{tab.code.trim()}</code></pre></div>;
}
