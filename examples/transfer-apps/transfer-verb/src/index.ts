import * as http from 'node:http';
import pino from 'pino';
import { createEndpoint } from '@jambonz/sdk/websocket';

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
const port = parseInt(process.env.PORT || '3000', 10);

const target = process.env.TRANSFER_TARGET || '+15085550100';
const callerIdOverride = process.env.TRANSFER_CALLER_ID || '+15085550101';

const server = http.createServer();
const makeService = createEndpoint({ server, port });
const svc = makeService({ path: '/' });

svc.on('session:new', (session) => {
  const log = logger.child({ callSid: session.callSid });
  const callerId = callerIdOverride || session.to;
  log.info({ from: session.from, to: session.to, target, callerId }, 'new call');

  session
    .on('close', (code: number) => {
      log.info({ code }, 'session closed');
    })
    .on('error', (err: Error) => {
      log.error(err, 'session error');
    })
    .on('/transfer-event', (evt: Record<string, unknown>) => {
      log.info({ event: evt.event_type, ...evt }, 'transfer event');
    })
    .on('/transfer-done', (evt: Record<string, unknown>) => {
      log.info(
        { result: evt.transfer_result, reason: evt.transfer_reason },
        'transfer resolved',
      );
      session.hangup().reply();
    });

  session
    .say({ text: 'Please hold while I connect you to a specialist.' })
    .transfer({
      mode: 'warm',
      callerPresent: false,
      target: [{ type: 'phone', number: target }],
      callerId,
      brief: { text: 'You have a caller who needs assistance.' },
      confirm: { prompt: 'Press 1 to accept the transfer.', digit: '1' },
      disposition: {
        onNoAnswer: 'return',
        onBusy: 'return',
        onDecline: 'return',
        onFailure: 'return',
      },
      eventHook: '/transfer-event',
      actionHook: '/transfer-done',
    })
    .send();
});

logger.info({ port }, 'transfer verb example listening');
