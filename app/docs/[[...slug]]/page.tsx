import Link from "next/link";
import { Home, ChevronRight } from "lucide-react";
import { notFound } from "next/navigation";
import { DocsSidebar } from "@/components/docs/DocsSidebar";
import { PrevNextNav } from "@/components/docs/PrevNextNav";
import { TableOfContents } from "@/components/docs/TableOfContents";
import { docsContent } from "@/lib/docs/content";
import { getDocsPage, getPrevNext, normalizeDocsSlug } from "@/lib/docs/nav";

export default async function DocsPage({ params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug } = await params;
  const normalizedSlug = normalizeDocsSlug(slug);
  const page = getDocsPage(normalizedSlug);
  const content = docsContent[normalizedSlug];
  if (!page || !content) notFound();
  const { prev, next } = getPrevNext(normalizedSlug);

  return (
    <div className="min-h-screen bg-base">
      <DocsSidebar />
      <div className="lg:pl-[272px]">
        <div className="mx-auto flex max-w-[1240px] gap-8 px-5 py-8 sm:px-8 lg:px-10">
          <main className="flex-1 min-w-0 max-w-[760px] mx-auto">
            {/* Breadcrumb */}
            <div className="flex items-center gap-1.5 mb-8 text-[12px] text-muted">
              <Link href="/" className="flex items-center gap-1 hover:text-secondary transition-colors">
                <Home className="h-3 w-3" /> Dashboard
              </Link>
              <ChevronRight className="h-3 w-3" />
              <Link href="/docs" className="hover:text-secondary transition-colors">Docs</Link>
              <ChevronRight className="h-3 w-3" />
              <span className="text-primary font-medium">{page.title}</span>
            </div>

            {/* Content card */}
            <article className="rounded-xl border border-border/30 bg-surface p-8 shadow-xs">
              <h1 className="text-[28px] font-bold tracking-[-0.03em] text-primary mb-8 pb-6 border-b border-border/20">
                {page.title}
              </h1>
              <div className="prose-custom">
                {content.render()}
              </div>
              <PrevNextNav prev={prev} next={next} />
            </article>
          </main>

          {/* Right Table of Contents */}
          <TableOfContents items={content.toc} />
        </div>
      </div>
    </div>
  );
}
