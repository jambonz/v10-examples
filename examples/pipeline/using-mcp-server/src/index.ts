import * as http from 'node:http';
import pino from 'pino';
import { createEndpoint } from '@jambonz/sdk/websocket';

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

const envVars = {
  LLM_MODEL: {
    type: 'string' as const,
    description: 'LLM model to use',
    enum: [
      'gpt-5.4-mini', 'gpt-5.4-nano', 'gpt-5.4', 'gpt-4.1-mini', 'gpt-4.1',
      'claude-sonnet-4-6', 'claude-haiku-4-5-20251001', 'claude-opus-4-6',
    ],
    default: 'gpt-5.4-mini',
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
};

const port = parseInt(process.env.PORT || '3000', 10);
const server = http.createServer();
const makeService = createEndpoint({ server, port, envVars });

const svc = makeService({ path: '/' });
svc.on('session:new', (session) => {
  const log = logger.child({ call_sid: session.callSid });
  const model = session.data.env_vars?.LLM_MODEL || envVars.LLM_MODEL.default;
  const llmVendor = model.startsWith('claude') ? 'anthropic' : 'openai';
  const voice = session.data.env_vars?.CARTESIA_VOICE || envVars.CARTESIA_VOICE.default;
  const systemPrompt = session.data.env_vars?.SYSTEM_PROMPT || envVars.SYSTEM_PROMPT.default;

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
      turnDetection: 'krisp',
      earlyGeneration: true,
      eventHook: '/pipeline-event',
      actionHook: '/pipeline-complete',
    })
    .send();
});

logger.info({ port }, 'jambonz pipeline/using-mcp-server listening');
