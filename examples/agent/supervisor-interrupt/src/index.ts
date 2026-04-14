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
  const llmChoice = session.data.env_vars?.LLM_MODEL || envVars.LLM_MODEL.default;
  const colonIdx = llmChoice.indexOf(':');
  const llmVendor = llmChoice.slice(0, colonIdx);
  const model = llmChoice.slice(colonIdx + 1);

  const voice = session.data.env_vars?.CARTESIA_VOICE || envVars.CARTESIA_VOICE.default;
  const systemPrompt = session.data.env_vars?.SYSTEM_PROMPT || envVars.SYSTEM_PROMPT.default;
  const noiseIsolation = (session.data.env_vars?.NOISE_ISOLATION
    || envVars.NOISE_ISOLATION.default) as 'krisp' | 'rnnoise' | 'off';
  const earlyGeneration = (session.data.env_vars?.EARLY_GENERATION || envVars.EARLY_GENERATION.default) === 'on';

  let agentResponseCount = 0;

  session.on('/agent-event', (evt: Record<string, unknown>) => {
    log.info({ payload: evt }, `agent event: ${evt.type}`);

    if (evt.type === 'agent_response') {
      agentResponseCount++;
      if (agentResponseCount === 3) {
        log.info('third agent response, scheduling supervisor interrupt in 2 seconds');

        setTimeout(() => {
          log.info('sending supervisor interrupt: flash sale notification');
          session.updateAgent({
            type: 'generate_reply',
            interrupt: true,
            user_input: [
              'URGENT SUPERVISOR MESSAGE: Interrupt the current conversation immediately.',
              'Inform the customer that a flash sale has just started.',
              'All items are 50% off for the next 30 minutes.',
              'The promo code is FLASH50.',
              'Apologize for the interruption and share this exciting news.',
            ].join(' '),
          });
        }, 2000);
      }
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
        },
      },
      bargeIn: { enable: true },
      turnDetection: 'krisp',
      earlyGeneration,
      ...noiseIsolation !== 'off' && { noiseIsolation },
      eventHook: '/agent-event',
      actionHook: '/agent-complete',
    })
    .send();
});

logger.info({ port }, 'jambonz agent/supervisor-interrupt listening');
