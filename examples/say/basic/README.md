# say/basic

Basic text-to-speech example demonstrating the `say` verb over WebSocket transport.

Demonstrates:
- The `text` property for speaking text
- The `loop` property for repeating a message
- Verb chaining with `pause` and `hangup`

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
