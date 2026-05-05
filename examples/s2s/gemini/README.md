# s2s/gemini

Gemini Live speech-to-speech voice agent using the `s2s` verb over WebSocket transport.

Connects the caller to Google's Gemini 3.1 Flash Live model for a real-time voice conversation. Demonstrates:
- The `s2s` verb with `vendor: 'google'`
- API key authentication
- System prompt configuration via `llmOptions.messages`
- The `actionHook` callback for session completion

## Setup

```bash
npm install
```

## Application Variables

Configured in the jambonz portal and passed via `session.data.env_vars`:

| Variable         | Default | Description |
|------------------|---------|-------------|
| `GOOGLE_API_KEY` | —       | Google AI API key (required, file upload) |

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
