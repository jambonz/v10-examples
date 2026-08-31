import * as http from 'node:http';
import pino from 'pino';
import { createEndpoint } from '@jambonz/sdk/websocket';

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
const port = parseInt(process.env.PORT || '3000', 10);

// Application variables — configured in the jambonz portal, delivered at runtime
// in session.data.env_vars.
const envVars = {
  GCP_PROJECT_ID: {
    type: 'string' as const,
    description: 'Google Cloud project ID that hosts the Dialogflow CX agent',
    required: true,
  },
  DIALOGFLOW_AGENT_ID: {
    type: 'string' as const,
    description: 'Dialogflow CX agent ID (UUID)',
    required: true,
  },
  DIALOGFLOW_ENVIRONMENT: {
    type: 'string' as const,
    description: 'Dialogflow CX environment (omit to use the draft environment)',
  },
  GCP_REGION: {
    type: 'string' as const,
    description: 'Google Cloud region for the Dialogflow API endpoint',
    default: 'us-central1',
  },
  LANGUAGE_CODE: {
    type: 'string' as const,
    description: 'BCP-47 language code passed to Dialogflow',
    default: 'en-US',
  },
  WELCOME_EVENT: {
    type: 'string' as const,
    description: 'Dialogflow event fired at the start of the conversation',
    default: 'WELCOME',
  },
  GCP_CREDENTIALS: {
    type: 'string' as const,
    description: 'Google service-account JSON (the full key file contents)',
    required: true,
    obscure: true,
    uiHint: 'textarea' as const,
  },
};

const server = http.createServer();
const makeService = createEndpoint({ server, port, envVars });
const svc = makeService({ path: '/' });

svc.on('session:new', (session) => {
  const log = logger.child({ call_sid: session.callSid });
  log.info({ from: session.from, to: session.to }, 'new call');

  const env = session.data.env_vars ?? {};

  // credentials arrive as a JSON string; the verb accepts an object or a string.
  let credentials: Record<string, unknown> | string | undefined = env.GCP_CREDENTIALS;
  if (typeof credentials === 'string') {
    try {
      credentials = JSON.parse(credentials) as Record<string, unknown>;
    } catch (err) {
      log.error({ err }, 'GCP_CREDENTIALS is not valid JSON — passing through as-is');
    }
  }

  session
    .on('close', (code: number) => {
      log.info({ code }, 'session closed');
    })
    .on('error', (err: Error) => {
      log.error(err, 'session error');
    })
    // eventHook — fires throughout the conversation for the events we subscribed to.
    // Respond with session.reply() to let Dialogflow continue driving the call, or
    // return a new verb chain to take over (e.g. transfer the caller).
    .on('/dialogflow-event', (evt: Record<string, unknown>) => {
      const event = evt.event as string | undefined;
      const data = evt.data as Record<string, unknown> | undefined;
      log.info({ event, data }, 'dialogflow event');

      // Look for a custom payload that asks us to transfer the caller to a PSTN number.
      // In Dialogflow CX, attach a custom payload like { "transfer": { "number": "+1..." } }
      // to a fulfillment response to trigger this branch.
      const transferNumber = findTransferNumber(data);
      if (transferNumber) {
        log.info({ transferNumber }, 'transfer requested — handing off to dial');
        session
          .dial({
            target: [{ type: 'phone', number: transferNumber }],
          })
          .reply();
        return;
      }

      session.reply();
    })
    // actionHook — fires once when the Dialogflow session ends or redirects.
    .on('/dialogflow-action', (evt: Record<string, unknown>) => {
      log.info({ payload: evt }, `dialogflow session ended: ${evt.dialogflowResult}`);
      session.hangup().reply();
    });

  session
    .dialogflow({
      model: 'cx',
      credentials: credentials!,
      project: env.GCP_PROJECT_ID,
      agent: env.DIALOGFLOW_AGENT_ID,
      environment: env.DIALOGFLOW_ENVIRONMENT,
      region: env.GCP_REGION || envVars.GCP_REGION.default,
      lang: env.LANGUAGE_CODE || envVars.LANGUAGE_CODE.default,
      welcomeEvent: env.WELCOME_EVENT || envVars.WELCOME_EVENT.default,
      bargein: true,
      eventHook: '/dialogflow-event',
      actionHook: '/dialogflow-action',
      events: ['intent', 'transcription', 'dtmf', 'no-input', 'start-play', 'stop-play'],
    })
    .send();
});

/**
 * Walks a Dialogflow CX intent/event payload looking for a custom payload of the
 * shape { transfer: { number } } in any fulfillment/response message.
 */
function findTransferNumber(data: Record<string, unknown> | undefined): string | undefined {
  if (!data) return undefined;

  const queryResult =
    (data.query_result as Record<string, unknown> | undefined) ??
    ((data.detect_intent_response as Record<string, unknown> | undefined)
      ?.query_result as Record<string, unknown> | undefined);
  if (!queryResult) return undefined;

  const messages = [
    ...((queryResult.response_messages as unknown[]) ?? []),
    ...((queryResult.fulfillment_messages as unknown[]) ?? []),
  ];

  for (const msg of messages) {
    const payload = (msg as Record<string, unknown>)?.payload as
      | Record<string, unknown>
      | undefined;
    const transfer = payload?.transfer as Record<string, unknown> | undefined;
    if (transfer?.number) return transfer.number as string;
  }
  return undefined;
}

logger.info({ port }, 'jambonz dialogflow/cx example listening');
