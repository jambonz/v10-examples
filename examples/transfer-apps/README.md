# transfer-apps

Four jambonz examples for call-transfer scenarios, each a standalone Node.js/TypeScript app over WebSocket transport. The first three use the **`agent` verb's `handoff` property**; the last uses the standalone **`transfer` verb**.

| App | Folder | What it does |
|-----|--------|--------------|
| Blind transfer | [`blind-transfer/`](blind-transfer) | An AI `agent` handles the caller, then hands off immediately — `handoff` with `mode: 'blind'`, `blindMethod: 'dial'` bridges a fresh outbound leg (chosen over `sip:refer`, which many carriers reject). |
| Warm transfer | [`warm-transfer/`](warm-transfer) | `agent` with `handoff` (`mode: 'warm'`, `callerPresent: false`): the caller is parked while the agent briefs and screens the specialist (`confirm`), bridging only if they accept. |
| Three-way warm transfer | [`three-way-warm-transfer/`](three-way-warm-transfer) | `agent` with `handoff` (`mode: 'warm'`, `callerPresent: true`): the caller joins a three-way call and the agent introduces them to the specialist — no `conference` verb or REST call needed. |
| Transfer verb | [`transfer-verb/`](transfer-verb) | The standalone `transfer` verb (`mode: 'warm'`) — a warm transfer with brief and `confirm`, without wrapping it in the `agent` verb. |

## Prerequisites

- Node.js 22+
- `@jambonz/sdk` ≥ 0.8.3 (the `handoff` property and `transfer` verb)
- A jambonz account and a reachable WebSocket URL for each app

## Running an app

Each app is independent:

```bash
cd blind-transfer      # or warm-transfer, three-way-warm-transfer, transfer-verb
npm install
npm start
```

Then point a jambonz application at the app's WebSocket URL, e.g. `ws://your-server:3000/`. Per-app configuration and environment variables are documented in each app's own README.
