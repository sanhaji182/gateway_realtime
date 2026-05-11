import { APIParam } from "@/components/docs/APIParam";
import { Callout } from "@/components/docs/Callout";
import { CodeBlock } from "@/components/docs/CodeBlock";
import { MultiCodeBlock } from "@/components/docs/MultiCodeBlock";

export const mdxComponents = {
  Callout,
  CodeBlock,
  MultiCodeBlock,
  APIParam,
  h1: (props: React.HTMLAttributes<HTMLHeadingElement>) => <h1 className="mb-4 mt-0 text-3xl font-semibold tracking-[-0.02em] text-primary" {...props} />,
  h2: (props: React.HTMLAttributes<HTMLHeadingElement>) => <h2 className="mb-3 mt-10 scroll-mt-24 text-xl font-semibold text-primary" {...props} />,
  h3: (props: React.HTMLAttributes<HTMLHeadingElement>) => <h3 className="mb-2 mt-6 scroll-mt-24 text-base font-semibold text-primary" {...props} />,
  p: (props: React.HTMLAttributes<HTMLParagraphElement>) => <p className="my-4 leading-7 text-secondary" {...props} />,
  ul: (props: React.HTMLAttributes<HTMLUListElement>) => <ul className="my-4 list-disc space-y-2 pl-5 text-secondary" {...props} />,
  ol: (props: React.HTMLAttributes<HTMLOListElement>) => <ol className="my-4 list-decimal space-y-2 pl-5 text-secondary" {...props} />,
  blockquote: (props: React.HTMLAttributes<HTMLQuoteElement>) => <blockquote className="my-5 border-l-2 pl-4 text-secondary" {...props} />,
  table: (props: React.TableHTMLAttributes<HTMLTableElement>) => <div className="my-5 overflow-x-auto rounded-md border"><table className="w-full text-sm" {...props} /></div>,
  th: (props: React.ThHTMLAttributes<HTMLTableCellElement>) => <th className="border-b bg-surface2 px-3 py-2 text-left font-medium text-primary" {...props} />,
  td: (props: React.TdHTMLAttributes<HTMLTableCellElement>) => <td className="border-b px-3 py-2 text-secondary" {...props} />,
  code: (props: React.HTMLAttributes<HTMLElement>) => <code className="rounded-[6px] bg-surface3 px-1.5 py-0.5 mono text-[13px] text-primary" {...props} />
};
