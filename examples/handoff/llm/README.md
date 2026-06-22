# handoff/llm

Layer-1 transfer-to-human on the realtime `llm` verb (OpenAI gpt-realtime / s2s) over
WebSocket transport.

The `handoff` block auto-injects a `transfer_to_human` tool. Driven conversationally
(per the jambonz openai-s2s example): the model greets, and when the caller asks for a
human it calls the tool and jambonz runs the packaged transfer to the destination
(default `xhoaluu2@sip.jambonz.me`). The `actionHook` reports
`completion_reason: 'transferred'` once the human leg bridges.

## Setup

```bash
npm install
```

## Environment Variables

| Variable         | Default                     | Description |
|------------------|-----------------------------|-------------|
| `OPENAI_API_KEY` | —                           | OpenAI API key for the realtime LLM (required) |
| `HANDOFF_TARGET` | `xhoaluu2@sip.jambonz.me`   | SIP user or phone to hand off to |
| `PORT`           | `3000`                      | Port the WebSocket server listens on |
| `LOG_LEVEL`      | `info`                      | Pino log level (debug, info, warn, error) |

## Running

```bash
npm start
```

Configure your jambonz application to use the WebSocket URL `ws://your-server:3000/`.
Speak "transfer me to a human" to trigger the handoff.
