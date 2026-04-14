# agent/persona-switch

Voice agent with mid-conversation persona change, using Deepgram STT and Cartesia TTS over WebSocket transport.

Demonstrates `agent:update` with `update_instructions` to change the agent's system prompt during a live conversation. After the second conversational turn, the agent's persona switches from a standard assistant to a pirate character.

Demonstrates:
- `session.updateAgent()` with `type: 'update_instructions'`
- Replacing the system prompt mid-conversation
- Tracking turn count via `turn_end` events
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
| `SYSTEM_PROMPT`  | No       | *(provided)* | Initial system prompt (switches to pirate after 2 turns) |

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
