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
    .on('/menu-selection', (evt: Record<string, unknown>) => {
      const digits = evt.digits as string | undefined;
      log.info({ digits, reason: evt.reason }, 'menu selection');

      let department: string | undefined;
      if (digits === '1') department = 'sales';
      else if (digits === '2') department = 'support';
      else if (digits === '3') department = 'billing';

      if (department) {
        session
          .say({ text: `You selected ${department}. Thank you for calling. Goodbye.` })
          .hangup()
          .reply();
      } else if (evt.reason === 'timeout') {
        session
          .say({ text: 'We did not receive any input. Goodbye.' })
          .hangup()
          .reply();
      } else {
        session
          .say({ text: 'Sorry, that is not a valid option.' })
          .gather({
            input: ['digits'],
            numDigits: 1,
            timeout: 10,
            actionHook: '/menu-selection',
            say: {
              text: 'Press 1 for sales. Press 2 for support. Press 3 for billing.',
            },
          })
          .reply();
      }
    });

  session
    .pause({ length: 1 })
    .gather({
      input: ['digits'],
      numDigits: 1,
      timeout: 10,
      actionHook: '/menu-selection',
      say: {
        text: 'Welcome to Acme Corp. Press 1 for sales. Press 2 for support. Press 3 for billing.',
      },
    })
    .send();
});

logger.info({ port }, 'jambonz gather/dtmf-menu example listening');
