# s2s/gptlive

OpenAI **GPT Live** (limited-access alpha) speech-to-speech voice agent using the `s2s` verb over WebSocket transport.

Connects the caller to OpenAI's GPT Live API for a real-time voice conversation, and demonstrates the feature that makes this vendor different from every other s2s integration: **delegation**.

> **GPT Live is not the OpenAI Realtime API.** Despite both living at `api.openai.com`, they are different wire protocols, and this example is not interchangeable with [`s2s/openai`](../openai). Access requires enrollment in OpenAI's Early Access Program — a key that is not enrolled completes the websocket handshake and is then refused with `Voice session access denied`, which arrives on the `actionHook` as `completionReason: 'server error'`.

## What this example shows

- The `s2s` verb with `vendor: 'gptlive'`
- **No `response_create`** — GPT Live has no `response.create` client event. The model starts and drives the conversation itself once the session is started, so `llmOptions` carries only `session_update`. (The `openai` and `xai` examples require both; here a `response_create` would be meaningless.)
- `model` on the **verb**, not inside `session_update` — it rides in the connection URL, and the feature-server rejects the verb if you repeat it in the session object
- **Both delegation modes**, switchable with the `DELEGATION_MODE` application variable:
  - `responses` (default) — the model runs a Responses API turn that can call functions. Declares a real `get_weather` tool and answers it from [Open-Meteo](https://open-meteo.com).
  - `client` — the model asks *this application* for free-form text context instead, which we supply with a `delegation.context.append`.
- The GPT Live tool-result envelope — `delegation.function_call_output.create`, **not** the Realtime API's `conversation.item.create`
- `turn.done` events as the readable "who said what" view of the conversation
- API key authentication and the `actionHook` completion callback

Audio format is fixed by the API at 24 kHz mono PCM16 and is not configurable; jambonz resamples to and from the call's codec automatically.

## Delegation, in one page

Everything the model wants from outside the audio conversation arrives as a *delegation*, and the two modes are wired differently.

### `responses` — function calling

The nested `responses` object is **required**, and its `model` is **mandatory** — it is the model the delegated turn runs on, separate from the GPT Live voice model in the URL. Tools go **inside** it:

```js
llmOptions: {
  session_update: {
    instructions: SYSTEM_PROMPT,
    audio: { output: { voice: 'marin' } },
    delegation: {
      type: 'responses',
      responses: {
        model: 'gpt-5.5',                // required
        tools: [ /* flat Responses shape */ ]
      }
    }
  }
}
```

A common mistake is putting tools at `delegation.tools`; the server rejects that with `Missing required parameter: 'delegation.responses'` (and an empty `responses` object with `'delegation.responses.model'`).

Function calls arrive on `toolHook` as `{tool_call_id, name, args}`. Return the result in GPT Live's own envelope, echoing the `call_id`:

```js
session.sendToolOutput(tool_call_id, {
  type: 'delegation.function_call_output.create',
  item: { type: 'function_call_output', call_id: tool_call_id, output: 'It is 62 degrees and raining.' }
});
```

There is no follow-on `response.create` to send — the server resumes the delegation itself. Parallel calls need one result event each.

Tools are the only mode in which jambonz's built-in [`handoff`](../../handoff) and `hangup` tools work, since they need a function-calling channel; configuring either without a `responses` delegation (with a `model`) is rejected when the verb runs.

### `client` — text context

The model emits `delegation.created` with `item.target === 'client'`, asking for context in prose. Answer it on the `eventHook` with the item's id:

```js
session.updateLlm({
  type: 'delegation.context.append',
  delegation_item_id: item.id,
  content: [{ type: 'input_text', text: 'The caller is on the Unlimited plan.' }]
});
```

One `input_text` part, up to 500 tokens. There is no function calling at all in this mode.

## Getting the agent to speak first

GPT Live has no `response_create`, so nothing forces a first turn — and putting the
greeting in `instructions` alone does **not** work. Measured against the alpha:

| approach | agent opened the call |
|---|---|
| greeting in `instructions` only | **0/5** |
| `session.context.append` on `session.started` | **5/5** |

When the model stays quiet it does not send nothing — it streams `output_audio.delta`
frames of **digital silence**, so the caller hears dead air and the media server still
reports playing audio. Per OpenAI's prompting guide, ask for the greeting with
`session.context.append`, supplying the intended wording and saying when to speak:

```js
session.on('/s2s-event', (evt) => {
  if (evt.type === 'session.started') {
    session.updateLlm({
      type: 'session.context.append',
      content: [{
        type: 'input_text',
        text: 'Immediately greet the caller using the exact text below. Do not wait for the '
          + 'caller to speak first. After the greeting, pause and listen.\n\n'
          + 'Hi, I am the Jambonz Mobile assistant. How can I help you today?',
      }],
    });
  }
});
```

This example does that with the `GREETING` application variable. Note OpenAI's own
caveat: a context append **guides** the model, it is not a playback command — it may
paraphrase, or occasionally stay silent. **If exact wording is a hard requirement, say
it with a `say` verb before the `llm` verb** and let jambonz TTS play it.

## Setup

```bash
npm install
```

## Application Variables

Configured in the jambonz portal and passed via `session.data.env_vars`:

| Variable           | Default                    | Description |
|--------------------|----------------------------|-------------|
| `GPTLIVE_API_KEY`  | —                          | OpenAI API key enrolled in the GPT Live Early Access Program (required) |
| `GPTLIVE_MODEL`    | `gpt-live-1-boulder-alpha` | GPT Live voice model; rides in the connection URL |
| `DELEGATION_MODE`  | `responses`                | `responses` (function calling) or `client` (text context) |
| `DELEGATION_MODEL` | `gpt-5.5`                  | Responses-side model for delegated turns; only used when `DELEGATION_MODE=responses` |
| `VOICE`            | `marin`                    | GPT Live output voice |
| `GREETING`         | `Hi, I am the Jambonz Mobile assistant…` | Exact wording the agent opens the call with |

## Environment Variables

| Variable    | Default | Description |
|-------------|---------|-------------|
| `PORT`      | `3000`  | Port the WebSocket server listens on |
| `LOG_LEVEL` | `info`  | Pino log level (debug, info, warn, error) |

Set `LOG_LEVEL=debug` to see the full GPT Live server event stream (transcripts, usage, `response.*`); at `info` only conversation turns are logged.

## Running

```bash
npm start
```

Configure your jambonz application to use the WebSocket URL `ws://your-server:3000/`.

Then call in and try:
- *"What's the weather in Chicago?"* — in `responses` mode this triggers the tool round trip
- with `DELEGATION_MODE=client`, ask something about the caller's account and watch the `delegation.created` / `delegation.context.append` exchange in the logs
