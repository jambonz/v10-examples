# gather/dtmf-menu

IVR menu example using the `gather` verb to collect DTMF input over WebSocket transport.

Presents a 3-option menu (sales, support, billing) and routes based on the digit pressed. Demonstrates:
- The `gather` verb with `input: ['digits']` and `numDigits: 1`
- Multi-step call flow using action hooks
- Replaying the menu on invalid input
- Fallback say + hangup when no input is received

## Setup

```bash
npm install
```

## Environment Variables

| Variable    | Default | Description |
|-------------|---------|-------------|
| `PORT`      | `3000`  | Port the WebSocket server listens on |
| `LOG_LEVEL` | `info`  | Pino log level (debug, info, warn, error) |

## Running

```bash
npm start
```

Configure your jambonz application to use the WebSocket URL `ws://your-server:3000/`.
