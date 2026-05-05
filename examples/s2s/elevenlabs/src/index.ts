import http from 'http';
import { createEndpoint } from '@jambonz/sdk/websocket';
import pino from 'pino';

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
const port = parseInt(process.env.PORT || '3000', 10);

const envVars = {
  ELEVENLABS_AGENT_ID: {
    type: 'string' as const,
    description: 'ElevenLabs conversational AI agent ID',
    required: true,
  },
  ELEVENLABS_API_KEY: {
    type: 'string' as const,
    description: 'ElevenLabs API key',
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

  const agentId = session.data.env_vars?.ELEVENLABS_AGENT_ID;
  const apiKey = session.data.env_vars?.ELEVENLABS_API_KEY?.trim();

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
      vendor: 'elevenlabs',
      auth: {
        agent_id: agentId,
        api_key: apiKey,
      },
      llmOptions: {},
      actionHook: '/s2s-complete',
    })
    .send();
});

logger.info({ port }, 'jambonz s2s/elevenlabs example listening');
