# s2s/deepgram

Deepgram speech-to-speech voice agent using the `s2s` verb over WebSocket transport.

Connects the caller to Deepgram's Voice Agent API with Nova-3 STT and GPT-4o-mini for a real-time voice conversation. Demonstrates:
- The `s2s` verb with `vendor: 'deepgram'`
- Deepgram's `Settings` configuration for listen/think providers
- API key authentication
- The `actionHook` callback for session completion

## Setup

```bash
npm install
```

## Environment Variables

| Variable           | Default | Description |
|--------------------|---------|-------------|
| `PORT`             | `3000`  | Port the WebSocket server listens on |
| `LOG_LEVEL`        | `info`  | Pino log level (debug, info, warn, error) |
| `DEEPGRAM_API_KEY` | —       | Deepgram API key (required) |

## Running

```bash
npm start
```

Configure your jambonz application to use the WebSocket URL `ws://your-server:3000/`.
