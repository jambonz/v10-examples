import * as http from 'node:http';
import pino from 'pino';
import { createEndpoint } from '@jambonz/sdk/websocket';
import type { TransferVerb } from '@jambonz/sdk/types';

// Standalone `transfer` verb demo. A caller is greeted, then handed to a human
// (default xhoaluu2@sip.jambonz.me). TRANSFER_MODE selects the strategy:
//   blind-refer  — SIP REFER (jambonz drops out of the media path)
//   blind-dial   — bridged outbound INVITE to the human
//   warm-parked  — caller held on hold; brief spoken to the human; then bridge
//   warm-3way    — caller + human in a conference; brief heard by both
//   no-answer    — warm-parked with a short timeout + onNoAnswer:return, then a
//                  `say` AFTER the transfer proves the verb stack resumes

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
const port = parseInt(process.env.PORT || '3000', 10);

const envVars = {
  TRANSFER_TARGET: {
    type: 'string' as const,
    description: 'SIP user or phone to transfer to',
    default: 'xhoaluu2@sip.jambonz.me',
  },
  TRANSFER_MODE: {
    type: 'string' as const,
    description: 'Which transfer strategy to demo',
    enum: ['blind-refer', 'blind-dial', 'warm-parked', 'warm-3way', 'no-answer'],
    default: 'blind-dial',
  },
};

type TransferOpts = Omit<TransferVerb, 'verb'>;

// Build the transfer options for the chosen mode.
function transferOpts(mode: string, target: string): TransferOpts {
  const dest = [{ type: 'user' as const, name: target }];
  const actionHook = '/transfer-complete';

  switch (mode) {
    case 'blind-refer':
      // blindMethod defaults to 'refer' when omitted.
      return { mode: 'blind', target: dest, timeout: 20, actionHook };
    case 'warm-parked':
      return {
        mode: 'warm', callerPresent: false, target: dest,
        brief: { text: 'I have a caller on the line who needs help. Connecting you now.' },
        timeout: 25, actionHook,
      };
    case 'warm-3way':
      return {
        mode: 'warm', callerPresent: true, target: dest,
        brief: { text: 'Connecting you now — the caller is on the line and can hear us.' },
        timeout: 25, actionHook,
      };
    case 'no-answer':
      return {
        mode: 'warm', callerPresent: false, target: dest,
        brief: { text: 'Trying to reach an agent now.' },
        timeout: 8, disposition: { onNoAnswer: 'return' }, actionHook,
      };
    case 'blind-dial':
    default:
      return { mode: 'blind', blindMethod: 'dial', target: dest, timeout: 20, actionHook };
  }
}

const server = http.createServer();
const makeService = createEndpoint({ server, port, envVars });
const svc = makeService({ path: '/' });

svc.on('session:new', (session) => {
  const log = logger.child({ call_sid: session.callSid });
  const target = session.data.env_vars?.TRANSFER_TARGET || envVars.TRANSFER_TARGET.default;
  const mode = session.data.env_vars?.TRANSFER_MODE || envVars.TRANSFER_MODE.default;
  log.info({ from: session.from, to: session.to, target, mode }, 'new call');

  session
    .on('close', (code: number) => log.info({ code }, 'session closed'))
    .on('error', (err: Error) => log.error(err, 'session error'))
    .on('/transfer-complete', (evt: Record<string, unknown>) => {
      // transfer_result: bridged | returned | voicemail | failed
      log.info({
        transfer_result: evt.transfer_result,
        transfer_reason: evt.transfer_reason,
        sip_status: evt.sip_status,
      }, 'transfer complete');
      session.reply();
    });

  const builder = session
    .say({ text: 'Please hold while I connect you to a human agent.' })
    .transfer(transferOpts(mode, target));

  // no-answer demo: prove the stack resumes after the transfer returns.
  if (mode === 'no-answer') {
    builder
      .say({ text: 'Sorry, nobody is available right now. The transfer returned you to me.' })
      .hangup();
  }

  builder.send();
});

logger.info({ port }, 'jambonz transfer/standalone example listening');
