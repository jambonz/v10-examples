# pipeline/dynamic-tools

Pipeline voice agent with mid-conversation tool injection, using Deepgram STT and Cartesia TTS over WebSocket transport.

Demonstrates `pipeline:update` with `update_tools` to add tools to the agent during a live conversation. The agent starts with no tools, and after the second conversational turn, a `web_search` tool is injected along with context informing the agent of its new capability.

Demonstrates:
- `session.updatePipeline()` with `type: 'update_tools'`
- Injecting tools mid-conversation
- Combining `update_tools` with `inject_context` to inform the agent
- Handling dynamically-added tool calls via `toolHook`
- Tavily web search API integration
- Selectable LLM vendor (OpenAI, Anthropic, Google, or Bedrock) via application variables

## Setup

```bash
npm install
```

## Application Variables

Configured in the jambonz portal and passed via `session.data.env_vars`:

| Variable         | Required | Default | Description |
|------------------|----------|---------|-------------|
| `LLM_MODEL`     | No       | `gpt-4.1-mini` | LLM model (OpenAI, Anthropic, Google, or Bedrock) |
| `CARTESIA_VOICE` | No       | `9626c31c-...` | Cartesia voice ID |
| `TAVILY_API_KEY` | Yes      | | Tavily API key for web search |
| `SYSTEM_PROMPT`  | No       | *(provided)* | System prompt for the voice agent |

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

Note: Deepgram, Cartesia, and LLM provider credentials should be configured in the jambonz portal under speech provider settings. A Tavily API key is required and should be set as an application variable.
