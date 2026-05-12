export type DocsPage = { title: string; slug: string };
export type DocsSection = { title: string; pages: DocsPage[] };

export const docsNav: DocsSection[] = [
  {
    title: "Tutorials",
    pages: [
      { title: "PHP Integration Guide", slug: "tutorial-php" },
      { title: "JavaScript Integration Guide", slug: "tutorial-js" },
    ],
  },
  {
    title: "Getting Started",
    pages: [
      { title: "Introduction", slug: "introduction" },
      { title: "Quick Start", slug: "quick-start" },
      { title: "Installation", slug: "installation" },
    ],
  },
  {
    title: "Core Concepts",
    pages: [
      { title: "Authentication", slug: "authentication" },
      { title: "Channels", slug: "channels" },
      { title: "Publishing Events", slug: "publishing-events" },
      { title: "Subscribing to Events", slug: "subscribing-events" },
      { title: "Presence Channels", slug: "presence" },
      { title: "Webhooks", slug: "webhooks" },
    ],
  },
  {
    title: "SDK Reference",
    pages: [
      { title: "JavaScript SDK", slug: "javascript-sdk" },
      { title: "PHP SDK", slug: "php-sdk" },
      { title: "Browser GatewayClient", slug: "browser-sdk" },
    ],
  },
  {
    title: "API Reference",
    pages: [
      { title: "Overview", slug: "api-reference" },
      { title: "Apps API", slug: "api-apps" },
      { title: "Events API", slug: "api-events" },
      { title: "Connections API", slug: "api-connections" },
      { title: "Webhooks API", slug: "api-webhooks" },
    ],
  },
  {
    title: "Advanced",
    pages: [
      { title: "Security Model", slug: "security" },
      { title: "SaaS Extensions", slug: "saas-extensions" },
      { title: "Changelog", slug: "changelog" },
    ],
  },
  {
    title: "Operations",
    pages: [
      { title: "Environment Variables", slug: "env-vars" },
      { title: "Deployment", slug: "deployment" },
      { title: "Scaling", slug: "scaling" },
      { title: "Troubleshooting", slug: "troubleshooting" },
    ],
  },
];

export const flatDocsPages = docsNav.flatMap((section) => section.pages);
export function normalizeDocsSlug(slug?: string[]) { return slug?.join("/") || "introduction"; }
export function getDocsPage(slug: string) { return flatDocsPages.find((page) => page.slug === slug) ?? null; }
export function getPrevNext(slug: string) {
  const index = flatDocsPages.findIndex((page) => page.slug === slug);
  return { prev: index > 0 ? flatDocsPages[index - 1] : null, next: index >= 0 && index < flatDocsPages.length - 1 ? flatDocsPages[index + 1] : null };
}
