# conference/basic

Basic multi-party conference example using the `conference` verb over WebSocket transport.

All callers join the same named conference room with a beep on join. Demonstrates:
- The `conference` verb with a named room
- `beep: true` for join/leave notification
- `startConferenceOnEnter: true` so the first caller starts the conference
- Status events (`join`, `leave`) via `statusHook`
- The `actionHook` callback when a participant leaves

## Setup

```bash
npm install
```

## Application Variables

Configured in the jambonz portal and passed via `session.data.env_vars`:

| Variable          | Required | Default | Description |
|-------------------|----------|---------|-------------|
| `CONFERENCE_NAME` | No       | `my-conference` | Name of the conference room |

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
