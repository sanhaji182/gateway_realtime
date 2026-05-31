// Load test sederhana untuk Gateway Realtime.
// Membuka N koneksi WebSocket yang subscribe ke satu channel, lalu mem-publish K pesan
// via Redis dan mengukur throughput pengiriman + latency (p50/p95/p99).
//
// Jalankan dari folder gateway/ (butuh node_modules: ws, ioredis):
//   CONNS=200 MSGS=50 node scripts/loadtest.mjs
//
// Env: CONNS, MSGS, HOST (ws://localhost:4000), CHANNEL, JWT_SECRET, REDIS_URL
import crypto from "node:crypto";
import WebSocket from "ws";
import { Redis } from "ioredis";

const CONNS = Number(process.env.CONNS || 200);
const MSGS = Number(process.env.MSGS || 50);
const HOST = process.env.HOST || "ws://localhost:4000";
const CHANNEL = process.env.CHANNEL || "load";
const SECRET = process.env.JWT_SECRET || "dev-secret";
const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
function token() {
  const h = b64({ alg: "HS256", typ: "JWT" });
  const p = b64({ user_id: "load_" + Math.random().toString(16).slice(2), role: "user", exp: Math.floor(Date.now() / 1000) + 3600 });
  return `${h}.${p}.` + crypto.createHmac("sha256", SECRET).update(`${h}.${p}`).digest("base64url");
}

const latencies = [];
let delivered = 0;

function openConn() {
  return new Promise((resolve) => {
    const ws = new WebSocket(`${HOST}/ws?token=${encodeURIComponent(token())}`);
    ws.on("message", (raw) => {
      const m = JSON.parse(raw.toString());
      if (m.event === "subscription_succeeded" && m.channel === CHANNEL) resolve(ws);
      else if (m.type === "event" && m.data && typeof m.data.t === "number") {
        latencies.push(Date.now() - m.data.t);
        delivered++;
      }
    });
    ws.on("open", () => ws.send(JSON.stringify({ type: "subscribe", channel: CHANNEL })));
    ws.on("error", () => resolve(null));
  });
}

function pct(arr, p) {
  if (arr.length === 0) return 0;
  const i = Math.min(arr.length - 1, Math.floor((p / 100) * arr.length));
  return arr[i];
}

(async () => {
  console.log(`Load test: ${CONNS} koneksi, ${MSGS} pesan, channel "${CHANNEL}" -> ${HOST}`);
  const t0 = Date.now();
  const conns = (await Promise.all(Array.from({ length: CONNS }, openConn))).filter(Boolean);
  console.log(`Tersambung & subscribe: ${conns.length}/${CONNS} (${Date.now() - t0}ms)`);

  const pub = new Redis(REDIS_URL);
  const expected = conns.length * MSGS;
  const tPub = Date.now();
  for (let i = 0; i < MSGS; i++) {
    await pub.publish("events." + CHANNEL, JSON.stringify({ type: "event", channel: CHANNEL, event: "load.tick", data: { i, t: Date.now() } }));
  }
  // Tunggu pengiriman selesai (atau timeout).
  await new Promise((r) => {
    const iv = setInterval(() => { if (delivered >= expected || Date.now() - tPub > 8000) { clearInterval(iv); r(); } }, 50);
  });
  const elapsed = (Date.now() - tPub) / 1000;
  latencies.sort((a, b) => a - b);

  console.log("\n=== HASIL ===");
  console.log(`Pengiriman: ${delivered}/${expected} (${((delivered / expected) * 100).toFixed(1)}%)`);
  console.log(`Durasi fan-out: ${elapsed.toFixed(2)}s`);
  console.log(`Throughput: ${Math.round(delivered / elapsed).toLocaleString()} pesan/detik`);
  console.log(`Latency p50: ${pct(latencies, 50)}ms - p95: ${pct(latencies, 95)}ms - p99: ${pct(latencies, 99)}ms - max: ${latencies[latencies.length - 1] || 0}ms`);

  conns.forEach((ws) => ws.close());
  await pub.quit();
  process.exit(0);
})();
