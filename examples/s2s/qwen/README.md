# s2s/qwen

Alibaba Qwen Omni-Realtime speech-to-speech voice agent using the `qwen_s2s` verb over WebSocket transport.

Connects the caller to Alibaba's Qwen Omni-Realtime API (the models behind Qwen-Audio-3.0-Realtime: `qwen3.5-omni-plus-realtime`, `qwen3.5-omni-flash-realtime`) for a real-time voice conversation with semantic VAD turn detection. Demonstrates:
- The `qwen_s2s` verb (shortcut for `llm` with `vendor: 'qwen'`)
- DashScope authentication: `apiKey` plus an optional `host` for workspace-scoped or China-region endpoints
- `session_update` configuration (voice, instructions, `semantic_vad` turn detection)
- The `actionHook` callback for session completion

## Setup

```bash
npm install
```

## Application Variables

Configured in the jambonz portal and passed via `session.data.env_vars`:

| Variable            | Default | Description |
|---------------------|---------|-------------|
| `DASHSCOPE_API_KEY` | —       | Alibaba Model Studio (DashScope) API key (required) |
| `DASHSCOPE_HOST`    | `dashscope-intl.aliyuncs.com` | Endpoint host. Use `ws-<workspaceId>.<region>.maas.aliyuncs.com` for a workspace-scoped endpoint (Alibaba-recommended), or `dashscope.aliyuncs.com` for the China (Beijing) region. Note: API keys are region-bound — key and host must belong to the same region. |

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
