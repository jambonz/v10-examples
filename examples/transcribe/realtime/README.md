# transcribe/realtime

Real-time call transcription example using the `transcribe` verb over WebSocket transport.

Transcribes the call in real time using Deepgram and logs final transcripts. Demonstrates:
- The `transcribe` verb with a `transcriptionHook` callback
- Deepgram STT configuration via `recognizer`
- Interim and final transcript handling

## Setup

```bash
npm install
```

## Environment Variables

| Variable    | Default | Description |
|-------------|---------|-------------|
| `PORT`      | `3000`  | Port the WebSocket server listens on |
| `LOG_LEVEL` | `info`  | Pino log level (debug, info, warn, error) |

## Running

```bash
npm start
```

Configure your jambonz application to use the WebSocket URL `ws://your-server:3000/`.

Note: Deepgram credentials should be configured in the jambonz portal under speech provider settings.
