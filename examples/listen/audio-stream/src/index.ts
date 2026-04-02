import * as http from 'node:http';
import pino from 'pino';
import { createEndpoint } from '@jambonz/sdk/websocket';

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

const envVars = {
  WS_SERVER_URL: {
    type: 'string' as const,
    description: 'WebSocket URL to stream audio to',
    required: true,
  },
};

const port = parseInt(process.env.PORT || '3000', 10);
const server = http.createServer();
const makeService = createEndpoint({ server, port, envVars });
const svc = makeService({ path: '/' });

svc.on('session:new', (session) => {
  const log = logger.child({ call_sid: session.callSid });
  const wsUrl = session.data.env_vars?.WS_SERVER_URL;
  log.info({ from: session.from, to: session.to, wsUrl }, 'new call');

  if (!wsUrl) {
    log.error('WS_SERVER_URL not configured');
    session
      .say({ text: 'This application is not configured correctly. Goodbye.' })
      .hangup()
      .send();
    return;
  }

  session
    .on('close', (code: number) => {
      log.info({ code }, 'session closed');
    })
    .on('error', (err: Error) => {
      log.error(err, 'session error');
    })
    .on('/listen-complete', (evt: Record<string, unknown>) => {
      log.info({ payload: evt }, 'listen complete');
      session
        .say({ text: 'The audio stream has ended. Goodbye.' })
        .hangup()
        .reply();
    });

  session
    .say({ text: 'Your call audio is now being streamed.' })
    .listen({
      url: wsUrl,
      mixType: 'stereo',
      actionHook: '/listen-complete',
      metadata: {
        callSid: session.callSid,
        from: session.from,
        to: session.to,
      },
    })
    .send();
});

logger.info({ port }, 'jambonz listen/audio-stream example listening');
