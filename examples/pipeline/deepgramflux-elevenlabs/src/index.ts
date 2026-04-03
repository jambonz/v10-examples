import * as http from 'node:http';
import pino from 'pino';
import { createEndpoint } from '@jambonz/sdk/websocket';

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

const envVars = {
  LLM_MODEL: {
    type: 'string' as const,
    description: 'LLM model to use',
    enum: [
      'claude-sonnet-4-6', 'claude-haiku-4-5-20251001', 'claude-opus-4-6',
      'gpt-5.4-mini', 'gpt-5.4-nano', 'gpt-5.4', 'gpt-4.1-mini', 'gpt-4.1',
    ],
    default: 'claude-sonnet-4-6',
  },
  ELEVENLABS_VOICE: {
    type: 'string' as const,
    description: 'ElevenLabs voice ID',
    default: 'hpp4J3VqNfWAUOO0d1Us',
  },
  SYSTEM_PROMPT: {
    type: 'string' as const,
    description: 'System prompt for the voice agent',
    uiHint: 'textarea' as const,
    default: [
      'You are a helpful voice AI assistant.',
      'The user is interacting with you via voice,',
      'even if you perceive the conversation as text.',
      'You eagerly assist users with their questions',
      'by providing information from your extensive knowledge.',
      'Your responses are concise, to the point,',
      'and use natural spoken English with proper punctuation.',
      'Never use markdown, bullet points, numbered lists,',
      'emojis, asterisks, or any special formatting.',
      'You are curious, friendly, and have a sense of humor.',
      'When the conversation begins,',
      'greet the user in a helpful and friendly manner.',
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
  const model = session.data.env_vars?.LLM_MODEL || envVars.LLM_MODEL.default;
  const llmVendor = model.startsWith('claude') ? 'anthropic' : 'openai';
  const voice = session.data.env_vars?.ELEVENLABS_VOICE || envVars.ELEVENLABS_VOICE.default;
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
        vendor: 'deepgramflux',
      },
      tts: {
        vendor: 'elevenlabs',
        voice,
        options: { model_id: 'eleven_flash_v2_5' },
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
      turnDetection: 'stt',
      earlyGeneration,
      ...noiseIsolation !== 'off' && { noiseIsolation },
      eventHook: '/pipeline-event',
      actionHook: '/pipeline-complete',
    })
    .send();
});

logger.info({ port }, 'jambonz pipeline/deepgramflux-elevenlabs listening');
