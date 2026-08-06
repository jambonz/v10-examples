# transcribe / gpt-live-transcribe

Real-time call transcription using OpenAI's `gpt-live-transcribe` model.

## What it shows

- Using a **client-endpointed** OpenAI STT model: `gpt-live-transcribe` (like
  `gpt-realtime-whisper`) rejects OpenAI's server-side `turn_detection`, so
  jambonz detects the end of each utterance with a local VAD on the media
  server and tells OpenAI when to finalize. The `vadSilenceMs` / `vadVoiceMs`
  (and `vadMode`) options tune that detector.
- The fields only this model accepts:
  - `keywords` — literal term hints (product names, acronyms); defaults to the
    recognizer's `hints` when unset
  - `delay` — latency/accuracy trade-off (`minimal` | `low` | `medium` |
    `high` | `xhigh`)
  - `languages` — language hints as a list, replacing the singular `language`
- Interim deltas (`is_final: false`) while the caller is speaking, one final
  transcript per utterance once the local VAD detects silence.

## Requirements

- A jambonz system running the mediajam media server with `gpt-live-transcribe`
  support (mediajam ≥ the jambonz/mediajam#89 merge) and the matching
  feature-server option mapping (jambonz/feature-server#157)
- An OpenAI speech credential configured in the jambonz portal (or pass
  `apiKey` in `openaiOptions`)

## Environment variables

| var | description | default |
|---|---|---|
| `PORT` | HTTP/WebSocket listen port | `3000` |
| `LOG_LEVEL` | pino log level (`debug` shows interim transcripts) | `info` |

## Run

```bash
npm install   # from the repo root (npm workspaces)
cd examples/transcribe/gpt-live-transcribe
npm start
```

Point a jambonz application at `ws://<your-host>:3000/` and place a call;
final transcripts log at info, interims at debug.
