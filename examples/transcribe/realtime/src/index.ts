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
    .on('/transcription', (evt: Record<string, unknown>) => {
      const transcript = evt.transcript as string | undefined;
      const is_final = evt.is_final as boolean | undefined;
      if (transcript && is_final) {
        log.info({ transcript }, 'final transcription');
      }
    });

  session
    .say({ text: 'Your call is now being transcribed.' })
    .transcribe({
      transcriptionHook: '/transcription',
      recognizer: {
        vendor: 'deepgram',
        language: 'en-US',
        interim: true,
      },
    })
    .send();
});

logger.info({ port }, 'jambonz transcribe/realtime example listening');
