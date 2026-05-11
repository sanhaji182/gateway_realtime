"use client";

import { Ban, Bell, Package, Send, ShoppingCart, Store, TrendingUp, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { KPICard } from "@/components/ui/KPICard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { toast } from "@/components/ui/Toast";

type OrderNotification = {
  id: string;
  order_id: number;
  buyer: string;
  amount: number;
  currency: string;
  status: string;
  channel: string;
  marketplace: string;
  ts: string;
};

const MARKETPLACES = ["Shopee", "Tokopedia", "Lazada", "Bukalapak"];
const BUYERS = ["Budi S", "Siti R", "Ahmad F", "Dewi K", "Rudi H", "Lina M", "Agus P", "Rina W"];
const STATUSES = ["paid", "shipped", "delivered", "cancelled"];

export default function OrdersPage() {
  const [connected, setConnected] = useState(false);
  const [notifications, setNotifications] = useState<OrderNotification[]>([]);
  const [stats, setStats] = useState({ total: 0, amount: 0, cancelled: 0 });
  const [isSimulating, setIsSimulating] = useState(false);
  const [interval, setSimInterval] = useState(3);
  const [selectedMarketplace, setSelectedMarketplace] = useState("all");
  const wsRef = useRef<WebSocket | null>(null);
  const simRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const orderCounter = useRef(1000);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Connect to WebSocket gateway
  const connect = useCallback(async () => {
    if (wsRef.current) wsRef.current.close();
    try {
      const res = await fetch("/api/socket/token");
      const { token } = await res.json() as { token: string };
      const ws = new WebSocket(`ws://localhost:4000/ws?token=${token}`);

      ws.onopen = () => {
        setConnected(true);
        ws.send(JSON.stringify({ type: "subscribe", channel: "orders.*" }));
        ws.send(JSON.stringify({ type: "subscribe", channel: "orders.99" }));
        toast.success("Connected to order stream");
      };

      ws.onmessage = (e) => {
        try {
          const m = JSON.parse(e.data);
          if (m.type === "event" && m.channel?.startsWith("orders.")) {
            const data = m.data as Record<string, unknown>;
            if (data.order_id) {
              const notif: OrderNotification = {
                id: crypto.randomUUID(),
                order_id: data.order_id as number,
                buyer: data.buyer as string || "Unknown",
                amount: data.amount as number || 0,
                currency: data.currency as string || "IDR",
                status: m.event || "order.new",
                channel: m.channel,
                marketplace: data.marketplace as string || "Unknown",
                ts: new Date().toLocaleTimeString(),
              };

              setNotifications((prev) => [notif, ...prev].slice(0, 50));
              setStats((prev) => ({
                total: prev.total + 1,
                amount: prev.amount + (data.amount as number || 0),
                cancelled: prev.cancelled + (m.event === "order.cancelled" ? 1 : 0),
              }));
            }
          }
        } catch {}
      };

      ws.onclose = () => { setConnected(false); wsRef.current = null; };
      ws.onerror = () => { setConnected(false); };

      wsRef.current = ws;
    } catch {
      toast.error("Failed to connect");
    }
  }, []);

  const disconnect = useCallback(() => {
    wsRef.current?.close();
    wsRef.current = null;
    setConnected(false);
  }, []);

  // Order simulator — publishes random orders via REST API
  const toggleSimulator = useCallback(() => {
    if (isSimulating) {
      if (simRef.current) clearInterval(simRef.current);
      simRef.current = null;
      setIsSimulating(false);
      toast.info("Simulator stopped");
      return;
    }

    setIsSimulating(true);
    toast.info(`Simulator started — every ${interval}s`);

    const simulate = async () => {
      const id = ++orderCounter.current;
      const buyer = BUYERS[Math.floor(Math.random() * BUYERS.length)];
      const amount = Math.floor(Math.random() * 950000 + 50000);
      const marketplace = MARKETPLACES[Math.floor(Math.random() * MARKETPLACES.length)];
      const event = STATUSES[Math.floor(Math.random() * STATUSES.length)];

      const body = JSON.stringify({
        channel: "orders.99",
        event: `order.${event}`,
        data: { order_id: id, buyer, amount, currency: "IDR", marketplace },
      });

      // Sign with dev HMAC
      const appKey = "pk_dev_playground";
      const secret = "sk_dev_playground_secret";
      const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
      const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
      const signature = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");

      try {
        await fetch("/api/v1/events", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-App-Key": appKey, "X-Signature": signature },
          body,
        });
      } catch {}
    };

    simulate(); // First one immediately
    simRef.current = setInterval(simulate, interval * 1000);
  }, [isSimulating, interval]);

  useEffect(() => {
    return () => { if (simRef.current) clearInterval(simRef.current); wsRef.current?.close(); };
  }, []);

  const filtered = selectedMarketplace === "all"
    ? notifications
    : notifications.filter((n) => n.marketplace === selectedMarketplace);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="page-title">Order Notifications</h1>
          <p className="mt-0.5 text-[12px] text-muted">Real-time order monitoring across all marketplaces.</p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge variant={connected ? "success" : "error"} className="gap-1 px-2">
            {connected ? "Live" : "Offline"}
          </StatusBadge>
          {!connected ? (
            <Button variant="primary" size="sm" onClick={connect}><Bell className="mr-1 h-3.5 w-3.5" />Connect</Button>
          ) : (
            <Button variant="danger" size="sm" onClick={disconnect}>Disconnect</Button>
          )}
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <KPICard label="Orders Today" value={stats.total} color="primary" icon={ShoppingCart} />
        <KPICard label="Total Revenue" value={`Rp ${stats.amount.toLocaleString("id-ID")}`} color="success" icon={TrendingUp} />
        <KPICard label="Cancelled" value={stats.cancelled} color="error" icon={Ban} />
      </div>

      {/* Simulator Controls */}
      <div className="rounded border bg-surface p-4 shadow-sm">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="text-[11px] font-medium uppercase tracking-[0.03em] text-muted mb-1 block">Simulator</label>
            <Button
              variant={isSimulating ? "danger" : "primary"}
              size="sm"
              onClick={toggleSimulator}
              className="gap-1.5"
              disabled={!connected}
            >
              {isSimulating ? <><Ban className="h-3.5 w-3.5" />Stop</> : <><Send className="h-3.5 w-3.5" />Start</>}
            </Button>
          </div>
          <div>
            <label className="text-[11px] font-medium uppercase tracking-[0.03em] text-muted mb-1 block">Interval (seconds)</label>
            <select value={interval} onChange={(e) => setSimInterval(Number(e.target.value))} className="h-8 rounded border bg-surface px-2.5 text-[12px] focus:border-accent focus:outline-none" disabled={isSimulating}>
              {[1, 2, 3, 5, 10].map((n) => <option key={n} value={n}>{n}s</option>)}
            </select>
          </div>
          <div>
            <label className="text-[11px] font-medium uppercase tracking-[0.03em] text-muted mb-1 block">Filter Marketplace</label>
            <select value={selectedMarketplace} onChange={(e) => setSelectedMarketplace(e.target.value)} className="h-8 rounded border bg-surface px-2.5 text-[12px] focus:border-accent focus:outline-none">
              <option value="all">All</option>
              {MARKETPLACES.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          {isSimulating ? (
            <div className="ml-auto flex items-center gap-1.5 rounded bg-success-subtle px-2.5 py-1.5 text-[12px] text-success">
              <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" /><span className="relative inline-flex h-2 w-2 rounded-full bg-success" /></span>
              Publishing every {interval}s
            </div>
          ) : null}
        </div>
      </div>

      {/* Notification Stream */}
      <div className="rounded border bg-surface shadow-sm">
        <div className="flex items-center justify-between border-b px-4 py-2.5">
          <h3 className="section-title">Live Feed</h3>
          <span className="text-[11px] text-muted">{filtered.length} notifications</span>
        </div>
        <div className="max-h-[500px] overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
              <Bell className="h-6 w-6 text-muted" />
              <span className="text-[13px] text-muted">Connect & start the simulator to see live orders.</span>
            </div>
          ) : (
            filtered.map((n) => (
              <div
                key={n.id}
                className={`flex items-center gap-3 border-b px-4 py-2.5 transition-colors last:border-b-0 ${
                  n.status === "order.cancelled" ? "bg-error-subtle/30" : n.status === "order.paid" ? "bg-success-subtle/10" : ""
                }`}
              >
                <div className={`shrink-0 rounded p-1.5 ${
                  n.status === "order.paid" ? "bg-success-subtle text-success" :
                  n.status === "order.cancelled" ? "bg-error-subtle text-error" :
                  "bg-accent-subtle text-accent"
                }`}>
                  {n.status === "order.paid" ? <ShoppingCart className="h-3.5 w-3.5" /> :
                   n.status === "order.cancelled" ? <Ban className="h-3.5 w-3.5" /> :
                   <Package className="h-3.5 w-3.5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-medium text-primary">Order #{n.order_id}</span>
                    <StatusBadge variant={n.status === "order.cancelled" ? "error" : n.status === "order.paid" ? "success" : "accent"}>
                      {n.status.replace("order.", "")}
                    </StatusBadge>
                  </div>
                  <div className="mt-0.5 flex gap-2 text-[12px] text-muted">
                    <span>{n.buyer}</span>
                    <span>·</span>
                    <span className="font-medium text-secondary">Rp {n.amount.toLocaleString("id-ID")}</span>
                    <span>·</span>
                    <span className="flex items-center gap-1"><Store className="h-3 w-3" />{n.marketplace}</span>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-[11px] text-muted">{n.ts}</div>
                  <div className="text-[10px] text-muted mono">{n.channel}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

