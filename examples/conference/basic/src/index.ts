import * as http from 'node:http';
import pino from 'pino';
import { createEndpoint } from '@jambonz/sdk/websocket';

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

const envVars = {
  CONFERENCE_NAME: {
    type: 'string' as const,
    description: 'Name of the conference room',
    default: 'my-conference',
  },
};

const port = parseInt(process.env.PORT || '3000', 10);
const server = http.createServer();
const makeService = createEndpoint({ server, port, envVars });
const svc = makeService({ path: '/' });

svc.on('session:new', (session) => {
  const log = logger.child({ call_sid: session.callSid });
  const conferenceName = session.data.env_vars?.CONFERENCE_NAME || envVars.CONFERENCE_NAME.default;
  log.info({ from: session.from, to: session.to, conferenceName }, 'new call');

  session
    .on('close', (code: number) => {
      log.info({ code }, 'session closed');
    })
    .on('error', (err: Error) => {
      log.error(err, 'session error');
    })
    .on('/conference-status', (evt: Record<string, unknown>) => {
      log.info({ payload: evt }, 'conference status event');
    })
    .on('/conference-end', (evt: Record<string, unknown>) => {
      log.info({ payload: evt }, 'left conference');
      session.hangup().reply();
    });

  session
    .say({ text: 'You are now joining the conference.' })
    .conference({
      name: conferenceName,
      beep: true,
      startConferenceOnEnter: true,
      endConferenceOnExit: false,
      actionHook: '/conference-end',
      statusEvents: ['join', 'leave'],
      statusHook: '/conference-status',
    })
    .send();
});

logger.info({ port }, 'jambonz conference/basic example listening');
