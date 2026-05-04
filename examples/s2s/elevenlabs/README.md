# s2s/elevenlabs

ElevenLabs conversational AI voice agent using the `s2s` verb over WebSocket transport.

Connects the caller to an ElevenLabs conversational AI agent for a real-time voice conversation. The agent's behavior and voice are configured in the ElevenLabs dashboard. Demonstrates:
- The `s2s` verb with `vendor: 'elevenlabs'`
- Authentication with `agent_id` and optional `api_key`
- The `actionHook` callback for session completion

## Setup

```bash
npm install
```

## Application Variables

Configured in the jambonz portal and passed via `session.data.env_vars`:

| Variable               | Default | Description |
|------------------------|---------|-------------|
| `ELEVENLABS_AGENT_ID`  | —       | ElevenLabs conversational AI agent ID (required) |
| `ELEVENLABS_API_KEY`   | —       | ElevenLabs API key (optional, file upload, enables signed URLs) |

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
