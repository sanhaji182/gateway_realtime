import { NextRequest, NextResponse } from "next/server";
import { listConnections } from "@/app/api/v1/connections/data";
import { fetchGatewayStats } from "@/lib/gateway";
import type { ConnectionItem } from "@/lib/api";

export async function GET(request: NextRequest) {
  const stats = await fetchGatewayStats();
  if (stats) {
    const all: ConnectionItem[] = stats.connections.map((c) => {
      const channels = c.channels ?? [];
      const connectedAt = new Date(c.connected_at).toISOString();
      return {
        socket_id: c.socket_id,
        app_id: "",
        app_name: "",
        user_id: c.user_id,
        ip: "",
        channels,
        channel_count: channels.length,
        connected_at: connectedAt,
        last_seen_at: connectedAt,
        state: "live",
      };
    });
    const sp = request.nextUrl.searchParams;
    const search = sp.get("search")?.toLowerCase() ?? "";
    const channel = sp.get("channel")?.toLowerCase() ?? "";
    const filtered = all
      .filter((c) => !search || c.socket_id.toLowerCase().includes(search) || c.user_id.toLowerCase().includes(search))
      .filter((c) => !channel || c.channels.some((n) => n.toLowerCase().includes(channel)));
    const page = Number(sp.get("page") ?? 1);
    const perPage = Number(sp.get("per_page") ?? 50);
    const start = (page - 1) * perPage;
    return NextResponse.json({ data: filtered.slice(start, start + perPage), meta: { page, per_page: perPage, total: filtered.length } });
  }
  // Fallback: gateway tidak terjangkau — sajikan data demo agar UI tetap tampil.
  const result = listConnections(request.nextUrl.searchParams);
  return NextResponse.json({ data: result.data, meta: result.meta });
}
