# gather/echo-deepgramflux

Speech echo example using **Deepgram Flux for both STT and TTS** over WebSocket transport.

Listens for speech with the Flux recognizer (`flux-general-en`), echoes back what was said with a Flux TTS voice (`flux-{voice}-en`), then listens again. Demonstrates:

- The `gather` verb with a `recognizer` pinned to `vendor: 'deepgramflux'`
- Flux-specific recognizer options (`deepgramOptions.model`, `deepgramOptions.eotThreshold`)
- The `say` verb with a `synthesizer` pinned to `vendor: 'deepgramflux'` — for Flux TTS the voice IS the model (e.g. `flux-alexis-en`), there is no separate language setting
- Flux is turn-based: jambonz emits the final transcript on Deepgram's `EndOfTurn` event

## Prerequisites

A **Deepgram Flux** speech credential configured in the jambonz portal (Speech services → add vendor "Deepgram Flux") with both "Use for text-to-speech" and "Use for speech-to-text" enabled. Only the API key is required when using the hosted Deepgram service; self-hosted STT/TTS container URIs are optional.

## Setup

```bash
npm install
```

## Environment Variables

| Variable                      | Default          | Description |
|-------------------------------|------------------|-------------|
| `PORT`                        | `3000`           | Port the WebSocket server listens on |
| `LOG_LEVEL`                   | `info`           | Pino log level (debug, info, warn, error) |
| `DEEPGRAM_FLUX_TTS_MODEL`     | `flux-alexis-en` | Flux TTS model (voice) used to speak back |
| `DEEPGRAM_FLUX_EOT_THRESHOLD` | `0.7`            | End-of-turn confidence threshold (0-1); higher waits longer before ending the turn |

The `DEEPGRAM_FLUX_TTS_MODEL` and `DEEPGRAM_FLUX_EOT_THRESHOLD` variables are also exposed as portal-discoverable application variables (`env_vars`).

## Running

```bash
npm start
```

Configure your jambonz application to use the WebSocket URL `ws://your-server:3000/`.
