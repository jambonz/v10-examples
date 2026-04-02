# listen/audio-stream

Real-time audio streaming example using the `listen` verb over WebSocket transport.

Streams call audio to an external WebSocket server in stereo, with call metadata sent on the initial connection. Demonstrates:
- The `listen` verb with a WebSocket URL target
- `mixType: 'stereo'` for separate caller/callee channels
- Sending `metadata` with the audio stream connection
- The `actionHook` callback when streaming ends

## Setup

```bash
npm install
```

## Application Variables

Configured in the jambonz portal and passed via `session.data.env_vars`:

| Variable        | Required | Description |
|-----------------|----------|-------------|
| `WS_SERVER_URL` | Yes      | WebSocket URL to stream audio to (e.g. `ws://your-server:8080`) |

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
