import http from 'http';
import { createEndpoint } from '@jambonz/sdk/websocket';
import pino from 'pino';

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
const port = parseInt(process.env.PORT || '3000', 10);

const server = http.createServer();
const makeService = createEndpoint({ server, port });
const svc = makeService({ path: '/' });

svc.on('session:new', (session) => {
  const log = logger.child({ callSid: session.callSid });
  log.info({ from: session.from, to: session.to }, 'new call');

  session
    .on('close', (code: number) => {
      log.info({ code }, 'session closed');
    })
    .on('error', (err: Error) => {
      log.error(err, 'session error');
    })
    .on('/echo', (evt: Record<string, unknown>) => {
      log.debug({ reason: evt.reason }, 'gather event');

      switch (evt.reason) {
        case 'speechDetected': {
          const speech = evt.speech as { alternatives: { transcript: string; confidence?: number }[] };
          const { transcript, confidence } = speech.alternatives[0];
          log.info({ transcript, confidence }, 'speech detected');

          session
            .say({
              text: confidence
                ? `You said: ${transcript}. The confidence score was ${confidence.toFixed(2)}.`
                : `You said: ${transcript}.`,
            })
            .gather({
              input: ['speech'],
              actionHook: '/echo',
              timeout: 15,
              say: { text: 'Please say something else.' },
            })
            .reply();
          break;
        }
        case 'timeout':
          session
            .gather({
              input: ['speech'],
              actionHook: '/echo',
              timeout: 15,
              say: { text: 'Are you still there? I didn\'t hear anything.' },
            })
            .reply();
          break;
        default:
          session.reply();
          break;
      }
    });

  session
    .pause({ length: 1 })
    .gather({
      input: ['speech'],
      actionHook: '/echo',
      timeout: 15,
      say: { text: 'Please say something and I will echo it back to you.' },
    })
    .send();
});

logger.info({ port }, 'jambonz gather/echo example listening');
