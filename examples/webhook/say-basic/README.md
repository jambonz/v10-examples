# webhook/say-basic

Basic text-to-speech example using HTTP webhook transport.

This is the webhook equivalent of the [say/basic](../../say/basic) WebSocket example. jambonz sends an HTTP POST to your server when a call arrives, and your server responds with a JSON array of verbs. Demonstrates:
- `WebhookResponse` from `@jambonz/sdk/webhook`
- Express HTTP server handling jambonz webhook POSTs
- The `say` verb with `text` and `loop` properties
- Verb chaining with `pause` and `hangup`
- `res.json(jambonz)` to return the verb array

## Setup

```bash
npm install
```

## Environment Variables

| Variable    | Default | Description |
|-------------|---------|-------------|
| `PORT`      | `3000`  | Port the HTTP server listens on |
| `LOG_LEVEL` | `info`  | Pino log level (debug, info, warn, error) |

## Running

```bash
npm start
```

Configure your jambonz application to use the webhook URL `http://your-server:3000/`.

Note: Unlike WebSocket examples that use `ws://`, webhook examples use `http://` and require your server to be reachable from jambonz. For local development, you may need a tunnel (e.g. ngrok).

## Note on REST API credentials

This simple example only returns verbs in the webhook response and does not need REST API access. More complex webhook applications that perform mid-call control (e.g. muting, call transfer, conference management) will need the following environment variables:

| Variable                    | Description |
|-----------------------------|-------------|
| `JAMBONZ_ACCOUNT_SID`      | Your jambonz account SID |
| `JAMBONZ_API_KEY`           | Your jambonz API key |
| `JAMBONZ_REST_API_BASE_URL` | Base URL of the jambonz REST API (e.g. `https://api.jambonz.cloud`) |

These can be used with `JambonzClient` from `@jambonz/sdk/client`.
