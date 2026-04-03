import * as http from 'node:http';
import pino from 'pino';
import { createEndpoint } from '@jambonz/sdk/websocket';

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

const LLM_CHOICES = [
  'openai:gpt-4.1-mini',
  'anthropic:claude-sonnet-4-6',
  'google:gemini-2.5-flash-lite-preview-06-17',
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
  SYSTEM_PROMPT: {
    type: 'string' as const,
    description: 'System prompt for the voice agent',
    uiHint: 'textarea' as const,
    default: [
      'You are a friendly sports assistant.',
      'You have access to tools that provide live football scores,',
      'fixtures, standings, and team information.',
      'When the user asks about matches, scores, or teams,',
      'use the available tools to look up real-time data.',
      'Do not guess or make up scores — always use the tools.',
      'Your responses are concise and conversational.',
      'Never use markdown, bullet points, numbered lists,',
      'emojis, asterisks, or any special formatting.',
      'When the conversation begins,',
      'greet the user and let them know you can help',
      'with live football scores and fixtures.',
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

const port = parseInt(process.env.PORT || '3000', 10);
const server = http.createServer();
const makeService = createEndpoint({ server, port, envVars });

const svc = makeService({ path: '/' });
svc.on('session:new', (session) => {
  const log = logger.child({ call_sid: session.callSid });
  const llmChoice = session.data.env_vars?.LLM_MODEL || envVars.LLM_MODEL.default;
  const [llmVendor, model] = llmChoice.split(':');

  const voice = session.data.env_vars?.CARTESIA_VOICE || envVars.CARTESIA_VOICE.default;
  const systemPrompt = session.data.env_vars?.SYSTEM_PROMPT || envVars.SYSTEM_PROMPT.default;
  const noiseIsolation = (session.data.env_vars?.NOISE_ISOLATION
    || envVars.NOISE_ISOLATION.default) as 'krisp' | 'rnnoise' | 'off';
  const earlyGeneration = (session.data.env_vars?.EARLY_GENERATION || envVars.EARLY_GENERATION.default) === 'on';

  session.on('/pipeline-event', (evt: Record<string, unknown>) => {
    log.info({ payload: evt }, `pipeline event: ${evt.type}`);
  });

  session.on('/pipeline-complete', (evt: Record<string, unknown>) => {
    log.info({ payload: evt }, 'pipeline completed');
    session.hangup().reply();
  });

  session
    .pipeline({
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
        },
      },
      mcpServers: [
        { url: 'https://livescoremcp.com/sse' },
      ],
      bargeIn: { enable: true },
      turnDetection: 'krisp',
      earlyGeneration,
      ...noiseIsolation !== 'off' && { noiseIsolation },
      eventHook: '/pipeline-event',
      actionHook: '/pipeline-complete',
    })
    .send();
});

logger.info({ port }, 'jambonz pipeline/using-mcp-server listening');
