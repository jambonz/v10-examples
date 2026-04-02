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
    .say({ text: 'Hello! This is a basic text to speech example using jambonz.' })
    .pause({ length: 1 })
    .say({ text: 'This next message will repeat three times.' })
    .say({ text: 'I can say things more than once.', loop: 3 })
    .say({ text: 'Thank you for trying jambonz. Goodbye!' })
    .hangup()
    .send();
});

logger.info({ port }, 'jambonz say/basic example listening');
