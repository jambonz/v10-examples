# transcribe/realtime-translator

Real-time call translation using Microsoft STT, Google Translate, and Microsoft TTS over WebSocket transport.

Prompts the caller to enter a phone number, then bridges the call with bidirectional real-time translation. Each party hears the other's speech translated into their own language via dub tracks. Demonstrates:
- DTMF digit collection for the destination number
- Nested `transcribe` on the A-leg via `config`
- Nested `transcribe` and `dub` on the B-leg via `dial`
- `injectCommand('dub', ...)` to speak translated text on dub tracks
- Google Translate v2 API integration
- Microsoft STT and TTS with configurable languages and voices
- Google service account JSON key uploaded via `filepicker` envVar

## How it works

1. Caller dials in and enters a phone number via DTMF
2. A-leg gets Microsoft STT transcription + a dub track
3. B-leg is dialed with its own STT transcription + dub track
4. When A speaks, the transcript is translated and spoken on B's dub track
5. When B speaks, the transcript is translated and spoken on A's dub track
6. Remote audio is attenuated (-20 dB) so the dub translation is prominent

## Setup

```bash
npm install
```

## Application Variables

Configured in the jambonz portal and passed via `session.data.env_vars`:

| Variable           | Required | Default | Description |
|--------------------|----------|---------|-------------|
| `CALLER_LANGUAGE`  | No       | `en-US` | Caller's language (BCP-47) |
| `CALLER_TTS_VOICE` | No       | `en-US-JennyNeural` | Microsoft TTS voice for caller |
| `CALLED_LANGUAGE`  | No       | `es-ES` | Called party's language (BCP-47) |
| `CALLED_TTS_VOICE` | No       | `es-ES-ElviraNeural` | Microsoft TTS voice for called party |
| `GOOGLE_JSON_KEY`  | Yes      | —       | Google service account JSON key (file upload) |

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

Note: Microsoft speech credentials should be configured in the jambonz portal under speech provider settings.
