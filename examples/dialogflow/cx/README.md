# dialogflow/cx

Connects a caller to a Google [Dialogflow CX](https://cloud.google.com/dialogflow/cx/docs) virtual agent over WebSocket transport.

The `dialogflow` verb runs the entire multi-turn conversation natively in the feature-server: it streams caller audio to Dialogflow, plays the agent's responses back, and handles barge-in, no-input, and DTMF. Your application simply observes the conversation through the `eventHook` and decides when to take over.

Demonstrates:
- Driving a Dialogflow CX agent with `session.dialogflow({ model: 'cx', ... })`
- Supplying Google service-account credentials and CX agent/environment/region via application variables
- Subscribing to in-conversation events (`intent`, `transcription`, `dtmf`, `no-input`, `start-play`, `stop-play`) via `eventHook`
- Breaking out of the agent to transfer the caller to a PSTN number when a fulfillment custom payload `{ transfer: { number } }` is detected
- Ending the call on the `actionHook` when the Dialogflow session completes

## Setup

```bash
npm install
```

## Application Variables

Configured in the jambonz portal and passed via `session.data.env_vars`:

| Variable                 | Required | Default       | Description |
|--------------------------|----------|---------------|-------------|
| `GCP_PROJECT_ID`         | Yes      | —             | Google Cloud project ID hosting the agent |
| `DIALOGFLOW_AGENT_ID`    | Yes      | —             | Dialogflow CX agent ID (UUID) |
| `DIALOGFLOW_ENVIRONMENT` | No       | *(draft)*     | CX environment; omit to use the draft environment |
| `GCP_REGION`             | No       | `us-central1` | Google Cloud region for the API endpoint |
| `LANGUAGE_CODE`          | No       | `en-US`       | BCP-47 language code passed to Dialogflow |
| `WELCOME_EVENT`          | No       | `WELCOME`     | Dialogflow event fired at the start of the conversation |
| `GCP_CREDENTIALS`        | Yes      | —             | Service-account JSON key file contents (stored obscured) |

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

### Transferring the caller from the agent

To hand a caller off to a human, attach a custom payload to a fulfillment response in your Dialogflow CX agent:

```json
{ "transfer": { "number": "+15551234567" } }
```

When the `eventHook` sees this payload it replaces the agent with a `dial` verb to that number.

Note: Google service-account credentials are supplied as the `GCP_CREDENTIALS` application variable (the full JSON key file). Speech (STT/TTS) for the conversation is handled by the Dialogflow CX agent itself; no separate speech-provider configuration is required for this example.
