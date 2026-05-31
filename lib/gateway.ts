import { createHmac } from "crypto";

// Klien internal ke Go gateway core. Dipakai oleh API route dashboard agar menampilkan
// data koneksi/channel yang NYATA, bukan mock. Menandatangani JWT admin singkat
// (HMAC-SHA256 dengan JWT_SECRET bersama) supaya endpoint /stats yang terproteksi menerimanya.

const GATEWAY_URL = process.env.GATEWAY_INTERNAL_URL || "http://localhost:4000";
const SECRET = process.env.JWT_SECRET || "change-me-in-production-64-chars-min";

export type GatewayStats = {
  connections: Array<{ socket_id: string; user_id: string; role: string; channels: string[] | null; connected_at: number }>;
  channels: Array<{ name: string; subscribers: number; presence: boolean }>;
  total_connections: number;
  total_channels: number;
  uptime_seconds: number;
};

// Membuat JWT admin singkat (umur 60 detik) untuk memanggil endpoint internal /stats.
function signAdminToken(): string {
  const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const now = Math.floor(Date.now() / 1000);
  const header = b64({ alg: "HS256", typ: "JWT" });
  const payload = b64({ user_id: "dashboard-internal", role: "admin", iat: now, exp: now + 60 });
  const sig = createHmac("sha256", SECRET).update(`${header}.${payload}`).digest("base64url");
  return `${header}.${payload}.${sig}`;
}

// fetchGatewayStats mengembalikan snapshot live, atau null jika gateway tidak terjangkau
// sehingga pemanggil bisa fallback ke data demo.
export async function fetchGatewayStats(): Promise<GatewayStats | null> {
  try {
    const res = await fetch(`${GATEWAY_URL}/stats`, {
      headers: { Authorization: `Bearer ${signAdminToken()}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as GatewayStats;
  } catch {
    return null;
  }
}
