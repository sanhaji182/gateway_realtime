import Link from "next/link";
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
    <div className="min-h-screen bg-canvas">
      <DocsSidebar />
      <div className="lg:pl-[260px]">
        <div className="mx-auto flex max-w-[1200px] gap-8 px-4 py-8 sm:px-8">
          <main className="mx-auto min-w-0 max-w-[720px] flex-1">
            <div className="mb-6 text-sm text-muted"><Link href="/docs" className="hover:text-primary">Docs</Link><span className="mx-2">/</span><span>{page.title}</span></div>
            <article className="docs-content rounded-md border bg-surface1 p-6 sm:p-8">
              <h1>{page.title}</h1>
              {content.render()}
              <PrevNextNav prev={prev} next={next} />
            </article>
          </main>
          <TableOfContents items={content.toc} />
        </div>
      </div>
    </div>
  );
}
