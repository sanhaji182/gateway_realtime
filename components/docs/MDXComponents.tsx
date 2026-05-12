import { APIParam } from "@/components/docs/APIParam";
import { Callout } from "@/components/docs/Callout";
import { CodeBlock } from "@/components/docs/CodeBlock";
import { MultiCodeBlock } from "@/components/docs/MultiCodeBlock";

export const mdxComponents = {
  Callout,
  CodeBlock,
  MultiCodeBlock,
  APIParam,
  h1: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h1 className="mb-8 text-[28px] font-bold tracking-[-0.03em] text-primary pb-6 border-b border-border/20" {...props} />
  ),
  h2: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h2 className="mb-4 mt-12 scroll-mt-24 text-xl font-bold tracking-[-0.02em] text-primary flex items-center gap-2" {...props}>
      <span className="w-1 h-6 rounded-full bg-gradient-to-b from-accent to-blue-400" />
      {props.children}
    </h2>
  ),
  h3: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h3 className="mb-2 mt-8 scroll-mt-24 text-[15px] font-semibold text-primary" {...props} />
  ),
  p: (props: React.HTMLAttributes<HTMLParagraphElement>) => (
    <p className="my-4 leading-7 text-secondary text-[14px]" {...props} />
  ),
  strong: (props: React.HTMLAttributes<HTMLElement>) => (
    <strong className="font-semibold text-primary" {...props} />
  ),
  a: (props: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a className="text-accent hover:underline underline-offset-2 font-medium" {...props} />
  ),
  ul: (props: React.HTMLAttributes<HTMLUListElement>) => (
    <ul className="my-5 space-y-2.5 text-[14px] text-secondary" {...props} />
  ),
  ol: (props: React.HTMLAttributes<HTMLOListElement>) => (
    <ol className="my-5 space-y-2.5 pl-5 text-[14px] text-secondary list-decimal" {...props} />
  ),
  li: (props: React.LiHTMLAttributes<HTMLLIElement>) => (
    <li className="leading-7 pl-1.5 marker:text-muted" {...props} />
  ),
  blockquote: (props: React.HTMLAttributes<HTMLQuoteElement>) => (
    <blockquote className="my-5 border-l-3 border-accent/30 pl-4 text-secondary italic text-[14px]" {...props} />
  ),
  table: (props: React.TableHTMLAttributes<HTMLTableElement>) => (
    <div className="my-6 overflow-hidden rounded-xl border border-border/30 shadow-xs">
      <table className="w-full text-[13px]" {...props} />
    </div>
  ),
  th: (props: React.ThHTMLAttributes<HTMLTableCellElement>) => (
    <th className="border-b border-border/20 bg-accent/5 px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.05em] text-muted" {...props} />
  ),
  td: (props: React.TdHTMLAttributes<HTMLTableCellElement>) => (
    <td className="border-b border-border/10 px-4 py-2.5 text-secondary" {...props} />
  ),
  tr: (props: React.HTMLAttributes<HTMLTableRowElement>) => (
    <tr className="transition-colors hover:bg-accent/3 last:border-none" {...props} />
  ),
  code: (props: React.HTMLAttributes<HTMLElement>) => (
    <code className="rounded-md bg-accent/5 px-1.5 py-0.5 text-[13px] font-medium text-accent font-mono" {...props} />
  ),
  pre: (props: React.HTMLAttributes<HTMLPreElement>) => (
    <pre className="my-5 overflow-x-auto rounded-xl border border-border/30 bg-accent/3 p-5 text-[13px] leading-7 text-secondary font-mono" {...props} />
  ),
};
