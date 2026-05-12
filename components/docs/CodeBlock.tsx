import { CodeCopyButton } from "@/components/docs/CodeCopyButton";

export function CodeBlock({ children, language, filename }: { children: string; language?: string; filename?: string }) {
  const code = String(children).trim();
  return (
    <div className="my-6 overflow-hidden rounded-xl border border-border/30 shadow-xs">
      <div className="flex items-center justify-between bg-accent/5 border-b border-border/20 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-accent/30" />
          <span className="text-[11px] font-medium text-muted uppercase tracking-[0.05em]">
            {language || filename || "code"}
          </span>
        </div>
        <CodeCopyButton code={code} />
      </div>
      <pre className="overflow-x-auto px-5 py-4 text-[13px] leading-7 text-secondary font-mono bg-surface">
        <code>{code}</code>
      </pre>
    </div>
  );
}
