# pipeline/deepgram-cartesia

Pipeline voice agent using Deepgram STT and Cartesia TTS over WebSocket transport. The LLM vendor and model are configurable via application variables (OpenAI or Anthropic).

Demonstrates:
- The `pipeline` verb with separate STT, LLM, and TTS configuration
- Selectable LLM vendor derived from the chosen model
- `earlyGeneration: true` for lower latency responses
- Krisp turn detection
- Application variables (`envVars`) for portal-configurable settings

## Setup

```bash
npm install
```

## Application Variables

Configured in the jambonz portal and passed via `session.data.env_vars`:

| Variable         | Required | Default | Description |
|------------------|----------|---------|-------------|
| `LLM_MODEL`     | No       | `gpt-5.4-mini` | LLM model (OpenAI or Anthropic) |
| `CARTESIA_VOICE` | No       | `9626c31c-...` | Cartesia voice ID |
| `SYSTEM_PROMPT`  | No       | *(provided)* | System prompt for the voice agent |

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

Note: Deepgram, Cartesia, and LLM provider credentials should be configured in the jambonz portal under speech provider settings.
