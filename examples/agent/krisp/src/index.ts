import * as http from 'node:http';
import pino from 'pino';
import { createEndpoint } from '@jambonz/sdk/websocket';

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

/* Krisp runs inside the media server, so nothing about it is visible to this
 * application directly — you verify it by listening, and by watching the
 * agent events logged below. Every knob is an env var so a single deployed
 * app can be flipped from the portal between calls instead of redeployed. */

/* Models shipped in the Krisp VIVA 9.20 pack. The 9.20 pack DROPPED
 * vi-tel-lite-v1 (the previous default) and RENAMED ip-v1 to ip-v1.1, so an
 * app that pinned either old name fails to start noise isolation after the
 * upgrade. Leave the model blank to take the media server's compiled-in
 * default, which is the safe choice. */
const voiceIsolationModels = [
  '',
  'krisp-viva-vi-tel-lite-v2.5.kef',
  'krisp-viva-vi-tel-v2.5.1.kef',
  'krisp-viva-vi-tel-v2.7.kef',
];

const llmVendorFor = (model: string): string => {
  if (model.startsWith('claude')) return 'anthropic';
  if (model.startsWith('grok') || model.startsWith('xai.')) return 'xai';
  return 'openai';
};

const envVars = {
  LLM_MODEL: {
    type: 'string' as const,
    description: 'LLM model to use',
    enum: [
      'claude-sonnet-4-6', 'claude-haiku-4-5-20251001',
      'gpt-5.4-mini', 'gpt-4.1-mini',
      'grok-4.3', 'xai.grok-4.3',
    ],
    default: 'claude-sonnet-4-6',
  },
  TURN_DETECTION: {
    type: 'string' as const,
    description:
      'How end-of-turn is decided. krisp = Krisp acoustic model in the media '
      + 'server; stt = the STT vendor\'s own silence detection.',
    enum: ['krisp', 'stt'],
    default: 'krisp',
  },
  KRISP_EOT_THRESHOLD: {
    type: 'string' as const,
    description: 'Krisp end-of-turn confidence threshold, 0.0-1.0. Lower turns sooner.',
    default: '0.5',
  },
  GREETING: {
    type: 'string' as const,
    description:
      'Whether the agent speaks first. Worth flipping deliberately: with Krisp '
      + 'turn detection the agent speaking first is what arms the model.',
    enum: ['on', 'off'],
    default: 'on',
  },
  NOISE_ISOLATION: {
    type: 'string' as const,
    description: 'Background-noise removal on the caller audio before it reaches STT',
    enum: ['krisp', 'rnnoise', 'off'],
    default: 'krisp',
  },
  NOISE_ISOLATION_LEVEL: {
    type: 'string' as const,
    description: 'Suppression strength, 0-100',
    default: '100',
  },
  NOISE_ISOLATION_MODEL: {
    type: 'string' as const,
    description:
      'Pin a specific voice-isolation model. Leave blank for the media '
      + 'server default (recommended).',
    enum: voiceIsolationModels,
    default: '',
  },
  BARGE_IN: {
    type: 'string' as const,
    description:
      'How interruptions are detected. interruptPrediction uses Krisp\'s ML '
      + 'model to tell a real interruption from backchannel ("uh-huh"); vad '
      + 'treats any speech onset as an interruption.',
    enum: ['interruptPrediction', 'vad', 'off'],
    default: 'interruptPrediction',
  },
  INTERRUPT_THRESHOLD: {
    type: 'string' as const,
    description: 'interruptPrediction confidence threshold, 0.0-1.0. Higher needs stronger evidence.',
    default: '0.5',
  },
  SYSTEM_PROMPT: {
    type: 'string' as const,
    description: 'System prompt for the voice agent',
    uiHint: 'textarea' as const,
    default: [
      'You are a helpful voice AI assistant.',
      'The user is interacting with you via voice,',
      'even if you perceive the conversation as text.',
      'Your responses are concise, to the point,',
      'and use natural spoken English with proper punctuation.',
      'Never use markdown, bullet points, numbered lists,',
      'emojis, asterisks, or any special formatting.',
      'When the conversation begins,',
      'greet the user in a helpful and friendly manner.',
    ].join(' '),
  },
};

const port = parseInt(process.env.PORT || '3000', 10);
const server = http.createServer();
const makeService = createEndpoint({ server, port, envVars });

const svc = makeService({ path: '/' });
svc.on('session:new', (session) => {
  const log = logger.child({ call_sid: session.callSid });
  const env = session.data.env_vars || {};
  const pick = (k: keyof typeof envVars) => env[k] || envVars[k].default;

  const model = pick('LLM_MODEL');
  const systemPrompt = pick('SYSTEM_PROMPT');
  const turnDetectionMode = pick('TURN_DETECTION') as 'krisp' | 'stt';
  const eotThreshold = parseFloat(pick('KRISP_EOT_THRESHOLD'));
  const greeting = pick('GREETING') === 'on';
  const noiseMode = pick('NOISE_ISOLATION') as 'krisp' | 'rnnoise' | 'off';
  const noiseLevel = parseInt(pick('NOISE_ISOLATION_LEVEL'), 10);
  const noiseModel = pick('NOISE_ISOLATION_MODEL');
  const bargeInMode = pick('BARGE_IN') as 'interruptPrediction' | 'vad' | 'off';
  const interruptThreshold = parseFloat(pick('INTERRUPT_THRESHOLD'));

  /* The object form of turnDetection is what carries threshold; the shorthand
   * string 'stt' has no options to tune. */
  const turnDetection = turnDetectionMode === 'krisp'
    ? { mode: 'krisp' as const, threshold: eotThreshold }
    : 'stt' as const;

  const noiseIsolation = noiseMode === 'off'
    ? undefined
    : {
      mode: noiseMode,
      level: noiseLevel,
      direction: 'read' as const,
      ...(noiseModel && { model: noiseModel }),
    };

  const bargeIn = bargeInMode === 'off'
    ? { enable: false }
    : {
      enable: true,
      strategy: bargeInMode,
      ...(bargeInMode === 'interruptPrediction' && {
        vendor: 'krisp',
        threshold: interruptThreshold,
      }),
    };

  log.info({
    turnDetection, noiseIsolation, bargeIn, greeting,
  }, 'starting agent with krisp configuration');

  /* These events are the only window into what Krisp decided. turn_end
   * carries the end-of-turn the acoustic model produced; user_interruption
   * fires when interruptPrediction scored a barge-in as genuine. If Krisp is
   * misconfigured or a pinned model is missing, they simply never arrive —
   * the call still connects and the agent just never answers you. */
  session.on('/agent-event', (evt: Record<string, unknown>) => {
    log.info({ payload: evt }, `agent event: ${evt.type}`);
  });

  session.on('/agent-complete', (evt: Record<string, unknown>) => {
    log.info({ payload: evt }, 'agent completed');
    session.hangup().reply();
  });

  session
    .agent({
      stt: { vendor: 'deepgram' },
      tts: { vendor: 'deepgram', voice: 'aura-asteria-en' },
      llm: {
        vendor: llmVendorFor(model),
        model,
        llmOptions: {
          messages: [{ role: 'system', content: systemPrompt }],
        },
      },
      greeting,
      turnDetection,
      bargeIn,
      ...(noiseIsolation && { noiseIsolation }),
      eventHook: '/agent-event',
      actionHook: '/agent-complete',
    })
    .send();
});

logger.info({ port }, 'jambonz agent/krisp listening');
