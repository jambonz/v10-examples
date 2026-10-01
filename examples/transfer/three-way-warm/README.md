# transfer/three-way-warm

Three-way warm transfer over WebSocket transport. The caller joins a conference, and the app originates an outbound call (via the jambonz REST API) that brings a specialist into the **same conference** — so the caller and specialist share the room.

Demonstrates:
- The `conference` verb to host the caller
- `JambonzClient.calls.create` (from `@jambonz/sdk/client`) originating an outbound leg into the conference
- A second service path (`/specialist`) that drives the outbound leg (answer → say → join conference)

## Setup

```bash
npm install
```

## Environment Variables

| Variable                     | Default                  | Description |
|------------------------------|--------------------------|-------------|
| `PORT`                       | `3000`                   | Port the WebSocket server listens on |
| `LOG_LEVEL`                  | `info`                   | Pino log level |
| `CONFERENCE_NAME`            | `transfer-demo-room`     | Conference room the caller and specialist join |
| `THREE_WAY_TARGET`           | `+15085551212`           | Specialist phone number (E.164) dialed into the conference |
| `JAMBONZ_REST_API_BASE_URL`  | —                        | Base URL of the jambonz REST API (e.g. `https://api.jambonz.cloud`) |
| `JAMBONZ_ACCOUNT_SID`        | —                        | Account SID that owns the call |
| `JAMBONZ_API_KEY`            | —                        | **Account-scoped** API key (see notes) |
| `PUBLIC_WS_URL`              | `ws://localhost:${PORT}` | Public `ws(s)://` URL of this app, reachable by jambonz |
| `SPEECH_SYNTHESIS_VENDOR`    | `google`                 | TTS vendor for the specialist leg |
| `SPEECH_SYNTHESIS_LANGUAGE`  | `en-US`                  | TTS language |
| `SPEECH_SYNTHESIS_VOICE`     | `en-US-Standard-C`       | TTS voice |
| `SPEECH_RECOGNIZER_VENDOR`   | `google`                 | STT vendor |
| `SPEECH_RECOGNIZER_LANGUAGE` | `en-US`                  | STT language |

If the REST API variables are not set, the caller still joins the conference but the specialist is not dialed in.

## Running

```bash
JAMBONZ_REST_API_BASE_URL=https://api.jambonz.cloud \
JAMBONZ_ACCOUNT_SID=your-account-sid \
JAMBONZ_API_KEY=your-account-scoped-api-key \
PUBLIC_WS_URL=wss://your-public-host \
npm start
```

Configure your jambonz application to use the WebSocket URL `ws://your-server:3000/` (path `/`). The `/specialist` path is driven automatically by the outbound leg.

## Notes

- **Use an account-scoped API key.** `createCall` rejects service-provider / admin keys with `400 unauthorized createCall request`. The key's account must match `JAMBONZ_ACCOUNT_SID`.
- **`JAMBONZ_REST_API_BASE_URL` must be the public API host.** The `api_base_url` in the call webhook payload is an internal address and will `404` from outside the cluster.
- **`PUBLIC_WS_URL` must be reachable by your jambonz server.** For local development, expose the port with a tunnel (e.g. `ngrok http 3000`) and set `PUBLIC_WS_URL` to the tunnel URL.
- **Speech vendor** must be one your account has credentials for, or the specialist leg's `say` will fail.
