# dial/transcribe-both-legs

Bridges an inbound caller to a phone number with `dial`, and transcribes **both** legs
of the bridged conversation using a nested `transcribe` verb.

Demonstrates:
- Nesting `transcribe` inside `dial` so transcription lives for the duration of the bridge
- `separateRecognitionPerChannel` — one recognizer per leg, so each party is transcribed independently
- Attributing each result to a speaker via `speech.channel_tag`
- Accumulating a two-party transcript and logging it when the dial completes

## How both legs are transcribed

A nested `transcribe` inside `dial` transcribes both legs by default — the feature server
turns on `separateRecognitionPerChannel` unless you say otherwise. Each transcription hook
payload then carries a `channel_tag`:

| `channel_tag` | Leg | Who is speaking |
|---------------|-----|-----------------|
| `1` | A-leg | the inbound caller |
| `2` | B-leg | the party that was dialed |

Setting `channel: 1` or `channel: 2` on the nested verb narrows transcription to that one
leg and disables per-channel recognition. This example omits `channel` and sets
`separateRecognitionPerChannel: true` explicitly, to make the intent visible.

Note that two recognizers run concurrently, so a transcribed bridge consumes roughly twice
the STT minutes of a single-leg transcription.

## Setup

```bash
npm install
```

## Application Environment Variables

These are declared via `envVars` and are configurable in the jambonz portal.

| Variable       | Default            | Description |
|----------------|--------------------|-------------|
| `DIAL_TARGET`  | `+15551234567`     | Phone number in E.164 format to bridge the caller to |
| `STT_VENDOR`   | `deepgram`         | Speech-to-text vendor used for both legs |
| `STT_LANGUAGE` | `en-US`            | Recognition language |

## Environment Variables

| Variable    | Default | Description |
|-------------|---------|-------------|
| `PORT`      | `3000`  | Port the WebSocket server listens on |
| `LOG_LEVEL` | `info`  | Pino log level (debug, info, warn, error) |

## Running

```bash
npm start
```

Configure your jambonz application to use the WebSocket URL `ws://your-server:3000/`, and
make sure the chosen STT vendor has credentials configured for your account.
