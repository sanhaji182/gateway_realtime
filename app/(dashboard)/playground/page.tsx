"use client";

import { ArrowDown, ArrowUp, Copy, LinkIcon, Plus, Send, Wifi, WifiOff, X, Zap } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { toast } from "@/components/ui/Toast";

type LogEntry = {
  id: string;
  ts: number;
  type: "outgoing" | "incoming" | "system" | "error";
  channel?: string;
  event?: string;
  payload: string;
};

function now() { return new Date().toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit", fractionalSecondDigits: 3 }); }

export default function PlaygroundPage() {
  const [connected, setConnected] = useState(false);
  const [socketId, setSocketId] = useState<string | null>(null);
  const [channels, setChannels] = useState<{ name: string; state: string }[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [channelInput, setChannelInput] = useState("");
  const [messageInput, setMessageInput] = useState("");
  const [eventInput, setEventInput] = useState("message.new");
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
  const [host, setHost] = useState("localhost:4000");
  const [showConfig, setShowConfig] = useState(false);
  const [statusMsg, setStatusMsg] = useState("Disconnected");
  const wsRef = useRef<WebSocket | null>(null);
  const logEndRef = useRef<HTMLDivElement>(null);

  // Simple direct setState for logs — no batching complexity
  const addLog = useCallback((entry: Omit<LogEntry, "id" | "ts">) => {
    const item: LogEntry = { ...entry, id: crypto.randomUUID(), ts: Date.now() };
    setLogs((prev) => {
      const next = [...prev, item];
      return next.length > 200 ? next.slice(-200) : next;
    });
  }, []);

  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ block: "end" });
    }
  }, [logs]);

  const connect = useCallback(async () => {
    if (wsRef.current) { wsRef.current.close(); wsRef.current = null; }
    let token = "";
    try {
      const res = await fetch("/api/socket/token");
      token = (await res.json() as { token: string }).token;
    } catch {
      toast.error("Failed to get auth token");
      return;
    }
    const url = `ws://${host}/ws?token=${token}`;
    setStatusMsg("Connecting...");
    const ws = new WebSocket(url);

    ws.onopen = () => {
      setConnected(true);
      setStatusMsg("Connected");
      addLog({ type: "system", event: "connected", payload: "WebSocket open" });
      toast.success("Connected");
    };

    ws.onmessage = (e) => {
      try {
        const m = JSON.parse(e.data);
        if (m.type === "system" && m.event === "connected") {
          setSocketId(m.data?.socketId ?? null);
          addLog({ type: "system", event: "system.connected", payload: `id=${m.data?.socketId}` });
        } else if (m.type === "system" && m.event === "subscription_succeeded") {
          const ch = m.channel || m.data?.channel || "?";
          setChannels((prev) => prev.map((c) => c.name === ch ? { ...c, state: "subscribed" } : c));
          addLog({ type: "system", event: "subscription_succeeded", channel: ch, payload: "OK" });
          toast.success(`Subscribed: ${ch}`);
        } else if (m.type === "system" && m.event === "subscription_error") {
          const ch = m.channel || m.data?.channel || "?";
          setChannels((prev) => prev.map((c) => c.name === ch ? { ...c, state: "error" } : c));
          addLog({ type: "error", event: "subscription_error", channel: ch, payload: m.data?.code || "?" });
          toast.error(`${ch}: ${m.data?.code}`);
        } else if (m.type === "event") {
          addLog({ type: "incoming", event: m.event, channel: m.channel, payload: JSON.stringify(m.data).slice(0, 150) });
        } else {
          addLog({ type: "system", event: m.event || m.type, channel: m.channel || "", payload: JSON.stringify(m).slice(0, 100) });
        }
      } catch {
        if (typeof e.data === "string") addLog({ type: "error", event: "parse_error", payload: e.data.slice(0, 80) });
      }
    };

    ws.onclose = () => { setConnected(false); setSocketId(null); setStatusMsg("Disconnected"); addLog({ type: "system", event: "closed", payload: "connection closed" }); wsRef.current = null; };
    ws.onerror = () => { addLog({ type: "error", event: "ws_error", payload: "WebSocket error" }); setStatusMsg("Error"); };
    wsRef.current = ws;
  }, [host, addLog]);

  const disconnect = useCallback(() => {
    wsRef.current?.close(); wsRef.current = null;
    setConnected(false); setSocketId(null); setChannels([]); setSelectedChannel(null); setStatusMsg("Disconnected");
  }, []);

  const subscribeChannel = useCallback((name: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) { toast.error("Not connected"); return; }
    if (channels.some((c) => c.name === name)) { toast.error(`Already subscribed: ${name}`); return; }
    setChannels((prev) => [...prev, { name, state: "pending" }]);
    setSelectedChannel(name);
    wsRef.current.send(JSON.stringify({ type: "subscribe", channel: name }));
    addLog({ type: "outgoing", event: "subscribe", channel: name, payload: "sent" });
  }, [channels, addLog]);

  const unsubscribeChannel = useCallback((name: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({ type: "unsubscribe", channel: name }));
    setChannels((prev) => prev.filter((c) => c.name !== name));
    if (selectedChannel === name) setSelectedChannel(channels.find((c) => c.name !== name)?.name ?? null);
  }, [selectedChannel, channels]);

  const sendEvent = useCallback(async () => {
    if (!messageInput.trim()) return;
    const payload = messageInput.trim();
    const ch = selectedChannel || "outgoing";
    addLog({ type: "outgoing", event: eventInput, channel: ch, payload: payload.slice(0, 100) });
    setMessageInput("");
    try {
      let data: unknown;
      try { data = JSON.parse(payload); } catch { data = { text: payload }; }
      
      const body = JSON.stringify({ channel: ch, event: eventInput, data });
      
      // Sign with dev credentials
      const appKey = "pk_dev_playground";
      const secret = "sk_dev_playground_secret";
      const msgBytes = new TextEncoder().encode(body);
      const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
      const sig = await crypto.subtle.sign("HMAC", key, msgBytes);
      const signature = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");
      
      const res = await fetch("/api/v1/events", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-App-Key": appKey, "X-Signature": signature },
        body,
      });
      
      if (res.ok) {
        addLog({ type: "system", event: "published (signed)", channel: ch, payload: "200 OK" });
        toast.success("Published (HMAC signed)");
      } else {
        const eb = await res.json().catch(() => ({ error: "HTTP " + res.status }));
        throw new Error((eb as { error?: string }).error || "HTTP " + res.status);
      }
    } catch (err) {
      addLog({ type: "error", event: "publish_fail", payload: String(err) });
      toast.error("Publish failed: " + String(err));
    }
  }, [messageInput, eventInput, addLog, selectedChannel]);

  const filteredLogs = selectedChannel
    ? logs.filter((l) => !l.channel || l.channel === selectedChannel || l.type === "system" || l.type === "error")
    : logs;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div><h1 className="page-title">Realtime Playground</h1><p className="mt-0.5 text-[12px] text-muted">Connect, subscribe, and publish events via WebSocket + REST API.</p></div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setShowConfig(!showConfig)}><LinkIcon className="mr-1 h-3 w-3" />{showConfig ? "Hide" : "Config"}</Button>
          {!connected ? <Button variant="primary" size="sm" onClick={connect}><Zap className="mr-1 h-3 w-3" />Connect</Button> : <Button variant="danger" size="sm" onClick={disconnect}><WifiOff className="mr-1 h-3 w-3" />Disconnect</Button>}
        </div>
      </div>
      {showConfig ? <div className="rounded border bg-surface p-3 shadow-sm"><Input label="Gateway Host" value={host} onChange={(e) => setHost(e.target.value)} placeholder="localhost:4000" className="max-w-xs" /><p className="mt-1.5 text-[11px] text-muted">JWT token auto-fetched.</p></div> : null}
      <div className="flex items-center gap-2">
        <StatusBadge variant={connected ? "success" : "neutral"} className="gap-1">{connected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}{statusMsg}</StatusBadge>
        {socketId ? <span className="mono text-[12px] text-muted">{socketId}</span> : null}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[260px_1fr_340px]">
        {/* Channels */}
        <div className="rounded border bg-surface shadow-sm">
          <div className="flex items-center justify-between border-b px-3 py-2"><h3 className="section-title">Channels</h3><span className="text-[11px] text-muted">{channels.length}</span></div>
          <div className="p-2">
            <form className="flex gap-1.5" onSubmit={(e) => { e.preventDefault(); if (channelInput.trim()) subscribeChannel(channelInput.trim()); }}>
              <input value={channelInput} onChange={(e) => setChannelInput(e.target.value)} placeholder="events" className="h-7 flex-1 rounded border bg-surface px-2 text-[12px] text-primary placeholder:text-muted focus:border-accent focus:outline-none" />
              <Button type="submit" variant="secondary" size="sm" className="h-7 px-2" disabled={!connected}>+</Button>
            </form>
            <div className="mt-2 space-y-0.5">
              {[{ k: "events" }, { k: "notifications" }, { k: "presence.lobby" }, { k: "alerts" }].map((tpl) => (
                <button key={tpl.k} className="flex items-center gap-1.5 rounded px-2 py-1.5 text-[12px] text-muted hover:bg-hover hover:text-secondary w-full text-left" onClick={() => subscribeChannel(tpl.k)}><Plus className="h-3 w-3 shrink-0" />{tpl.k}</button>
              ))}
            </div>
          </div>
          {channels.length > 0 ? (
            <div className="border-t px-2 py-1.5 space-y-0.5">
              {channels.map((ch) => (
                <div key={ch.name} className={`flex items-center justify-between gap-2 rounded px-2 py-1.5 cursor-pointer text-[12px] ${selectedChannel === ch.name ? "bg-accent-subtle text-accent" : "text-secondary hover:bg-hover"}`} onClick={() => setSelectedChannel(ch.name)}>
                  <span className="mono truncate">{ch.name}</span>
                  <div className="flex items-center gap-1 shrink-0">
                    <StatusBadge variant={ch.state === "subscribed" ? "success" : ch.state === "error" ? "error" : "warning"} className="text-[10px] px-1">{ch.state}</StatusBadge>
                    <button onClick={(e) => { e.stopPropagation(); unsubscribeChannel(ch.name); }} className="text-muted hover:text-error"><X className="h-3 w-3" /></button>
                  </div>
                </div>
              ))}
            </div>
          ) : <div className="border-t px-3 py-4 text-center text-[11px] text-muted">No channels yet.</div>}
        </div>

        {/* Event Stream */}
        <div className="rounded border bg-surface shadow-sm flex flex-col min-h-[420px]">
          <div className="flex items-center justify-between border-b px-3 py-2"><h3 className="section-title">Event Stream</h3><span className="text-[11px] text-muted">{filteredLogs.length}</span></div>
          <div className="flex-1 overflow-y-auto p-3 space-y-0.5 mono text-[11px]">
            {filteredLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-2 text-center"><Zap className="h-5 w-5 text-muted" /><span className="text-[12px] text-muted font-sans">Connect → subscribe → events appear here.</span></div>
            ) : (
              filteredLogs.map((log) => (
                <div key={log.id} className={`flex items-start gap-1.5 rounded px-2 py-0.5 ${log.type === "error" ? "bg-error-subtle text-error" : log.type === "system" ? "text-muted" : log.type === "outgoing" ? "bg-accent-subtle/30" : ""}`}>
                  <span className="text-[10px] text-muted shrink-0 w-16">{now()}</span>
                  {log.type === "outgoing" ? <ArrowUp className="h-3 w-3 text-accent mt-0.5 shrink-0" /> : log.type === "incoming" ? <ArrowDown className="h-3 w-3 text-success mt-0.5 shrink-0" /> : <span className="w-3 shrink-0" />}
                  {log.channel ? <span className="text-primary shrink-0">{log.channel}</span> : null}
                  {log.event ? <span className="text-secondary shrink-0">{log.event}</span> : null}
                  <span className="text-secondary truncate">{log.payload}</span>
                </div>
              ))
            )}
            <div ref={logEndRef} />
          </div>
        </div>

        {/* Send Panel */}
        <div className="rounded border bg-surface shadow-sm flex flex-col">
          <div className="border-b px-3 py-2"><h3 className="section-title">Publish Event</h3></div>
          <div className="flex-1 p-3 space-y-3">
            <div>
              <label className="text-[11px] font-medium uppercase tracking-[0.03em] text-muted mb-1 block">Event Name</label>
              <select value={eventInput} onChange={(e) => setEventInput(e.target.value)} className="h-8 w-full rounded border bg-surface px-2.5 text-[12px] focus:border-accent focus:outline-none">
                <option value="message.new">message.new</option><option value="message.reply">message.reply</option>
                <option value="typing.start">typing.start</option><option value="typing.stop">typing.stop</option>
                <option value="event.triggered">event.triggered</option><option value="alert.created">alert.created</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] font-medium uppercase tracking-[0.03em] text-muted mb-1 block">Payload (JSON)</label>
              <textarea value={messageInput} onChange={(e) => setMessageInput(e.target.value)} rows={5} placeholder='{"text":"Hello","user":"demo"}' className="mono w-full rounded border bg-surface px-2.5 py-2 text-[12px] text-primary placeholder:text-muted focus:border-accent focus:outline-none resize-none" />
            </div>
            <Button variant="primary" size="sm" onClick={sendEvent} disabled={!messageInput.trim()} className="w-full"><Send className="mr-1 h-3 w-3" />Publish via REST API</Button>
            <div className="pt-3 border-t">
              <h4 className="text-[11px] font-medium uppercase tracking-[0.03em] text-muted mb-2">Quick Templates</h4>
              <div className="space-y-1">
                {[{ l: "Chat", p: '{"text":"Hello","user":"demo","room":"general"}' },{ l: "Order", p: '{"order_id":999,"amount":250000,"currency":"IDR"}' },{ l: "Typing", p: '{"user":"demo","room":"general"}' },{ l: "Alert", p: '{"level":"warning","message":"CPU>80%"}' }].map((tpl) => (
                  <button key={tpl.l} className="flex items-center gap-2 w-full rounded px-2 py-1.5 text-[12px] text-secondary hover:bg-hover hover:text-primary text-left" onClick={() => setMessageInput(tpl.p)}><Copy className="h-3 w-3 text-muted shrink-0" />{tpl.l}</button>
                ))}
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
