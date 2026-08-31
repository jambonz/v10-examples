import * as http from 'node:http';
import pino from 'pino';
import { createEndpoint } from '@jambonz/sdk/websocket';

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
const port = parseInt(process.env.PORT || '3000', 10);

const envVars = {
  WARM_TRANSFER_TARGET: {
    type: 'string' as const,
    description: 'Phone number (E.164) of the specialist to warm-transfer to',
    default: '+15085551212',
  },
};

const server = http.createServer();
const makeService = createEndpoint({ server, port, envVars });
const svc = makeService({ path: '/' });

svc.on('session:new', (session) => {
  const log = logger.child({ call_sid: session.callSid });
  const target = session.data.env_vars?.WARM_TRANSFER_TARGET || envVars.WARM_TRANSFER_TARGET.default;
  log.info({ from: session.from, to: session.to, target }, 'new call');

  // Whether the target agreed to take the call during screening. Used to tell
  // the caller what happened once the dial completes.
  let accepted = false;

  session
    .on('close', (code: number) => {
      log.info({ code }, 'session closed');
    })
    .on('error', (err: Error) => {
      log.error(err, 'session error');
    })

    // confirmHook: runs on the TARGET's leg when they answer, BEFORE bridging.
    // Brief them about the caller and ask them to accept or decline.
    .on('/screen', () => {
      log.info('target answered — screening');
      const prompt = `Incoming transfer from ${session.from}. Say yes or press 1 to accept, no or 2 to decline.`;
      session
        .gather({
          input: ['speech', 'digits'],
          actionHook: '/screen-decision',
          numDigits: 1,
          timeout: 12,
          bargein: true,
          say: { text: prompt },
        })
        .reply();
    })

    // The target's yes/no decision.
    .on('/screen-decision', (evt: Record<string, unknown>) => {
      const speech = evt.speech as { alternatives?: Array<{ transcript?: string }> } | undefined;
      const transcript = (speech?.alternatives?.[0]?.transcript || '').toLowerCase();
      const digits = evt.digits as string | undefined;
      accepted = digits === '1' || /\b(yes|yeah|yep|sure|accept|ok|okay)\b/.test(transcript);

      log.info({ transcript, digits, accepted }, 'screen decision');

      if (accepted) {
        // Completing the confirm sequence without a hangup lets jambonz bridge
        // the waiting caller to this target leg.
        session.say({ text: 'Thanks, connecting you now.' }).reply();
      } else {
        // Hanging up the target leg means no bridge happens; the caller's dial
        // actionHook (/dial-complete) then runs.
        session.say({ text: 'No problem. Goodbye.' }).hangup().reply();
      }
    })

    // actionHook: runs on the CALLER's leg when the dial ends (bridged,
    // declined, no answer, busy, etc.).
    .on('/dial-complete', (evt: Record<string, unknown>) => {
      const status = evt.dial_call_status as string | undefined;
      log.info({ status, accepted }, 'dial complete');

      if (accepted) {
        // Caller and target were bridged; the conversation has already ended.
        session.hangup().reply();
      } else {
        session
          .say({ text: 'Sorry, the specialist was unable to take your call. Goodbye.' })
          .hangup()
          .reply();
      }
    });

  session
    .say({ text: 'Connecting you to a specialist who can help. Please hold while I ring them.' })
    .dial({
      callerId: session.from,
      target: [{ type: 'phone', number: target }],
      confirmHook: '/screen',
      actionHook: '/dial-complete',
      timeout: 30,
    })
    .send();
});

logger.info({ port }, 'warm transfer example listening');
