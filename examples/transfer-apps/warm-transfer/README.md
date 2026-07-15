# transfer/warm — agent verb + handoff

Warm transfer driven entirely by the **`agent` verb's `handoff` property**. An AI
agent greets the caller, figures out what they need, and hands them off to a
human specialist. jambonz injects a `transfer_to_human` tool and runs the whole
**warm/parked** transfer choreography — brief the specialist, gate on a keypad
accept, bridge, and fall back on failure — so there is **no** `dial`, `gather`,
`confirmHook`, or `conference` code to write.

Demonstrates:
- The `agent` verb (STT → LLM → TTS) with declarative `handoff`
- `mode: 'warm'`, `callerPresent: false` — the caller is parked while the agent briefs the human
- `brief: 'auto'` — the LLM writes the spoken summary it gives the specialist
- `confirm` — the specialist presses `1` to accept (timeout/wrong digit/hangup = decline)
- `disposition` — what happens to the caller on no-answer / busy / decline / failure

## Requirements

- jambonz **≥ 10.3.0** (agent verb ≥ 10.1.0; warm/blind handoff choreography ≥ 10.3.0)
- STT, TTS, and an LLM vendor provisioned on your jambonz account

## Setup

```bash
npm install
```

## Environment Variables

| Variable                 | Default        | Description |
|--------------------------|----------------|-------------|
| `PORT`                   | `3000`         | WebSocket server port |
| `LOG_LEVEL`              | `info`         | Pino log level |
| `WARM_TRANSFER_TARGET`   | `+15085550100` | E.164 number of the human specialist |
| `WARM_TRANSFER_CALLER_ID`| _(unset)_      | Owned E.164 DID presented to the specialist (recommended) |
| `TTS_VENDOR` / `TTS_VOICE` | `cartesia` / _(demo voice)_ | Agent voice |
| `STT_VENDOR` / `STT_LANGUAGE` | `deepgram` / `en-US` | Speech-to-text (Cartesia is TTS-only) |
| `LLM_VENDOR` / `LLM_MODEL` | `openai` / `gpt-4.1-mini` | LLM for the agent |
| `LLM_BASE_URL`           | _(unset)_      | Custom LLM base URL (see Grok note) |
| `SYSTEM_PROMPT`          | _(built-in)_   | Override the agent persona |

### Using xAI Grok

The agent verb's vendor list has no `grok`. xAI's API is OpenAI-compatible, so:

```
LLM_VENDOR=openai
LLM_MODEL=grok-2-latest
LLM_BASE_URL=https://api.x.ai/v1
```

(For **Groq**, the inference host, set `LLM_VENDOR=groq` instead.)

## Running

```bash
npm start
```

Point your jambonz application at `ws://your-server:3000/`. Call in, tell the
agent what you need, and it will transfer you to the specialist once they accept.

## The whole flow, in one verb

```ts
session.agent({
  stt: { vendor: 'deepgram', language: 'en-US' },
  tts: { vendor: 'cartesia', voice: '…' },
  llm: { vendor: 'openai', model: 'gpt-4.1-mini', llmOptions: { systemPrompt } },
  handoff: {
    mode: 'warm',
    callerPresent: false,
    target: [{ type: 'phone', number: '+1…' }],
    brief: 'auto',
    confirm: { prompt: 'Press 1 to accept the transfer.', digit: '1' },
    disposition: { onNoAnswer: 'return', onBusy: 'return', onDecline: 'return', onFailure: 'return' },
    actionHook: '/transfer-done',
  },
}).send();
```
