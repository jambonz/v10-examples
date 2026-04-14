# agent/using-mcp-server

Voice agent with an MCP server for live football scores, using Deepgram STT and Cartesia TTS over WebSocket transport.

Demonstrates how to connect external MCP servers to an agent. The agent discovers tools from the MCP server at startup and makes them available to the LLM — no inline tool definitions needed. Uses the free [LiveScore MCP server](https://livescoremcp.com/) for real-time football data.

Demonstrates:
- The `mcpServers` property for connecting external tool servers
- Automatic tool discovery from MCP servers
- A sports-focused system prompt that directs the LLM to use tools
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

Note: Deepgram, Cartesia, and LLM provider credentials should be configured in the jambonz portal under speech provider settings. The LiveScore MCP server is free and requires no authentication.
