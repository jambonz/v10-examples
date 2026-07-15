# transfer/three-way-warm — agent verb + handoff

Three-way warm transfer driven by the **`agent` verb's `handoff` property** with
**`callerPresent: true`**. An AI agent talks to the caller, then brings a human
specialist onto the line in a three-way where the caller hears the agent
introduce them.

The difference from the parked warm transfer is literally **one property**
(`callerPresent: true`). jambonz runs the three-way for you — there is **no**
`conference` verb, **no** REST `createCall`, and **no** second WebSocket
endpoint for the outbound leg. (The previous version of this example did all of
that by hand; the handoff feature exists precisely to remove it.)

Demonstrates:
- The `agent` verb (STT → LLM → TTS) with declarative `handoff`
- `mode: 'warm'`, `callerPresent: true` — caller joins the three-way and hears the brief
- `brief: 'auto'` — the LLM writes the introduction it speaks to the specialist
- `disposition` — fallback when the specialist doesn't answer / is busy / declines

## Requirements

- jambonz **≥ 10.3.0** (agent verb ≥ 10.1.0; warm/blind handoff choreography ≥ 10.3.0)
- STT, TTS, and an LLM vendor provisioned on your jambonz account

## Setup

```bash
npm install
```

Configuration is loaded from `.env` (see the file in this folder). No REST
credentials are needed anymore.

## Environment Variables

| Variable                 | Default        | Description |
|--------------------------|----------------|-------------|
| `PORT`                   | `3012`         | WebSocket server port |
| `LOG_LEVEL`              | `info`         | Pino log level |
| `THREE_WAY_TARGET`       | `+15085550100` | E.164 number of the human specialist |
| `THREE_WAY_CALLER_ID`    | _(unset)_      | Owned E.164 DID presented to the specialist (recommended) |
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

Point your jambonz application at `ws://your-server:3012/`.

## Before vs. after

| | Old (conference + REST) | New (agent + handoff) |
|---|---|---|
| Verbs | `conference` on two legs | `agent` |
| Outbound leg | `JambonzClient.calls.create` | handled by `handoff` |
| Endpoints | `/` **and** `/specialist` | `/` only |
| Config | account SID, API key, public ws URL, room name | just the target number |
| Three-way toggle | rebuild the flow | `callerPresent: true` |
