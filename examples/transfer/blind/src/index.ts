import * as http from 'node:http';
import pino from 'pino';
import { createEndpoint } from '@jambonz/sdk/websocket';

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
const port = parseInt(process.env.PORT || '3000', 10);

const envVars = {
  TRANSFER_TARGET: {
    type: 'string' as const,
    description: 'Phone number (E.164) to transfer the caller to',
    default: '+15085551212',
  },
  CALLER_ID: {
    type: 'string' as const,
    description: 'Caller ID to present to the target (defaults to the original caller)',
  },
};

const server = http.createServer();
const makeService = createEndpoint({ server, port, envVars });
const svc = makeService({ path: '/' });

svc.on('session:new', (session) => {
  const log = logger.child({ call_sid: session.callSid });
  const transferTarget = session.data.env_vars?.TRANSFER_TARGET || envVars.TRANSFER_TARGET.default;
  const callerId = session.data.env_vars?.CALLER_ID || session.from;

  log.info({ from: session.from, to: session.to, transferTarget }, 'new call');

  session
    .on('close', (code: number) => {
      log.info({ code }, 'session closed');
    })
    .on('error', (err: Error) => {
      log.error(err, 'session error');
    })
    .on('/transfer-status', (evt: Record<string, unknown>) => {
      log.info({ payload: evt }, 'transfer status');
    });

  // Blind transfer via dial: bridge the caller to a freshly dialed outbound leg.
  // Unlike SIP REFER (which carriers such as Twilio reject with a 403), this
  // keeps the media on jambonz and works over any trunk.
  session
    .answer()
    .say({ text: 'Connecting you to the next available specialist now.' })
    .dial({
      callerId,
      target: [{ type: 'phone', number: transferTarget }],
      answerOnBridge: true,
      forwardPAI: true,
      timeout: 30,
      actionHook: '/transfer-status',
    })
    .send();
});

logger.info({ port }, 'blind transfer example listening');
