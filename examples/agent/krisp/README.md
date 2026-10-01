# agent/krisp

A voice agent that exercises every Krisp audio feature the `agent` verb exposes, with each one wired to an environment variable so you can flip it from the portal between calls instead of redeploying.

Krisp runs **inside the media server**. Nothing about it is visible to this application directly — no callback tells you the noise model loaded, and none tells you an end-of-turn was computed. You verify it by listening, and by watching the `agent-event` stream this example logs.

## What it covers

| Feature | Verb field | Env var |
|---|---|---|
| Background-noise removal on caller audio | `noiseIsolation` | `NOISE_ISOLATION`, `NOISE_ISOLATION_LEVEL`, `NOISE_ISOLATION_MODEL` |
| Acoustic end-of-turn detection | `turnDetection` | `TURN_DETECTION`, `KRISP_EOT_THRESHOLD` |
| Genuine-interruption scoring | `bargeIn.strategy` | `BARGE_IN`, `INTERRUPT_THRESHOLD` |
| Who speaks first | `greeting` | `GREETING` |

## Running

```bash
# from the repo root
npx tsx examples/agent/krisp/src/index.ts

# or from here
npm start
```

Then point a jambonz application at the WebSocket endpoint and call it.

## How to actually tell whether Krisp is working

Each feature needs a different kind of evidence. "The call connected" proves nothing — a call whose Krisp path is completely dead still connects, still carries RTP, and simply never answers you.

**Noise isolation.** Call from somewhere noisy (or play background noise into the call) and set `NOISE_ISOLATION=krisp`. The agent should understand you; with `off` on the same background it should start mishearing. Judge it by whether the agent's replies make sense, not by whether the call worked.

**Turn detection.** Set `TURN_DETECTION=krisp` and watch the log for `turn_end` events. Lower `KRISP_EOT_THRESHOLD` and the agent should start replying sooner after you stop talking; raise it and it should wait longer. If no `turn_end` ever appears, the agent will never reply at all.

**Interruption prediction.** Set `BARGE_IN=interruptPrediction` and talk over the agent mid-sentence — you should see a `user_interruption` event and the agent should stop. Then try a backchannel ("uh-huh", "right") while it talks: the point of the ML model is that this should *not* cut it off, where `BARGE_IN=vad` would.

## Model names changed in Krisp 9.20

The 9.20 model pack **dropped** `krisp-viva-vi-tel-lite-v1.kef` (the old default) and **renamed** `krisp-viva-ip-v1.kef` to `krisp-viva-ip-v1.1.kef`. An app that pinned either old name stops working after the media server is upgraded: noise isolation fails to start for that session, the call continues without it, and the only sign is a `krisp nc create: failed to create noise cancellation instance` line in the media-server log.

`NOISE_ISOLATION_MODEL` defaults to blank, which takes the media server's built-in default. Leave it blank unless you are deliberately testing a specific model — that way a future pack change cannot break you.

## `GREETING` is not just cosmetic

It is listed as a knob because it changes turn-taking behaviour, not only the caller experience: with `greeting=on` the agent speaks first, and the transition out of its own speech is what arms the Krisp turn-taking model. Flip it to `off` (caller speaks first) when you want to test that path specifically — and if the agent goes silent there while `on` works, that difference is the finding, not a misconfiguration on your side.

## Environment variables

| Name | Default | Notes |
|---|---|---|
| `LLM_MODEL` | `claude-sonnet-4-6` | Vendor inferred from the model id |
| `TURN_DETECTION` | `krisp` | `krisp` or `stt` |
| `KRISP_EOT_THRESHOLD` | `0.5` | 0.0–1.0; lower turns sooner |
| `GREETING` | `on` | Whether the agent speaks first |
| `NOISE_ISOLATION` | `krisp` | `krisp`, `rnnoise`, or `off` |
| `NOISE_ISOLATION_LEVEL` | `100` | 0–100 suppression strength |
| `NOISE_ISOLATION_MODEL` | *(blank)* | Blank = media-server default |
| `BARGE_IN` | `interruptPrediction` | `interruptPrediction`, `vad`, or `off` |
| `INTERRUPT_THRESHOLD` | `0.5` | 0.0–1.0; higher needs stronger evidence |
| `SYSTEM_PROMPT` | *(see source)* | |
| `PORT` | `3000` | |
| `LOG_LEVEL` | `info` | |

## Why Deepgram rather than Flux

STT is fixed to classic `deepgram`. Vendors with native turn-taking — Flux, AssemblyAI, Speechmatics — use their own end-of-turn signals regardless of `turnDetection`, so pairing one with `turnDetection: krisp` would leave the Krisp model with nothing to do and make this example unable to demonstrate the thing it exists to demonstrate.
