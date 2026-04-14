import * as http from 'node:http';
import pino from 'pino';
import { createEndpoint } from '@jambonz/sdk/websocket';

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

const LLM_CHOICES = [
  'openai:gpt-4.1-mini',
  'anthropic:claude-sonnet-4-6',
  'google:gemini-2.5-flash-lite',
  'bedrock:us.meta.llama4-scout-17b-instruct-v1:0',
];

const envVars = {
  LLM_MODEL: {
    type: 'string' as const,
    description: 'LLM vendor and model (vendor:model)',
    enum: LLM_CHOICES,
    default: 'openai:gpt-4.1-mini',
  },
  CARTESIA_VOICE: {
    type: 'string' as const,
    description: 'Cartesia voice ID',
    default: '9626c31c-bec5-4cca-baa8-f8ba9e84c8bc',
  },
  TAVILY_API_KEY: {
    type: 'string' as const,
    description: 'Tavily API key for web search',
    required: true,
    obscure: true,
  },
  SYSTEM_PROMPT: {
    type: 'string' as const,
    description: 'System prompt for the voice agent',
    uiHint: 'textarea' as const,
    default: [
      'You are a helpful voice AI assistant with web search capabilities.',
      'The user is interacting with you via voice,',
      'even if you perceive the conversation as text.',
      'You can search the web for current information using the web_search tool.',
      'When asked about recent events, news, or anything that may require up-to-date data,',
      'use the web_search tool to find accurate information.',
      'Your responses are concise, to the point,',
      'and use natural spoken English with proper punctuation.',
      'Never use markdown, bullet points, numbered lists,',
      'emojis, asterisks, or any special formatting.',
      'You are curious, friendly, and have a sense of humor.',
      'When the conversation begins,',
      'greet the user and let them know you can search the web.',
    ].join(' '),
  },
  NOISE_ISOLATION: {
    type: 'string' as const,
    description: 'Noise isolation mode (off, krisp, or rnnoise)',
    enum: ['off', 'krisp', 'rnnoise'],
    default: 'off',
  },
  EARLY_GENERATION: {
    type: 'string' as const,
    description: 'Enable speculative LLM preflight for lower latency',
    enum: ['on', 'off'],
    default: 'on',
  },
};

const webSearchTool = {
  name: 'web_search',
  description: 'Search the web for current information on a given topic.',
  parameters: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'The search query',
      },
    },
    required: ['query'],
  },
};

const port = parseInt(process.env.PORT || '3000', 10);
const server = http.createServer();
const makeService = createEndpoint({ server, port, envVars });

const svc = makeService({ path: '/' });
svc.on('session:new', (session) => {
  const log = logger.child({ call_sid: session.callSid });
  const llmChoice = session.data.env_vars?.LLM_MODEL || envVars.LLM_MODEL.default;
  const colonIdx = llmChoice.indexOf(':');
  const llmVendor = llmChoice.slice(0, colonIdx);
  const model = llmChoice.slice(colonIdx + 1);

  const voice = session.data.env_vars?.CARTESIA_VOICE || envVars.CARTESIA_VOICE.default;
  const systemPrompt = session.data.env_vars?.SYSTEM_PROMPT || envVars.SYSTEM_PROMPT.default;
  const tavilyApiKey = session.data.env_vars?.TAVILY_API_KEY;
  const noiseIsolation = (session.data.env_vars?.NOISE_ISOLATION
    || envVars.NOISE_ISOLATION.default) as 'krisp' | 'rnnoise' | 'off';
  const earlyGeneration = (session.data.env_vars?.EARLY_GENERATION || envVars.EARLY_GENERATION.default) === 'on';

  session.on('/agent-event', (evt: Record<string, unknown>) => {
    log.info({ payload: evt }, `agent event: ${evt.type}`);
  });

  session.on('/tool-call', async(evt: Record<string, unknown>) => {
    const { tool_call_id, name, arguments: args } = evt as {
      tool_call_id: string;
      name: string;
      arguments: Record<string, string>;
    };
    log.info({ name, args }, 'tool call');

    if (name !== 'web_search') {
      session.sendToolOutput(tool_call_id, `Unknown tool: ${name}`);
      return;
    }

    try {
      const res = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: tavilyApiKey,
          query: args.query,
          max_results: 3,
          search_depth: 'basic',
        }),
      });
      const data = await res.json() as {
        results?: { title: string; content: string }[];
      };
      const results = (data.results || [])
        .map((r) => `${r.title}: ${r.content}`)
        .join('\n');

      session.sendToolOutput(tool_call_id, results || 'No results found.');
    } catch (err) {
      log.error(err, 'web search failed');
      session.sendToolOutput(tool_call_id, `Error performing web search: ${err}`);
    }
  });

  session.on('/agent-complete', (evt: Record<string, unknown>) => {
    log.info({ payload: evt }, 'agent completed');
    session.hangup().reply();
  });

  session
    .agent({
      stt: {
        vendor: 'deepgram',
        language: 'multi',
        deepgramOptions: { model: 'nova-3-general' },
      },
      tts: {
        vendor: 'cartesia',
        voice,
      },
      llm: {
        vendor: llmVendor,
        model,
        llmOptions: {
          messages: [
            { role: 'system', content: systemPrompt },
          ],
          tools: [webSearchTool],
        },
      },
      toolHook: '/tool-call',
      bargeIn: { enable: true },
      turnDetection: 'krisp',
      earlyGeneration,
      ...noiseIsolation !== 'off' && { noiseIsolation },
      eventHook: '/agent-event',
      actionHook: '/agent-complete',
    })
    .send();
});

logger.info({ port }, 'jambonz agent/web-search listening');
