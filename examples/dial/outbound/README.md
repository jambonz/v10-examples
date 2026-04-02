# dial/outbound

Outbound calling example using `gather` and `dial` verbs over WebSocket transport.

Prompts the caller to enter a phone number via DTMF, then dials that number and bridges the call. Demonstrates:
- The `gather` verb with `input: ['digits']` and `finishOnKey: '#'`
- The `dial` verb with a phone target
- Multi-stage call flow using action hooks (`/collect-digits`, `/dial-complete`)
- Handling dial completion status

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
