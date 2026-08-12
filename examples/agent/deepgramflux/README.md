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
- An LLM credential for the vendor of the model you pick (Anthropic, OpenAI, Moonshot, xAI, or Z.ai), **or** the model enabled on the account's jambonz-hosted inference page.

## LLM model selection

The `LLM_MODEL` prefix picks the vendor:

| Prefix | Vendor | Examples |
|--------|--------|----------|
| `claude` | anthropic | `claude-sonnet-4-6`, `claude-opus-4-6` |
| `gpt` | openai | `gpt-5.4`, `gpt-4.1-mini` |
| `kimi` / `moonshotai.` | moonshot | `kimi-k2.5`, `moonshotai.kimi-k2.5` |
| `grok` / `xai.` | xai | `grok-4.3`, `xai.grok-4.3` |
| `glm` / `zai.` | zai | `glm-4.7`, `glm-4.7-flash`, `zai.glm-4.7` |

Plain ids (`kimi-k2.5`, `grok-4.3`, `glm-4.7`, `glm-4.7-flash`) target the vendor's native API and need a BYO API-key credential. The dotted ids (`moonshotai.kimi-k2.5`, `xai.grok-4.3`, `zai.glm-4.7`, `zai.glm-4.7-flash`) are the jambonz-hosted model ids — use those when the model is toggled on under the account's hosted-inference (suppliers) page and billed from the wallet. Moonshot/xAI/Z.ai vendors require a recent feature-server with `@jambonz/llm` 0.6+.

## Setup

```bash
npm install
```

## Environment Variables

| Variable                  | Default             | Description |
|---------------------------|---------------------|-------------|
| `PORT`                    | `3000`              | Port the WebSocket server listens on |
| `LOG_LEVEL`               | `info`              | Pino log level |
| `LLM_MODEL`               | `claude-sonnet-4-6` | LLM model; the prefix picks the vendor (see below) |
| `DEEPGRAM_FLUX_TTS_MODEL` | `flux-alexis-en`    | Flux TTS model (voice) |
| `SYSTEM_PROMPT`           | (built-in)          | System prompt for the agent |
| `NOISE_ISOLATION`         | `off`               | `off`, `krisp`, or `rnnoise` |
| `EARLY_GENERATION`        | `on`                | Speculative LLM preflight for lower latency |
| `EAGER_EOT_THRESHOLD`     | `0.5`               | Flux eager end-of-turn threshold (0.3-0.9); required for early generation to fire |

All of these are exposed as portal-discoverable application variables (`env_vars`).

## Running

```bash
npm start
```

Configure your jambonz application to use the WebSocket URL `ws://your-server:3000/`.
