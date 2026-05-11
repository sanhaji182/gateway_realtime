"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

export function CodeCopyButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  return <button type="button" className="focus-ring rounded-sm p-1 text-muted hover:text-primary" onClick={async () => { await navigator.clipboard.writeText(code); setCopied(true); window.setTimeout(() => setCopied(false), 2000); }} aria-label="Copy code">{copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}</button>;
}
