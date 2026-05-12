import Link from "next/link";
import { Zap, Shield, BarChart3, Globe, ArrowRight, Terminal, Radio, ArrowLeftRight, Sparkles, BookOpen } from "lucide-react";

const features = [
  { icon: Zap, title: "Realtime WebSocket", desc: "Low-latency pub/sub with Redis. Public, private, presence, and wildcard channels. Instant delivery." },
  { icon: Shield, title: "Secure by Default", desc: "Signed JWT sessions, CSRF protection, HMAC signatures — timing-safe comparison everywhere." },
  { icon: BarChart3, title: "Built-in Dashboard", desc: "Monitor connections, events, webhooks, and system health from a production-grade admin UI." },
  { icon: Globe, title: "Self-Hosted", desc: "Deploy on your own infrastructure — Docker Compose in 30 seconds. Full control, no vendor lock-in." },
];

const codeFeatures = [
  { icon: Terminal, title: "One-command setup", desc: "docker compose up -d and you're live on :3000." },
  { icon: ArrowLeftRight, title: "Any backend", desc: "PHP, Go, Node.js, cURL — publish events via REST API or Redis pub/sub." },
  { icon: Radio, title: "WebSocket SDK", desc: "<script> tag, npm import, or framework-agnostic TypeScript. Your choice." },
  { icon: BookOpen, title: "27-page docs", desc: "Tutorials, API reference, security model — everything documented." },
];

export default function LandingPage() {
  return (
    <div className="mx-auto max-w-7xl px-5">
      {/* Hero */}
      <section className="flex flex-col items-center py-24 text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border bg-surface px-4 py-1.5 text-[12px] text-secondary shadow-xs">
          <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" /><span className="relative inline-flex h-2 w-2 rounded-full bg-success" /></span>
          Open source · MIT licensed · Free forever
        </div>
        <h1 className="max-w-3xl text-4xl font-bold tracking-[-0.03em] md:text-5xl lg:text-6xl">
          Realtime events for
          <br />
          <span className="bg-gradient-to-r from-accent via-blue-500 to-teal bg-clip-text text-transparent">your internal apps</span>
        </h1>
        <p className="mt-5 max-w-xl text-[16px] leading-relaxed text-secondary">
          Self-hosted WebSocket pub/sub, presence channels, and webhooks.
          MIT licensed. Free. No signup, no credit card, no limits.
        </p>
        <div className="mt-8 flex gap-3">
          <Link href="/login" className="inline-flex items-center gap-2 rounded-lg bg-accent px-6 py-3 text-[14px] font-semibold text-white shadow-sm shadow-accent-glow transition-all hover:bg-accent-hover hover:shadow-md">
            Open Dashboard <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href="/docs" className="inline-flex items-center rounded-lg border bg-surface px-6 py-3 text-[14px] font-medium transition-all hover:bg-hover shadow-xs">
            Documentation
          </Link>
        </div>
        <div className="mt-12 w-full max-w-2xl rounded-xl border bg-surface p-4 shadow-sm">
          <div className="flex items-center gap-1.5 border-b pb-3 mb-3">
            <div className="h-2.5 w-2.5 rounded-full bg-error/30" />
            <div className="h-2.5 w-2.5 rounded-full bg-warning/30" />
            <div className="h-2.5 w-2.5 rounded-full bg-success/30" />
            <span className="ml-2 text-[11px] text-muted font-mono">terminal</span>
          </div>
          <code className="text-[12px] text-secondary font-mono leading-relaxed">
            $ <span className="text-accent">git clone</span> https://github.com/sanhaji182/gateway_realtime<br/>
            $ <span className="text-accent">cd</span> gateway_realtime<br/>
            $ <span className="text-accent">docker compose up -d</span><br/>
            <span className="text-muted"># Dashboard → http://localhost:3000</span><br/>
            <span className="text-muted"># WebSocket → ws://localhost:4000</span><br/>
            <span className="text-muted"># Login → admin@gateway.local / password</span>
          </code>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16">
        <div className="text-center mb-12">
          <h2 className="text-2xl font-bold tracking-[-0.02em]">Everything you need in one binary</h2>
          <p className="mt-2 text-[15px] text-secondary">No external services. No API keys. Just Docker.</p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <div key={f.title} className="card-hover group rounded-xl border bg-surface p-5 shadow-xs">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-accent/8">
                <f.icon className="h-5 w-5 text-accent transition-transform duration-200 group-hover:scale-110" />
              </div>
              <h3 className="text-[14px] font-semibold">{f.title}</h3>
              <p className="mt-1.5 text-[13px] text-secondary leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Code Features */}
      <section className="py-12">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {codeFeatures.map((f) => (
            <div key={f.title} className="flex gap-3">
              <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded bg-accent/8">
                <f.icon className="h-3.5 w-3.5 text-accent" />
              </div>
              <div>
                <h3 className="text-[13px] font-semibold">{f.title}</h3>
                <p className="mt-0.5 text-[12px] text-secondary">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 text-center">
        <div className="max-w-lg mx-auto rounded-2xl border bg-surface p-10 shadow-sm">
          <Sparkles className="mx-auto h-8 w-8 text-accent mb-4" />
          <h2 className="text-2xl font-bold tracking-[-0.02em]">Ready to go realtime?</h2>
          <p className="mt-3 text-[15px] text-secondary leading-relaxed">
            Clone the repo, run one command, and start publishing events. No registration. No API keys. Just code.
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <Link href="/docs/installation" className="inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-[14px] font-semibold text-white shadow-sm shadow-accent-glow transition-all hover:bg-accent-hover">
              Get Started <ArrowRight className="h-4 w-4" />
            </Link>
            <a href="https://github.com/sanhaji182/gateway_realtime" className="inline-flex items-center rounded-lg border bg-surface px-5 py-2.5 text-[14px] font-medium transition-all hover:bg-hover">GitHub</a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-10 text-center text-[12px] text-muted">
        <p>Built by <a href="https://www.linkedin.com/in/sansanhaji/" className="font-medium text-secondary hover:text-primary underline-offset-2 hover:underline">Sonick Sanhaji</a> · MIT Licensed · AI-assisted, human-architected.</p>
        <div className="mt-3 flex items-center justify-center gap-4">
          <a href="https://github.com/sanhaji182/gateway_realtime" className="hover:text-primary transition-colors">GitHub</a>
          <a href="/docs" className="hover:text-primary transition-colors">Docs</a>
          <a href="https://www.linkedin.com/in/sansanhaji/" className="hover:text-primary transition-colors">LinkedIn</a>
        </div>
      </footer>
    </div>
  );
}
