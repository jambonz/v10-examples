import http from 'http';
import { createEndpoint } from '@jambonz/sdk/websocket';
import pino from 'pino';

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
const port = parseInt(process.env.PORT || '3000', 10);

const SYSTEM_PROMPT = `You are a friendly and helpful voice assistant.
Keep your responses concise and conversational.
You are speaking to the user via voice, so your output is read aloud by a TTS engine.
Never use markdown, bullet points, numbered lists, emojis, asterisks,
or any special formatting — write only what should be spoken.`;

const envVars = {
  DEEPGRAM_API_KEY: {
    type: 'string' as const,
    description: 'Deepgram API key',
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

  const apiKey = session.data.env_vars?.DEEPGRAM_API_KEY?.trim();

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
      vendor: 'deepgram',
      model: 'voice-agent',
      auth: {
        apiKey,
      },
      llmOptions: {
        Settings: {
          type: 'Settings',
          agent: {
            listen: {
              provider: { type: 'deepgram', model: 'nova-3' },
            },
            think: {
              provider: { type: 'open_ai', model: 'gpt-4o-mini' },
              prompt: SYSTEM_PROMPT,
            },
            speak: {
              provider: { type: 'deepgram', model: 'aura-2-thalia-en' },
            },
            greeting: 'Hello! How can I help you today?',
          },
        },
      },
      actionHook: '/s2s-complete',
    })
    .send();
});

logger.info({ port }, 'jambonz s2s/deepgram example listening');
