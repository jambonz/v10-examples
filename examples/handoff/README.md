# handoff

Layer-1 transfer-to-human on conversational verbs. A declarative `handoff` block
auto-injects a `transfer_to_human` tool; when the model calls it, jambonz runs the
packaged transfer choreography internally.

| Example | Description |
|---------|-------------|
| [agent](./agent) | Handoff on the cascaded `agent` verb (Deepgram STT/TTS + OpenAI LLM) |
| [llm](./llm) | Handoff on the realtime `llm` verb (OpenAI gpt-realtime / s2s) |

See also [transfer](../transfer) for the standalone `transfer` verb and Live Call
Control transfers.
