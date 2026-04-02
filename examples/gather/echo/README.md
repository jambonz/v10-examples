# gather/echo

Speech echo example using the `gather` verb over WebSocket transport.

Listens for speech input, echoes back what was said along with the confidence score, then listens again. Demonstrates:
- The `gather` verb with `input: ['speech']`
- The `actionHook` callback pattern for handling gather results
- Handling `speechDetected` and `timeout` events
- Using `reply()` to respond to action hooks

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
