import { CodeCopyButton } from "@/components/docs/CodeCopyButton";

export function CodeBlock({ children, language, filename }: { children: string; language?: string; filename?: string }) {
  const code = String(children).trim();
  return <div className="my-5 overflow-hidden rounded-md border bg-surface2"><div className="flex items-center justify-between border-b px-3 py-2"><div className="mono text-xs text-muted">{filename ?? language ?? "code"}</div><CodeCopyButton code={code} /></div><pre className="overflow-x-auto p-4 text-[13px] leading-6 text-primary"><code className={language ? `language-${language}` : undefined}>{code}</code></pre></div>;
}
