# pipeline/web-search

Pipeline voice agent with Tavily web search, using Deepgram STT and Cartesia TTS over WebSocket transport.

Demonstrates dynamic tool calling with a `web_search` tool that queries the Tavily REST API for current information.

Demonstrates:
- Defining a custom tool (`web_search`) in `llmOptions.tools`
- Handling tool calls via `toolHook` with async HTTP requests
- Returning tool results with `session.sendToolOutput()`
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
