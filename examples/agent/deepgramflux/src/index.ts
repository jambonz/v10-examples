import * as http from 'node:http';
import pino from 'pino';
import { createEndpoint } from '@jambonz/sdk/websocket';

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

/* Deepgram Flux TTS models follow the pattern flux-{voice}-{language};
 * for Flux TTS the voice IS the model, there is no separate language */
const fluxTtsModels = [
  'flux-alexis-en', 'flux-haley-en', 'flux-heather-en', 'flux-cole-en',
  'flux-priya-en', 'flux-jack-en', 'flux-bruce-en', 'flux-rufus-en',
  'flux-drew-en', 'flux-renee-en', 'flux-marcus-en', 'flux-sharon-en',
];

/* Model prefix determines the LLM vendor. Plain ids (kimi-k2.5, grok-4.3,
 * glm-4.7) target the vendor's native API with a BYO credential; the
 * dotted ids (moonshotai.kimi-k2.5, xai.grok-4.3, zai.glm-4.7) are the
 * jambonz-hosted (Bedrock Mantle) model ids — use those when the model is
 * enabled on the account's hosted-inference page instead of a BYO key. */
const llmVendorFor = (model: string): string => {
  if (model.startsWith('claude')) return 'anthropic';
  if (model.startsWith('kimi') || model.startsWith('moonshotai.')) return 'moonshot';
  if (model.startsWith('glm') || model.startsWith('zai.')) return 'zai';
  if (model.startsWith('grok') || model.startsWith('xai.')) return 'xai';
  return 'openai';
};

const envVars = {
  LLM_MODEL: {
    type: 'string' as const,
    description: 'LLM model to use',
    enum: [
      'claude-sonnet-4-6', 'claude-haiku-4-5-20251001', 'claude-opus-4-6',
      'gpt-5.4-mini', 'gpt-5.4-nano', 'gpt-5.4', 'gpt-4.1-mini', 'gpt-4.1',
      'kimi-k2.5', 'kimi-k2.6', 'moonshotai.kimi-k2.5',
      'grok-4.3', 'xai.grok-4.3',
      'glm-4.7', 'glm-4.7-flash', 'glm-5.2',
      'zai.glm-4.7', 'zai.glm-4.7-flash', 'zai.glm-5',
    ],
    default: 'claude-sonnet-4-6',
  },
  DEEPGRAM_FLUX_TTS_MODEL: {
    type: 'string' as const,
    description: 'Deepgram Flux TTS model (voice)',
    enum: fluxTtsModels,
    default: 'flux-alexis-en',
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
  EAGER_EOT_THRESHOLD: {
    type: 'string' as const,
    description: 'Flux eager end-of-turn threshold (0.3-0.9); required for early generation to fire',
    default: '0.5',
  },
};

const port = parseInt(process.env.PORT || '3000', 10);
const server = http.createServer();
const makeService = createEndpoint({ server, port, envVars });

const svc = makeService({ path: '/' });
svc.on('session:new', (session) => {
  const log = logger.child({ call_sid: session.callSid });
  const model = session.data.env_vars?.LLM_MODEL || envVars.LLM_MODEL.default;
  const llmVendor = llmVendorFor(model);
  const ttsModel = session.data.env_vars?.DEEPGRAM_FLUX_TTS_MODEL || envVars.DEEPGRAM_FLUX_TTS_MODEL.default;
  const systemPrompt = session.data.env_vars?.SYSTEM_PROMPT || envVars.SYSTEM_PROMPT.default;
  const noiseIsolation = (session.data.env_vars?.NOISE_ISOLATION
    || envVars.NOISE_ISOLATION.default) as 'krisp' | 'rnnoise' | 'off';
  const earlyGeneration = (session.data.env_vars?.EARLY_GENERATION || envVars.EARLY_GENERATION.default) === 'on';
  const eagerEotThreshold = parseFloat(
    session.data.env_vars?.EAGER_EOT_THRESHOLD || envVars.EAGER_EOT_THRESHOLD.default);

  session.on('/agent-event', (evt: Record<string, unknown>) => {
    log.info({ payload: evt }, `agent event: ${evt.type}`);
  });

  session.on('/agent-complete', (evt: Record<string, unknown>) => {
    log.info({ payload: evt }, 'agent completed');
    session.hangup().reply();
  });

  session
    .agent({
      stt: {
        vendor: 'deepgramflux',
        /* eagerEotThreshold makes Flux emit EagerEndOfTurn events, which is
         * what earlyGeneration preflights the LLM on — without it preflight
         * never fires */
        ...(earlyGeneration && { deepgramOptions: { eagerEotThreshold } }),
      },
      tts: {
        vendor: 'deepgramflux',
        voice: ttsModel,
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
      /* Flux is turn-based: its native EndOfTurn events drive turn taking */
      turnDetection: 'stt',
      earlyGeneration,
      ...noiseIsolation !== 'off' && { noiseIsolation },
      eventHook: '/agent-event',
      actionHook: '/agent-complete',
    })
    .send();
});

logger.info({ port }, 'jambonz agent/deepgramflux listening');
