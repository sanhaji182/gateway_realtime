export type DocsPage = { title: string; slug: string };
export type DocsSection = { title: string; pages: DocsPage[] };

export const docsNav: DocsSection[] = [
  { title: "Getting Started", pages: [{ title: "Introduction", slug: "introduction" }, { title: "Quick Start", slug: "quick-start" }] },
  { title: "Core Concepts", pages: [{ title: "Authentication", slug: "authentication" }, { title: "Publishing Events", slug: "publishing-events" }, { title: "JavaScript SDK", slug: "javascript-sdk" }, { title: "Webhooks", slug: "webhooks" }] },
  { title: "Reference", pages: [{ title: "API Reference", slug: "api-reference" }] }
];

export const flatDocsPages = docsNav.flatMap((section) => section.pages);
export function normalizeDocsSlug(slug?: string[]) { return slug?.join("/") || "introduction"; }
export function getDocsPage(slug: string) { return flatDocsPages.find((page) => page.slug === slug) ?? null; }
export function getPrevNext(slug: string) { const index = flatDocsPages.findIndex((page) => page.slug === slug); return { prev: index > 0 ? flatDocsPages[index - 1] : null, next: index >= 0 && index < flatDocsPages.length - 1 ? flatDocsPages[index + 1] : null }; }
