import http from 'http';
import { readFileSync } from 'fs';
import { createEndpoint } from '@jambonz/sdk/websocket';
import pino from 'pino';

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
const port = parseInt(process.env.PORT || '3000', 10);

/* Google service-account JSON key; required */
const keyfile = process.env.DIALOGFLOW_KEYFILE;
if (!keyfile) {
  logger.error('DIALOGFLOW_KEYFILE is required (path to a Google service-account JSON key)');
  process.exit(1);
}
const credentials = JSON.parse(readFileSync(keyfile, 'utf8')) as Record<string, unknown>;

const dfConfig = {
  project: process.env.DIALOGFLOW_PROJECT || (credentials.project_id as string),
  agent: process.env.DIALOGFLOW_AGENT || '99e7b4c8-259c-4de4-b9da-cb44dc42b792',
  region: process.env.DIALOGFLOW_REGION || 'us-central1',
  model: (process.env.DIALOGFLOW_MODEL || 'cx') as 'es' | 'cx' | 'ces',
  lang: process.env.DIALOGFLOW_LANG || 'en-US',
  // ?? so DIALOGFLOW_GREETING="" disables the say-greeting
  greeting: process.env.DIALOGFLOW_GREETING ?? 'Hi! How can I help you today?',
  welcomeEvent: process.env.DIALOGFLOW_WELCOME_EVENT || '',
};

/* toolHook replies carry raw JSON (not verbs), so we ack manually via the
 * session's wsSend/msgid — typed private in the SDK, hence this cast */
interface RawAck {
  msgid: string;
  wsSend(msg: { type: string; msgid: string; data: Record<string, unknown> }): void;
}

const server = http.createServer();
const makeService = createEndpoint({ server, port });
const svc = makeService({ path: '/dialogflow' });

svc.on('session:new', (session) => {
  const log = logger.child({ callSid: session.callSid });
  log.info({ from: session.from, to: session.to, agent: dfConfig.agent }, 'new dialogflow call');

  session
    .on('close', (code: number) => log.info({ code }, 'session closed'))
    .on('error', (err: Error) => log.error(err, 'session error'))
    .on('/eventHook', (evt: Record<string, unknown>) => {
      const { event, data } = evt as { event: string; data?: Record<string, unknown> };
      switch (event) {
        case 'transcription': {
          const rr = data?.recognition_result as { transcript?: string } | undefined;
          log.info({ transcript: rr?.transcript }, 'caller said');
          break;
        }
        case 'intent':
          log.info('intent received');
          break;
        default:
          log.info({ event }, 'dialogflow event');
      }
      session.reply();
    })
    .on('/toolHook', (evt: Record<string, unknown>) => {
      const tc = (evt.tool_call ?? {}) as
        { tool?: string; action?: string; input_parameters?: Record<string, unknown> };
      log.info({ action: tc.action, input: tc.input_parameters }, 'tool call requested');

      /* The Airline Support agent's tools have no backend by design — the
       * client (this app) invents the results */
      let data: Record<string, unknown>;
      switch (tc.action) {
        case 'getGeolocation':
          data = { outputParameters: {
            city: 'New York', country: 'United States', country_code: 'us', postcode: '10001',
          } };
          break;
        case 'getFlights': {
          const p = tc.input_parameters ?? {};
          data = { outputParameters: { flights: [
            { flight_number: 'CA101', origin: p.origin ?? 'JFK', destination: p.destination ?? 'CDG',
              departure_time: '08:30', arrival_time: '21:45', price_usd: 640 },
            { flight_number: 'CA205', origin: p.origin ?? 'JFK', destination: p.destination ?? 'CDG',
              departure_time: '17:10', arrival_time: '06:25', price_usd: 545 },
          ] } };
          break;
        }
        default:
          data = { error: `no client-side handler for tool action '${tc.action}'` };
      }
      log.info({ data }, 'returning tool result');
      const raw = session as unknown as RawAck;
      raw.wsSend({ type: 'ack', msgid: raw.msgid, data });
    })
    .on('/actionHook', (evt: Record<string, unknown>) => {
      log.info({ result: evt.dialogflow_result ?? evt.dialogflowResult }, 'dialogflow session ended');
      session.hangup().reply();
    });

  /* Greet first: the agent's own welcome event when configured, else a say */
  if (!dfConfig.welcomeEvent && dfConfig.greeting) {
    session.say({ text: dfConfig.greeting });
  }

  session
    .dialogflow({
      credentials,
      project: dfConfig.project,
      agent: dfConfig.agent,
      region: dfConfig.region,
      model: dfConfig.model,
      lang: dfConfig.lang,
      ...(dfConfig.welcomeEvent && { welcomeEvent: dfConfig.welcomeEvent }),
      events: ['intent', 'transcription', 'tool-calls', 'start-play', 'stop-play', 'no-input'],
      eventHook: '/eventHook',
      actionHook: '/actionHook',
      /* toolHook is newer than the SDK's DialogflowVerb type */
      ...({ toolHook: '/toolHook' } as Record<string, unknown>),
    })
    .send();
});

logger.info({ port }, 'jambonz dialogflow/airline-tools example listening');
