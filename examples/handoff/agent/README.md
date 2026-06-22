# handoff/agent

Layer-1 transfer-to-human on the cascaded `agent` verb (Deepgram STT/TTS + OpenAI LLM)
over WebSocket transport.

The `handoff` block auto-injects a `transfer_to_human` tool into the LLM's toolset. When
the caller asks to speak to a human, the model calls the tool and jambonz runs the
packaged transfer to the destination (default `xhoaluu2@sip.jambonz.me`) — no tool
webhook needed. The agent's `actionHook` reports `completion_reason: 'transferred'` once
the human leg bridges.

`brief: 'none'` keeps the injected tool argument-free. Set `brief: 'auto'` to have the
LLM write a spoken summary for the human, or `{ template: '...' }` to guide it.

## Setup

```bash
npm install
```

## Environment Variables

| Variable           | Default                     | Description |
|--------------------|-----------------------------|-------------|
| `OPENAI_API_KEY`   | —                           | OpenAI API key for the agent LLM (required) |
| `HANDOFF_TARGET`   | `xhoaluu2@sip.jambonz.me`   | SIP user or phone to hand off to |
| `PORT`             | `3000`                      | Port the WebSocket server listens on |
| `LOG_LEVEL`        | `info`                      | Pino log level (debug, info, warn, error) |

Deepgram STT/TTS uses the provisioned Deepgram credential on the jambonz account.

## Running

```bash
npm start
```

Configure your jambonz application to use the WebSocket URL `ws://your-server:3000/`.
Speak "transfer me to a human" to trigger the handoff.
