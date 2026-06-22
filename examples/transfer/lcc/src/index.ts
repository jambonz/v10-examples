import * as http from 'node:http';
import pino from 'pino';
import { createEndpoint } from '@jambonz/sdk/websocket';

// Live Call Control (LCC) transfer demo — the PARKING half.
//
// This app simply answers the caller and parks them in a long pause. The
// transfer is injected from OUTSIDE, mid-call, by the companion REST script
// (src/trigger-transfer.ts) which calls updateCall with a {transfer:{...}} body.
// jambonz replaceApplication()s the running pause with the transfer verb.
//
// On a new call this app logs the jambonz call_sid — copy it into the trigger
// script (or set CALL_SID) to fire the transfer to the destination
// (default xhoaluu2@sip.jambonz.me).

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
const port = parseInt(process.env.PORT || '3000', 10);

const server = http.createServer();
const makeService = createEndpoint({ server, port });
const svc = makeService({ path: '/' });

svc.on('session:new', (session) => {
  const log = logger.child({ call_sid: session.callSid });
  // The call_sid printed here is what the trigger script needs.
  log.info({ call_sid: session.callSid, from: session.from, to: session.to },
    'new call — park; run trigger-transfer.ts with this call_sid to inject the LCC transfer');

  session
    .on('close', (code: number) => log.info({ code }, 'session closed'))
    .on('error', (err: Error) => log.error(err, 'session error'));

  // Park the caller. The LCC transfer preempts this pause via replaceApplication.
  session
    .say({ text: 'Please hold. An agent will be connected to you shortly.' })
    .pause({ length: 300 })
    .hangup()
    .send();
});

logger.info({ port }, 'jambonz transfer/lcc (parking app) listening — waiting for calls');
