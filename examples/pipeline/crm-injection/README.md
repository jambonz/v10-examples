# pipeline/crm-injection

Pipeline voice agent with live CRM context injection, using Deepgram STT and Cartesia TTS over WebSocket transport.

Demonstrates `pipeline:update` with `inject_context` to push customer information into the conversation mid-call. After the first conversational turn, the app waits 3 seconds (simulating a CRM lookup) then injects customer details including name, account tier, and purchase history.

Demonstrates:
- `session.updatePipeline()` with `type: 'inject_context'`
- Injecting structured customer context mid-conversation
- Simulating an asynchronous CRM data lookup
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
