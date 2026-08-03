# s2s/xai

xAI Grok speech-to-speech voice agent using the `s2s` verb over WebSocket transport.

Connects the caller to xAI's [Realtime API](https://docs.x.ai/developers/model-capabilities/audio/speech-to-speech) with the Grok voice model for a real-time voice conversation with server-side VAD turn detection. Demonstrates:
- The `s2s` verb with `vendor: 'xai'`
- The model pinned to `grok-voice-think-fast-2.0` (the `grok-voice-latest` alias resolves to the previous generation until 5 August 2026)
- `session_update` configuration (voice, instructions, `server_vad` turn detection) — required for xai, which gates audio until it receives the first `session.updated`
- `response_create` for an agent-first greeting — also required for xai (the feature-server throws if either key is missing from `llmOptions`)
- `reasoning.effort` — xAI-specific: `'high'` lets Grok reason before speaking, `'none'` minimizes latency
- `replace` — xAI-specific pronunciation map applied to model output before TTS
- API key authentication
- The `actionHook` callback for session completion

Audio formats are deliberately left unset — jambonz negotiates codec and sample rate with the media stack, so `session.audio.input.format` and `session.audio.output.format` should not be configured here. Built-in voices are `eve` (default), `ara`, `rex`, `sal`, and `leo`; custom voice IDs from the xAI Custom Voices API also work.

## Setup

```bash
npm install
```

## Application Variables

Configured in the jambonz portal and passed via `session.data.env_vars`:

| Variable      | Default | Description |
|---------------|---------|-------------|
| `XAI_API_KEY` | —       | xAI API key (required) |

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
