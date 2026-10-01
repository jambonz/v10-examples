# dialogflow/airline-tools

Voice conversation with a Google Dialogflow CX (Playbook) agent, including the
client-side **tool-call round trip**: the agent requests a tool, jambonz POSTs
it to this app's `toolHook`, the app returns `{outputParameters}`, and the
agent resumes speaking. Demonstrates:

- The `dialogflow` verb (model `cx`) with inline service-account `credentials`
- `toolHook` — answering agent-requested client-side tools (`getGeolocation`, `getFlights`)
- `eventHook` events: `transcription`, `intent`, `tool-calls`, `start-play`, `stop-play`
- Greeting-first via a `say` before the verb (or the agent's own `welcomeEvent` when it defines one)

The example is built around Google's **Airline Support** prebuilt agent, whose
two Function tools have no backend by design — the client invents the results,
so the flight data is fictional.

## Setup

```bash
npm install
```

## Environment Variables

| Variable                   | Default                          | Description |
|----------------------------|----------------------------------|-------------|
| `DIALOGFLOW_KEYFILE`       | — (required)                     | Path to a Google service-account JSON key |
| `DIALOGFLOW_PROJECT`       | `project_id` from the key        | GCP project id |
| `DIALOGFLOW_AGENT`         | the Airline Support test agent   | CX agent id (uuid) |
| `DIALOGFLOW_REGION`        | `us-central1`                    | GCP region (regional API host is mandatory) |
| `DIALOGFLOW_MODEL`         | `cx`                             | `es` \| `cx` \| `ces` |
| `DIALOGFLOW_LANG`          | `en-US`                          | Language code |
| `DIALOGFLOW_GREETING`      | `Hi! How can I help you today?`  | Spoken by jambonz before the verb starts; `""` disables |
| `DIALOGFLOW_WELCOME_EVENT` | unset                            | If your agent defines a welcome event handler, its name — the agent then greets itself and the say-greeting is skipped |
| `PORT`                     | `3000`                           | WebSocket server port |
| `LOG_LEVEL`                | `info`                           | Pino log level |

## Running

```bash
DIALOGFLOW_KEYFILE=/path/to/key.json npm start
```

Configure your jambonz application to use the WebSocket URL
`ws://your-server:3000/dialogflow`, call in, and say **"hi, I need a flight"** —
that phrase reliably drives the agent into its `getGeolocation` tool call.
Then give a destination and date to trigger `getFlights`, pick a flight, and
get a booking confirmation.

## Notes

- Playbook agents typically define **no named welcome event** — sending one
  gets a Google "No handler is defined for the event" error. Leave
  `DIALOGFLOW_WELCOME_EVENT` unset unless your agent has one.
- The `toolHook` response is raw JSON (`{outputParameters}` or `{error}`),
  not a verb array, so the app acks it directly on the WebSocket.
- Requires jambonz with dialogflow tool-call support (feature-server
  `toolHook` + mediajam `toolResult`).
