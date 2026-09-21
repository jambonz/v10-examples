# s2s/voicelive

Azure Voice Live speech-to-speech voice agent using the `s2s` verb over WebSocket transport.

Connects the caller to the [Azure Voice Live API](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/voice-live) for a real-time voice conversation with Azure's semantic VAD and an Azure HD voice. Demonstrates:
- The `s2s` verb with `vendor: 'voicelive'`, in either mode: `gpt-realtime-2.1` (native speech-to-speech) or a text model such as `gpt-4.1` (cascaded — Azure STT feeds the LLM, Azure TTS speaks the reply)
- `connectOptions.host` — the Voice Live endpoint is resource-specific (`wss://<resource>.services.ai.azure.com/voice-live/realtime`), so there is no default and the host is required
- `session_update` in Voice Live's **flat** shape — `voice`, `turn_detection` and `modalities` at the top level, not nested under `audio.input`/`audio.output`
- An Azure TTS voice declared as an object (`{name, type: 'azure-standard', temperature}`) rather than an id string
- `azure_semantic_vad` with `remove_filler_words` — Azure-only turn detection that ends a turn on meaning rather than volume
- `azure_deep_noise_suppression` — server-side noise suppression
- `input_audio_transcription` — set explicitly, because Azure speech to text is automatic only for non-multimodal models; with `gpt-realtime-2.1` you get no caller transcripts without it
- `response_create` for an agent-first greeting — also required (the feature-server throws if either key is missing from `llmOptions`)
- API key authentication
- The `actionHook` callback for session completion

> **`vendor: 'voicelive'` is not `vendor: 'microsoft'`.** The `microsoft` vendor targets the older Azure OpenAI Realtime deployment endpoint (`openai/realtime`) and shares its payload shapes with `vendor: 'openai'`. Voice Live is a separate service: it keeps the Realtime *event* vocabulary but uses the flat session shape shown here, and adds Azure Speech voices, semantic VAD, noise suppression, word timestamps and visemes. A `session_update` written for `openai_s2s` will not work here unchanged.

Instead of an API key you can authenticate with Microsoft Entra ID by passing `auth.accessToken` — a token minted for the `https://ai.azure.com/.default` scope, which jambonz sends as an `Authorization: Bearer` header. Entra tokens are short-lived, so mint one per call inside `session:new`.

Audio formats are deliberately left unset — jambonz sends pcm16 at 24 kHz, which matches Voice Live's default `input_audio_sampling_rate`.

Voice Live's text to speech avatar is not supported: it needs a separate WebRTC SDP exchange with the service, which has no place in a SIP call.

## Your Azure resource must be a Foundry resource

`VOICELIVE_HOST` is the hostname of the **Keys and Endpoint** value on your resource — for example `https://my-resource.services.ai.azure.com/` becomes `my-resource.services.ai.azure.com`. You do not build this name yourself.

Only a **Microsoft Foundry** resource (`kind=AIServices`, SKU `S0`) has an endpoint like that. A plain Speech resource's endpoint is the shared regional gateway `https://<region>.api.cognitive.microsoft.com/`, which every customer in the region shares; Voice Live cannot tell which resource a request belongs to from it and answers `401 ... use a correct regional API endpoint for your resource`. Changing the URL will not fix it — the per-resource hostname does not exist in DNS until the resource is created with one.

```bash
az cognitiveservices account create \
  --name my-resource --resource-group my-group \
  --kind AIServices --sku S0 --location eastus --yes
```

Voice Live is fully managed, so there is no model to deploy.

## Setup

```bash
npm install
```

## Application Variables

Configured in the jambonz portal and passed via `session.data.env_vars`:

| Variable            | Default | Description |
|---------------------|---------|-------------|
| `VOICELIVE_API_KEY` | —       | Azure Voice Live API key (required) |
| `VOICELIVE_HOST`    | —       | Resource hostname, e.g. `my-resource.services.ai.azure.com` — no `https://`, no trailing `/` (required) |
| `VOICELIVE_MODEL`   | `gpt-realtime-2.1` | `gpt-realtime-2.1` for native speech-to-speech, or a text model such as `gpt-4.1` to run cascaded |

## Environment Variables

| Variable    | Default | Description |
|-------------|---------|-------------|
| `PORT`      | `3000`  | Port the WebSocket server listens on |
| `LOG_LEVEL` | `info`  | Pino log level (debug, info, warn, error) |

## Choosing a mode

Both modes are worth trying, and they fail differently:

- **`gpt-realtime-2.1`** — the model generates audio itself. Lowest latency, closest to the OpenAI Realtime experience.
- **`gpt-4.1`** (or another text model) — cascaded. Azure speech to text transcribes the caller, the text model answers, and the `voice` configured above speaks it. This is where Voice Live differs most from every other s2s vendor, and it exercises the Azure-specific session settings hardest: if `voice` or `input_audio_transcription` did not reach the service, there is no audio at all.

## Running

```bash
npm start
```

Configure your jambonz application to use the WebSocket URL `ws://your-server:3000/`.
