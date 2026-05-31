# @gateway-realtime/react

React hooks untuk [Gateway Realtime](https://github.com/sanhaji182/gateway_realtime), di atas `@gateway-realtime/sdk`.

```bash
npm install @gateway-realtime/react @gateway-realtime/sdk
```

```tsx
import { useGateway, useChannel, usePresence } from "@gateway-realtime/react";

function Room() {
  const { client, state } = useGateway({ key: "pk_test_xxx", host: "wss://gateway.example.com" }, myJwt);
  const { members, count } = usePresence(client, "presence-room");

  useChannel(client, "orders.99", {
    "order.paid": (data) => console.log("paid", data),
  });

  return <div>Status: {state} · Online: {count}</div>;
}
```

- `useGateway(options, token?)` → `{ client, state }` (koneksi auto connect/disconnect mengikuti komponen)
- `useChannel(client, name, handlers?, options?)` → subscribe + bind handler, auto-unsubscribe
- `usePresence(client, name, options?)` → `{ members, count }` reaktif

Lisensi: MIT.
