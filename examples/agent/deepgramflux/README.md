# agent/deepgramflux

Voice agent using **Deepgram Flux for both STT and TTS** with a configurable LLM, over WebSocket transport.

Flux is Deepgram's conversation-native model family: the recognizer is turn-based (`StartOfTurn` / `EagerEndOfTurn` / `EndOfTurn` events drive turn taking) and the TTS is served from the same `/v2/speak` endpoint family, so one Deepgram Flux speech credential covers the whole audio pipeline. Demonstrates:

- The `agent` verb with `stt.vendor: 'deepgramflux'` and `tts.vendor: 'deepgramflux'`
- Flux TTS voice selection — the voice IS the model (`flux-{voice}-en`, e.g. `flux-alexis-en`)
- `turnDetection: 'stt'` — Flux's native end-of-turn detection drives the conversation
- `earlyGeneration` — speculative LLM preflight on Flux's `EagerEndOfTurn` for lower latency
- Optional noise isolation (Krisp / RNNoise)

## Prerequisites

- A **Deepgram Flux** speech credential in the jambonz portal (Speech services → vendor "Deepgram Flux") with both "Use for text-to-speech" and "Use for speech-to-text" enabled. Only the API key is needed for the hosted Deepgram service.
- An Anthropic or OpenAI LLM credential depending on the model you pick.

## Setup

```bash
npm install
```

## Environment Variables

| Variable                  | Default             | Description |
|---------------------------|---------------------|-------------|
| `PORT`                    | `3000`              | Port the WebSocket server listens on |
| `LOG_LEVEL`               | `info`              | Pino log level |
| `LLM_MODEL`               | `claude-sonnet-4-6` | LLM model (Claude → anthropic, otherwise openai) |
| `DEEPGRAM_FLUX_TTS_MODEL` | `flux-alexis-en`    | Flux TTS model (voice) |
| `SYSTEM_PROMPT`           | (built-in)          | System prompt for the agent |
| `NOISE_ISOLATION`         | `off`               | `off`, `krisp`, or `rnnoise` |
| `EARLY_GENERATION`        | `on`                | Speculative LLM preflight for lower latency |

All of these are exposed as portal-discoverable application variables (`env_vars`).

## Running

```bash
npm start
```

Configure your jambonz application to use the WebSocket URL `ws://your-server:3000/`.
