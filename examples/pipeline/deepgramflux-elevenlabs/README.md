# pipeline/deepgramflux-elevenlabs

Pipeline voice agent using Deepgram Flux STT and ElevenLabs TTS over WebSocket transport. The LLM vendor and model are configurable via application variables (OpenAI or Anthropic).

Demonstrates:
- The `pipeline` verb with Deepgram Flux STT
- ElevenLabs TTS with model selection via `options`
- Selectable LLM vendor derived from the chosen model
- STT-based turn detection (native to Deepgram Flux)
- `earlyGeneration: true` for lower latency responses
- Application variables (`envVars`) for portal-configurable settings

## Setup

```bash
npm install
```

## Application Variables

Configured in the jambonz portal and passed via `session.data.env_vars`:

| Variable          | Required | Default | Description |
|-------------------|----------|---------|-------------|
| `LLM_MODEL`      | No       | `claude-sonnet-4-6` | LLM model (OpenAI or Anthropic) |
| `ELEVENLABS_VOICE`| No       | `hpp4J3VqNfWAUOO0d1Us` | ElevenLabs voice ID |
| `SYSTEM_PROMPT`   | No       | *(provided)* | System prompt for the voice agent |

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

Note: Deepgram, ElevenLabs, and LLM provider credentials should be configured in the jambonz portal under speech provider settings.
