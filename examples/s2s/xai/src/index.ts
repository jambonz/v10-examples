import http from 'http';
import { createEndpoint } from '@jambonz/sdk/websocket';
import pino from 'pino';

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
const port = parseInt(process.env.PORT || '3000', 10);

const SYSTEM_PROMPT = `You are a friendly and helpful voice assistant for Jambonz Mobile.
Keep your responses concise and conversational.
You are speaking via voice, so respond in plain prose with no markdown.`;

const envVars = {
  XAI_API_KEY: {
    type: 'string' as const,
    description: 'xAI API key',
    required: true,
    obscure: true,
  },
};

const server = http.createServer();
const makeService = createEndpoint({ server, port, envVars });
const svc = makeService({ path: '/' });

svc.on('session:new', (session) => {
  const log = logger.child({ callSid: session.callSid });
  log.info({ from: session.from, to: session.to }, 'new call');

  const apiKey = session.data.env_vars?.XAI_API_KEY?.trim();

  session
    .on('close', (code: number) => {
      log.info({ code }, 'session closed');
    })
    .on('error', (err: Error) => {
      log.error(err, 'session error');
    })
    .on('/s2s-complete', (evt: Record<string, unknown>) => {
      log.info(evt, 's2s complete');
      session.reply();
    });

  session
    .s2s({
      vendor: 'xai',
      // pinned deliberately: the grok-voice-latest alias still resolves to 1.0 until Aug 5, 2026
      model: 'grok-voice-think-fast-2.0',
      auth: {
        apiKey,
      },
      // xai requires BOTH session_update and response_create — it gates audio until the first
      // session.updated, and the feature-server throws if either is missing. Do not set audio
      // formats here; jambonz negotiates those with the media stack.
      llmOptions: {
        session_update: {
          voice: 'eve',
          instructions: SYSTEM_PROMPT,
          turn_detection: {
            type: 'server_vad',
            threshold: 0.8,
            prefix_padding_ms: 300,
            silence_duration_ms: 500,
          },
          // xai-specific: 'high' lets Grok reason before speaking, 'none' minimizes latency
          reasoning: { effort: 'high' },
          // xai-specific: rewrites text before TTS so names and acronyms are pronounced correctly
          replace: {
            'jambonz': 'jam bonz',
            'S2S': 'speech to speech',
          },
        },
        response_create: {
          instructions: 'Greet the caller warmly, introduce yourself as the Jambonz Mobile assistant, '
            + 'and ask how you can help.',
        },
      },
      actionHook: '/s2s-complete',
    })
    .send();
});

logger.info({ port }, 'jambonz s2s/xai example listening');
