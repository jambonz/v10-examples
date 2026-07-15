# transfer

Three jambonz examples for call-transfer scenarios, each a standalone Node.js/TypeScript app over WebSocket transport.

| App | Folder | What it does |
|-----|--------|--------------|
| Blind transfer | [`blind-transfer/`](blind-transfer) | Immediately bridges the caller to a target by dialing a new outbound leg (`dial`). Chosen over `sip:refer` because many carriers reject REFER. |
| Warm transfer | [`warm-transfer/`](warm-transfer) | Dials a target, screens them (`confirmHook` + `gather`), and bridges the caller only if the target accepts. |
| Three-way warm transfer | [`three-way-warm-transfer/`](three-way-warm-transfer) | Puts the caller in a `conference` and originates an outbound leg (REST API) that brings a specialist into the same room. |

## Prerequisites

- Node.js 22+
- A jambonz account and a reachable WebSocket URL for each app
- The three-way app additionally needs an **account-scoped** jambonz API key and a publicly reachable URL — see its [README](three-way-warm-transfer/README.md)

## Running an app

Each app is independent:

```bash
cd blind-transfer      # or warm-transfer, three-way-warm-transfer
npm install
npm start
```

Then point a jambonz application at the app's WebSocket URL, e.g. `ws://your-server:3000/`. Per-app configuration and environment variables are documented in each app's own README.
