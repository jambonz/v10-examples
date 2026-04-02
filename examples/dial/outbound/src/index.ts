import * as http from 'node:http';
import pino from 'pino';
import { createEndpoint } from '@jambonz/sdk/websocket';

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
const port = parseInt(process.env.PORT || '3000', 10);

const server = http.createServer();
const makeService = createEndpoint({ server, port });
const svc = makeService({ path: '/' });

svc.on('session:new', (session) => {
  const log = logger.child({ call_sid: session.callSid });
  log.info({ from: session.from, to: session.to }, 'new call');

  session
    .on('close', (code: number) => {
      log.info({ code }, 'session closed');
    })
    .on('error', (err: Error) => {
      log.error(err, 'session error');
    })
    .on('/collect-digits', (evt: Record<string, unknown>) => {
      const digits = evt.digits as string | undefined;
      log.info({ digits, reason: evt.reason }, 'gather result');

      if (evt.reason !== 'dtmfDetected' || !digits) {
        session
          .say({ text: 'I did not receive any digits. Please try again.' })
          .gather({
            input: ['digits'],
            finishOnKey: '#',
            actionHook: '/collect-digits',
            say: { text: 'Please enter the phone number you would like to call, followed by the pound key.' },
          })
          .reply();
        return;
      }

      log.info({ digits }, 'dialing number');

      session
        .say({ text: `Dialing ${digits.split('').join(' ')}.` })
        .dial({
          callerId: session.from,
          target: [{ type: 'phone', number: `+${digits}` }],
          actionHook: '/dial-complete',
          timeout: 30,
        })
        .reply();
    })
    .on('/dial-complete', (evt: Record<string, unknown>) => {
      log.info({ dialStatus: evt.dial_call_status }, 'dial complete');

      const status = evt.dial_call_status as string;
      if (status === 'completed') {
        session
          .say({ text: 'The call has ended. Goodbye.' })
          .hangup()
          .reply();
      } else {
        session
          .say({ text: `The call could not be completed. The status was ${status}.` })
          .hangup()
          .reply();
      }
    });

  session
    .pause({ length: 1 })
    .gather({
      input: ['digits'],
      finishOnKey: '#',
      actionHook: '/collect-digits',
      say: { text: 'Please enter the phone number you would like to call, followed by the pound key.' },
    })
    .send();
});

logger.info({ port }, 'jambonz dial/outbound example listening');
