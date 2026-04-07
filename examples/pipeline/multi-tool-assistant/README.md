# pipeline/multi-tool-assistant

Pipeline voice agent with five tools powered by [`@jambonz/tools`](https://github.com/jambonz/tools), using Deepgram STT and Cartesia TTS over WebSocket transport.

This example shows how `@jambonz/tools` eliminates the boilerplate of defining tool schemas and writing handler logic. Compare this to the [web-search](../web-search/) or [using-tools](../using-tools/) examples where each tool requires ~40 lines of hand-written schema + fetch + parsing code.

## Tools included

| Tool | What it does | API key? |
|------|-------------|----------|
| **web_search** | Searches the web via Tavily | Yes (Tavily) |
| **get_weather** | Current weather for any location via Open-Meteo | No |
| **wikipedia** | Factual summaries from Wikipedia | No |
| **calculator** | Safe math expression evaluator | No |
| **get_datetime** | Current date/time for any timezone | No |

## How it works

```typescript
import { createTavilySearch, createWeather, createWikipedia, createCalculator, createDateTime, registerTools } from '@jambonz/tools';

// 1. Create the tools
const tools = [
  createTavilySearch({ apiKey: tavilyApiKey }),
  createWeather({ scale: 'fahrenheit' }),
  createWikipedia(),
  createCalculator(),
  createDateTime(),
];

// 2. Pass schemas to the LLM
session.pipeline({
  llm: { llmOptions: { tools: tools.map((t) => t.schema) } },
  toolHook: '/tool-call',
});

// 3. One line wires up all dispatch + execution
registerTools(session, '/tool-call', tools, { logger: log });
```

That's it — no manual schema definitions, no fetch handlers, no result parsing.

## Setup

```bash
npm install
```

## Application Variables

Configured in the jambonz portal and passed via `session.data.env_vars`:

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `LLM_MODEL` | No | `openai:gpt-4.1-mini` | LLM model (OpenAI, Anthropic, Google, or Bedrock) |
| `CARTESIA_VOICE` | No | `9626c31c-...` | Cartesia voice ID |
| `TAVILY_API_KEY` | Yes | | Tavily API key for web search |
| `SYSTEM_PROMPT` | No | *(provided)* | System prompt for the voice agent |
| `TEMPERATURE_SCALE` | No | `fahrenheit` | Temperature unit (celsius or fahrenheit) |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Port the WebSocket server listens on |
| `LOG_LEVEL` | `info` | Pino log level (debug, info, warn, error) |

## Running

```bash
npm start
```

Configure your jambonz application to use the WebSocket URL `ws://your-server:3000/`.

Note: Deepgram, Cartesia, and LLM provider credentials should be configured in the jambonz portal under speech provider settings. A Tavily API key is required and should be set as an application variable.

## Try it out

Some things to ask the voice agent:

- "What's the weather in Tokyo?"
- "What time is it in London?"
- "Tell me about the James Webb Space Telescope"
- "What's 15 percent tip on an 87 dollar bill?"
- "What's happening in the news today?"
