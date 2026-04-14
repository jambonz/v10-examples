# jambonz Examples

A collection of TypeScript example applications demonstrating the [jambonz](https://jambonz.org) voice platform using the [@jambonz/sdk](https://www.npmjs.com/package/@jambonz/sdk).

## Prerequisites

- Node.js 22+
- A jambonz instance (v10+)
- Speech provider credentials configured in the jambonz portal (as needed per example)

## Building and Running

This is an npm workspaces monorepo. Install all dependencies from the root:

```bash
npm install
```

Each example runs directly from TypeScript using `tsx` — there is no build step. To run an example:

```bash
# From the root
npx tsx examples/say/basic/src/index.ts

# Or from within an example directory
cd examples/say/basic
npm start
```

By default, examples listen on port 3000. Override with the `PORT` environment variable:

```bash
PORT=8080 npm start
```

Most examples also support `LOG_LEVEL` (default `info`) for controlling pino log verbosity.

### Configuring in jambonz

1. Start the example application
2. In the jambonz portal, create or edit an application
3. Set the application URL to `ws://your-server:3000/`
4. If the example declares `envVars`, the portal will auto-discover configurable settings via an OPTIONS request — fill them in as needed
5. Assign the application to a phone number and make a test call

### Linting

```bash
# Lint all examples
npm run lint

# Lint with auto-fix
npm run lint:fix
```

## Examples

### Basic Verbs

| Category | Example | Description |
|----------|---------|-------------|
| say | [basic](./examples/say/basic) | Text-to-speech with `loop` and verb chaining |
| gather | [dtmf-menu](./examples/gather/dtmf-menu) | IVR menu with single-digit DTMF routing |
| gather | [echo](./examples/gather/echo) | Speech recognition that echoes back with confidence scores |
| dial | [outbound](./examples/dial/outbound) | Collect phone number via DTMF, then dial it |
| conference | [basic](./examples/conference/basic) | Named conference room with join/leave beeps and status events |
| listen | [audio-stream](./examples/listen/audio-stream) | Stream call audio to an external WebSocket server |
| transcribe | [realtime](./examples/transcribe/realtime) | Live call transcription using Deepgram |
| transcribe | [realtime-translator](./examples/transcribe/realtime-translator) | Bidirectional real-time translation using Microsoft STT, Google Translate, and dub tracks |

### Speech-to-Speech (S2S)

Each S2S example connects the caller directly to a real-time voice model using the `s2s` verb. The LLM vendor is set via the `vendor` property.

| Example | Vendor | Description |
|---------|--------|-------------|
| [gemini](./examples/s2s/gemini) | Google | Gemini 3.1 Flash Live |
| [openai](./examples/s2s/openai) | OpenAI | Realtime API with server VAD and Whisper transcription |
| [deepgram](./examples/s2s/deepgram) | Deepgram | Voice Agent with Nova-3 STT and GPT-4o-mini |
| [elevenlabs](./examples/s2s/elevenlabs) | ElevenLabs | Conversational AI (agent configured in ElevenLabs dashboard) |
| [ultravox](./examples/s2s/ultravox) | Ultravox | Ultravox voice agent |

### Agent (STT + LLM + TTS)

Agent examples use the `agent` verb to compose separate STT, LLM, and TTS providers. The LLM vendor and model are selectable via application variables — choose from OpenAI or Anthropic models in a portal dropdown.

| Example | STT | TTS | Notes |
|---------|-----|-----|-------|
| [deepgram-cartesia](./examples/agent/deepgram-cartesia) | Deepgram Nova-3 | Cartesia | Krisp turn detection, early generation |
| [deepgramflux-elevenlabs](./examples/agent/deepgramflux-elevenlabs) | Deepgram Flux | ElevenLabs Flash v2.5 | Native STT turn detection |
| [speechmatics-rime](./examples/agent/speechmatics-rime) | Speechmatics | Rime | Native STT turn detection |
| [using-tools](./examples/agent/using-tools) | Deepgram Nova-3 | Cartesia | Tool calling with `get_weather` via `toolHook` |
| [using-mcp-server](./examples/agent/using-mcp-server) | Deepgram Nova-3 | Cartesia | External MCP server for live football scores |

### Webhook

| Example | Description |
|---------|-------------|
| [say-basic](./examples/webhook/say-basic) | Basic text-to-speech using HTTP webhook transport |

### REST API

Runnable scripts that demonstrate the jambonz REST API (not call-handling servers).

| Example | Description |
|---------|-------------|
| [create-call](./examples/rest-api/create-call) | Create an outbound call using `JambonzClient` (includes curl equivalent) |

## License

MIT
