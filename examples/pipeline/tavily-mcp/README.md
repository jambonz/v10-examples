# pipeline/tavily-mcp

Pipeline voice agent with Tavily web search via MCP server, using Deepgram STT and Cartesia TTS over WebSocket transport.

Demonstrates external MCP server usage with Tavily's remote MCP endpoint. The pipeline discovers search tools from the MCP server automatically -- no inline tool definitions or toolHook needed.

Demonstrates:
- The `mcpServers` property for connecting to a remote MCP server
- Automatic tool discovery from the Tavily MCP endpoint
- Passing API credentials via MCP server URL parameters
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
