import http from 'http';
import { createEndpoint } from '@jambonz/sdk/websocket';
import pino from 'pino';

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
const port = parseInt(process.env.PORT || '3000', 10);

const envVars = {
  ULTRAVOX_API_KEY: {
    type: 'string' as const,
    description: 'Ultravox API key',
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

  const apiKey = session.data.env_vars?.ULTRAVOX_API_KEY?.trim();

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
      vendor: 'ultravox',
      auth: {
        apiKey,
      },
      llmOptions: {
        systemPrompt: 'You are a friendly and helpful voice assistant. Keep your responses concise and conversational.',
      },
      actionHook: '/s2s-complete',
    })
    .send();
});

logger.info({ port }, 'jambonz s2s/ultravox example listening');
