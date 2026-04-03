# pipeline/supervisor-interrupt

Pipeline voice agent with urgent message injection, using Deepgram STT and Cartesia TTS over WebSocket transport.

Demonstrates `pipeline:update` with `generate_reply` and `interrupt: true` to force the agent to deliver an urgent message. After the third agent response, the app waits 2 seconds then sends a flash sale notification that interrupts the current conversation.

Demonstrates:
- `session.updatePipeline()` with `type: 'generate_reply'` and `interrupt: true`
- Injecting urgent messages that interrupt the agent mid-conversation
- Tracking agent response count via `agent_response` events
- Selectable LLM vendor (OpenAI, Anthropic, Google, or Bedrock) via application variables

## Setup

```bash
npm install
```

## Application Variables

Configured in the jambonz portal and passed via `session.data.env_vars`:

| Variable         | Required | Default | Description |
|------------------|----------|---------|-------------|
| `LLM_MODEL`     | No       | `gpt-4.1-mini` | LLM model (OpenAI, Anthropic, Google, or Bedrock) |
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
