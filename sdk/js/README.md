# @gateway-realtime/sdk

Client SDK TypeScript untuk [Gateway Realtime](https://github.com/sanhaji182/gateway_realtime).

```bash
npm install @gateway-realtime/sdk
```

```ts
import { GatewayClient } from "@gateway-realtime/sdk";

const client = new GatewayClient({ key: "pk_test_xxx", host: "wss://gateway.example.com" });
client.setToken(myJwt); // JWT yang ditandatangani backend Anda (HS256)
client.connect();

const channel = client.subscribe("orders");
channel.on("order.created", (data) => console.log(data));

// Replay pesan terakhir (message history)
channel.on("history", ({ messages }) => console.log("history:", messages));
channel.history(20);

// Client event (channel private/presence, nama wajib diawali "client-")
const room = client.subscribe("presence-room", { auth: () => fetch("/api/socket/auth", { method: "POST", body: JSON.stringify({ socket_id: client.socketId, channel_name: "presence-room" }) }) });
room.trigger("client-typing", { user: "alice" });
```

Build paket: `npm run build` (mengkompilasi sumber dari `../../lib/socket` ke `dist/`).

Lisensi: MIT.
