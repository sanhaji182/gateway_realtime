import Link from "next/link";
import { Zap, Shield, BarChart3, Globe, ArrowRight, Check, Terminal, Radio, ArrowLeftRight, Sparkles } from "lucide-react";

const features = [
  { icon: Zap, title: "Realtime WebSocket", desc: "Low-latency pub/sub with Redis. Public, private, presence, and wildcard channels." },
  { icon: Shield, title: "Secure by Default", desc: "Signed JWT sessions, CSRF protection, HMAC signatures — timing-safe everywhere." },
  { icon: BarChart3, title: "Built-in Dashboard", desc: "Monitor connections, events, webhooks, and system health from a production-grade UI." },
  { icon: Globe, title: "Self-Hosted", desc: "Deploy on your own infrastructure. Docker Compose in 30 seconds. No vendor lock-in." },
];

const codeFeatures = [
  { icon: Terminal, title: "One-command setup", desc: "docker compose up -d and you're live." },
  { icon: ArrowLeftRight, title: "Any backend", desc: "PHP, Go, Node.js, cURL — publish via REST or Redis." },
  { icon: Radio, title: "WebSocket SDK", desc: "<script> tag, npm import, or framework-agnostic TypeScript." },
  { icon: Sparkles, title: "Open Core", desc: "MIT licensed. Extensible via pluggable auth, rate limiter, and event hooks." },
];

const plans = [
  { name: "Free", price: "$0", desc: "For side projects", events: "100/min", conn: "5", features: ["1 tenant", "WebSocket gateway", "Dashboard", "Community support"] },
  { name: "Pro", price: "$29/mo", desc: "For growing apps", events: "10k/min", conn: "1,000", features: ["Unlimited tenants", "Priority support", "Usage analytics", "Stripe billing"] },
  { name: "Enterprise", price: "Custom", desc: "For scale", events: "100k/min", conn: "10k", features: ["Everything in Pro", "Dedicated support", "Custom SLA", "On-prem / SSO"] },
];

export default function LandingPage() {
  return (
    <div className="mx-auto max-w-7xl px-5">
      {/* Hero */}
      <section className="flex flex-col items-center py-24 text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border bg-surface px-4 py-1.5 text-[12px] text-secondary shadow-xs">
          <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" /><span className="relative inline-flex h-2 w-2 rounded-full bg-success" /></span>
          Open source · MIT licensed
        </div>
        <h1 className="max-w-3xl text-4xl font-bold tracking-[-0.03em] md:text-5xl lg:text-6xl">
          Realtime events for
          <br />
          <span className="bg-gradient-to-r from-accent via-indigo-500 to-teal bg-clip-text text-transparent">your next big idea</span>
        </h1>
        <p className="mt-5 max-w-xl text-[16px] leading-relaxed text-secondary">
          Add WebSocket pub/sub, presence channels, and webhooks to your app in minutes.
          Free tier, no credit card.
        </p>
        <div className="mt-8 flex gap-3">
          <Link href="/signup" className="inline-flex items-center gap-2 rounded-lg bg-accent px-6 py-3 text-[14px] font-semibold text-white shadow-sm shadow-accent-glow transition-all hover:bg-accent-hover hover:shadow-md">
            Get Started Free <ArrowRight className="h-4 w-4" />
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
            <span className="text-muted"># WebSocket → ws://localhost:4000</span>
          </code>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16">
        <div className="text-center mb-12">
          <h2 className="text-2xl font-bold tracking-[-0.02em]">Everything you need</h2>
          <p className="mt-2 text-[15px] text-secondary">Production-ready realtime infrastructure.</p>
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

      {/* Pricing */}
      <section className="py-16" id="pricing">
        <div className="text-center mb-12">
          <h2 className="text-2xl font-bold tracking-[-0.02em]">Simple, fair pricing</h2>
          <p className="mt-2 text-[15px] text-secondary">Start free, scale when you're ready.</p>
        </div>
        <div className="grid gap-6 md:grid-cols-3 max-w-4xl mx-auto">
          {plans.map((p, idx) => (
            <div key={p.name} className={cn(
              "relative rounded-xl border bg-surface p-6 shadow-xs transition-all duration-200 hover:shadow",
              idx === 1 ? "border-accent/30 ring-1 ring-accent/20 shadow-accent-glow" : ""
            )}>
              {idx === 1 && <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-accent px-3 py-0.5 text-[10px] font-semibold text-white shadow-sm">Popular</span>}
              <h3 className="text-[16px] font-semibold">{p.name}</h3>
              <div className="mt-3"><span className="text-3xl font-bold tracking-[-0.03em]">{p.price}</span></div>
              <p className="mt-1 text-[12px] text-muted">{p.desc}</p>
              <div className="mt-5 space-y-1.5 border-t pt-4 text-[13px]">
                <p><strong className="text-primary">{p.events}</strong> <span className="text-muted">events/min</span></p>
                <p><strong className="text-primary">{p.conn}</strong> <span className="text-muted">connections</span></p>
              </div>
              <ul className="mt-4 space-y-2.5">
                {p.features.map((f) => (
                  <li key={f} className="flex items-center gap-2.5 text-[12px] text-secondary">
                    <Check className="h-3.5 w-3.5 text-success shrink-0" />{f}
                  </li>
                ))}
              </ul>
              <Link href="/signup" className="mt-6 flex items-center justify-center rounded-lg border bg-surface py-2.5 text-[13px] font-semibold text-primary transition-all hover:bg-accent hover:text-white hover:border-accent shadow-xs">
                Get Started
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-10 text-center text-[12px] text-muted">
        <p>Built by <a href="https://www.linkedin.com/in/sansanhaji/" className="font-medium text-secondary hover:text-primary underline-offset-2 hover:underline">Sonick Sanhaji</a> · AI-assisted, human-architected.</p>
        <div className="mt-3 flex items-center justify-center gap-4">
          <a href="https://github.com/sanhaji182/gateway_realtime" className="hover:text-primary transition-colors">GitHub</a>
          <a href="/docs" className="hover:text-primary transition-colors">Docs</a>
          <a href="https://www.linkedin.com/in/sansanhaji/" className="hover:text-primary transition-colors">LinkedIn</a>
        </div>
      </footer>
    </div>
  );
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}
