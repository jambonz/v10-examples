# s2s/openai

OpenAI Realtime speech-to-speech voice agent using the `s2s` verb over WebSocket transport.

Connects the caller to OpenAI's Realtime API for a real-time voice conversation with server-side VAD turn detection. Demonstrates:
- The `s2s` verb with `vendor: 'openai'`
- `response_create` configuration (voice, modalities, instructions)
- `session_update` for VAD turn detection and audio transcription
- API key authentication
- The `actionHook` callback for session completion

## Setup

```bash
npm install
```

## Environment Variables

| Variable         | Default | Description |
|------------------|---------|-------------|
| `PORT`           | `3000`  | Port the WebSocket server listens on |
| `LOG_LEVEL`      | `info`  | Pino log level (debug, info, warn, error) |
| `OPENAI_API_KEY` | —       | OpenAI API key (required) |

## Running

```bash
npm start
```

Configure your jambonz application to use the WebSocket URL `ws://your-server:3000/`.
