# s2s/voicelive

Azure Voice Live speech-to-speech voice agent using the `s2s` verb over WebSocket transport.

Connects the caller to the [Azure Voice Live API](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/voice-live) for a real-time voice conversation with Azure's semantic VAD and an Azure HD voice. Demonstrates:
- The `s2s` verb with `vendor: 'voicelive'`
- `connectOptions.host` — the Voice Live endpoint is resource-specific (`wss://<resource>.services.ai.azure.com/voice-live/realtime`), so there is no default and the host is required
- `session_update` in Voice Live's **flat** shape — `voice`, `turn_detection` and `modalities` at the top level, not nested under `audio.input`/`audio.output`
- An Azure TTS voice declared as an object (`{name, type: 'azure-standard', temperature}`) rather than an id string
- `azure_semantic_vad` with `remove_filler_words` — Azure-only turn detection that ends a turn on meaning rather than volume
- `azure_deep_noise_suppression` — server-side noise suppression
- `response_create` for an agent-first greeting — also required (the feature-server throws if either key is missing from `llmOptions`)
- API key authentication
- The `actionHook` callback for session completion

> **`vendor: 'voicelive'` is not `vendor: 'microsoft'`.** The `microsoft` vendor targets the older Azure OpenAI Realtime deployment endpoint (`openai/realtime`) and shares its payload shapes with `vendor: 'openai'`. Voice Live is a separate service: it keeps the Realtime *event* vocabulary but uses the flat session shape shown here, and adds Azure Speech voices, semantic VAD, noise suppression, word timestamps and visemes. A `session_update` written for `openai_s2s` will not work here unchanged.

Instead of an API key you can authenticate with Microsoft Entra ID by passing `auth.accessToken` — a token minted for the `https://ai.azure.com/.default` scope, which jambonz sends as an `Authorization: Bearer` header. Entra tokens are short-lived, so mint one per call inside `session:new`.

Audio formats are deliberately left unset — jambonz sends pcm16 at 24 kHz, which matches Voice Live's default `input_audio_sampling_rate`.

Voice Live's text to speech avatar is not supported: it needs a separate WebRTC SDP exchange with the service, which has no place in a SIP call.

## Setup

```bash
npm install
```

## Application Variables

Configured in the jambonz portal and passed via `session.data.env_vars`:

| Variable            | Default | Description |
|---------------------|---------|-------------|
| `VOICELIVE_API_KEY` | —       | Azure Voice Live API key (required) |
| `VOICELIVE_HOST`    | —       | Resource hostname, e.g. `my-resource.services.ai.azure.com` (required) |

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
