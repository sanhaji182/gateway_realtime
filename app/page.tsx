"use client";
import Link from "next/link";
import { ArrowRight, BarChart3, Bell, Boxes, Check, GitBranch, Radio, Shield, Zap } from "lucide-react";

const features = [
  { icon: Zap, title: "Realtime Pub/Sub", desc: "Publish from your backend, received instantly on WebSocket — sub-millisecond fan-out via Redis." },
  { icon: Shield, title: "HMAC-Signed Auth", desc: "Every publish request is HMAC-SHA256 signed. Private & presence channels, encrypted AES-256-GCM." },
  { icon: Bell, title: "Channels & Presence", desc: "Public, private, presence, wildcard, encrypted — complete channel type support like Pusher." },
  { icon: BarChart3, title: "Dashboard Built-in", desc: "Monitor connections, events, webhooks, and system health from a production-grade dashboard." },
  { icon: Boxes, title: "Webhooks & Retry", desc: "Delivery logs, retry history, HTTP status tracking — debug delivery failures instantly." },
  { icon: Radio, title: "Self-Hosted", desc: "Runs on your infrastructure. No vendor lock-in, no data leaving your network." },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-base">
      {/* Nav */}
      <nav className="sticky top-0 z-30 border-b bg-surface/80 backdrop-blur-sm">
        <div className="mx-auto flex h-12 max-w-5xl items-center justify-between px-4">
          <div className="flex items-center gap-2.5">
            <Zap className="h-4 w-4 text-accent" />
            <span className="text-[14px] font-semibold text-primary">Gateway</span>
            <span className="rounded bg-accent-subtle px-1.5 py-0.5 text-[10px] font-medium text-accent">v0.1</span>
          </div>
          <div className="flex items-center gap-3">
            <a href="https://github.com/sanhaji182/gateway_realtime" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-[13px] text-muted hover:text-secondary">
              <GitBranch className="h-4 w-4" />
              GitHub
            </a>
            <Link href="/docs" className="text-[13px] text-muted hover:text-secondary">Docs</Link>
            <Link href="/login" className="flex h-8 items-center rounded bg-accent px-3 text-[13px] font-medium text-inverse hover:bg-accent-hover">
              Sign In <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto max-w-3xl px-4 py-20 text-center">
        <div className="inline-flex items-center gap-1.5 rounded-full border bg-surface px-3 py-1 text-[12px] text-muted mb-6 shadow-sm">
          <span className="relative flex h-1.5 w-1.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" /><span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-success" /></span>
          Open Source — MIT License
        </div>
        <h1 className="text-[28px] font-bold tracking-[-0.02em] text-primary leading-tight">
          Self-hosted realtime<br />event infrastructure
        </h1>
        <p className="mt-4 text-[15px] text-secondary max-w-xl mx-auto leading-relaxed">
          Publish events from any backend, received instantly in the browser. Public, private, and presence channels — with a production dashboard built in.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link href="/login" className="flex h-9 items-center rounded bg-accent px-4 text-[13px] font-medium text-inverse hover:bg-accent-hover shadow-sm">
            Get Started <ArrowRight className="ml-1.5 h-4 w-4" />
          </Link>
          <a href="https://github.com/sanhaji182/gateway_realtime" target="_blank" rel="noopener noreferrer" className="flex h-9 items-center gap-1.5 rounded border bg-surface px-4 text-[13px] text-secondary hover:bg-hover shadow-sm">
            <GitBranch className="h-4 w-4" />View on GitHub
          </a>
        </div>
        <p className="mt-5 text-[12px] text-muted">
          <code className="text-primary">docker compose up</code> — running in 2 minutes.
        </p>
      </section>

      {/* Features grid */}
      <section className="mx-auto max-w-4xl px-4 pb-20">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="rounded border bg-surface p-4 shadow-sm">
              <Icon className="h-4 w-4 text-accent mb-2.5" />
              <h3 className="text-[13px] font-semibold text-primary">{title}</h3>
              <p className="mt-1.5 text-[12px] text-secondary leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* One command CTA */}
      <section className="mx-auto max-w-2xl px-4 pb-20 text-center">
        <div className="rounded border bg-surface p-6 shadow-sm">
          <h2 className="text-[15px] font-semibold text-primary">One command to start</h2>
          <div className="mt-3 inline-flex items-center gap-2 rounded border bg-subtle px-4 py-2.5 mono text-[13px] text-primary">
            <code className="text-accent">docker compose up</code>
            <button
              onClick={() => navigator.clipboard.writeText("docker compose up")}
              className="text-muted hover:text-primary"
            >
              <Check className="h-3.5 w-3.5" />
            </button>
          </div>
          <p className="mt-3 text-[12px] text-muted">
            Or <code className="text-primary">npm run dev</code> + <code className="text-primary">go run backend_go/main.go</code>
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 text-center">
        <p className="text-[12px] text-muted">
          MIT Licensed · Built with Go + Next.js + Redis
        </p>
      </footer>
    </div>
  );
}
