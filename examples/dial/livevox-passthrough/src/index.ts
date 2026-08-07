import * as http from 'node:http';
import pino from 'pino';
import { createEndpoint } from '@jambonz/sdk/websocket';

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

/**
 * Application variables — discoverable by the jambonz portal via an OPTIONS request
 * and delivered at runtime in `session.data.env_vars`. Everything that differs
 * between staging and production lives here, so switching carriers is a portal
 * change rather than a code change.
 */
const envVars = {
  CARRIER: {
    type: 'string' as const,
    description: 'Outbound SIP trunk (carrier) to route the call to',
    default: 'Livevox - staging',
    jambonzResource: 'carriers' as const,
  },
  CALLER_ID: {
    type: 'string' as const,
    description: 'Caller ID presented on the outbound INVITE',
    default: '+15082139758',
  },
  LIVEVOX_NUMBER: {
    type: 'string' as const,
    description: 'Last-resort destination number, used only when no X-LiveVox-Destination header ' +
      'is present and the dialed number is unusable',
    default: '',
  },
};

/** Custom headers carrying the destination, in priority order. Deliberately excludes Diversion. */
const DESTINATION_HEADERS = ['x-livevox-destination', 'x-prodigal-destination'];

/** Any inbound header whose (lowercased) name starts with one of these is forwarded verbatim. */
const FORWARD_PREFIXES = ['x-livevox', 'x-prodigal'];

const port = parseInt(process.env.PORT || '3000', 10);
const server = http.createServer();
const makeService = createEndpoint({ server, port, envVars });
const svc = makeService({ path: '/' });

/**
 * Case-insensitive header lookup. jambonz delivers the parsed INVITE headers with
 * lowercased names, but we do not rely on that.
 */
const getHeader = (headers: Record<string, string>, name: string): string | undefined => {
  const wanted = name.toLowerCase();
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === wanted) return value;
  }
  return undefined;
};

/**
 * Every X-LiveVox* / X-Prodigal* header from the inbound INVITE, name and value
 * preserved exactly as received, ready to hand to the dial verb's `headers` property.
 */
const collectForwardedHeaders = (headers: Record<string, string>): Record<string, string> => {
  const forwarded: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    const lower = key.toLowerCase();
    if (FORWARD_PREFIXES.some((prefix) => lower.startsWith(prefix))) forwarded[key] = value;
  }
  return forwarded;
};

/**
 * Tolerate the shapes a dialable number arrives in from an upstream switch:
 * a bare number, `<tel:+15551234567>`, or `sip:15551234567@host;user=phone`.
 * Returns undefined if nothing usable is left.
 */
const normalizeNumber = (raw?: string): string | undefined => {
  if (!raw) return undefined;
  let value = raw.trim().replace(/^<|>$/g, '');
  value = value.replace(/^(tel|sip|sips):/i, '');
  value = value.split('@')[0].split(';')[0].trim();
  return value.length > 0 ? value : undefined;
};

svc.on('session:new', (session) => {
  const log = logger.child({ call_sid: session.callSid });

  const env = session.data.env_vars ?? {};
  const trunk = env.CARRIER || (envVars.CARRIER.default as string);
  const callerId = env.CALLER_ID || (envVars.CALLER_ID.default as string);
  const fallbackNumber = env.LIVEVOX_NUMBER || undefined;

  const headers = session.data.sip?.headers ?? {};
  const forwardedHeaders = collectForwardedHeaders(headers);

  // Destination priority: custom header, then the dialed number, then the configured fallback.
  let destination: string | undefined;
  let destinationSource: string | undefined;
  for (const name of DESTINATION_HEADERS) {
    const candidate = normalizeNumber(getHeader(headers, name));
    if (candidate) {
      destination = candidate;
      destinationSource = name;
      break;
    }
  }
  if (!destination) {
    destination = normalizeNumber(session.to);
    if (destination) destinationSource = 'to';
  }
  if (!destination) {
    destination = normalizeNumber(fallbackNumber);
    if (destination) destinationSource = 'env_vars.LIVEVOX_NUMBER';
  }

  log.info({
    from: session.from,
    to: session.to,
    destination,
    destinationSource,
    trunk,
    callerId,
    forwardedHeaders,
  }, 'new call');

  session
    .on('close', (code: number) => {
      log.info({ code }, 'session closed');
    })
    .on('error', (err: Error) => {
      log.error(err, 'session error');
    })
    .on('/dial-complete', (evt: Record<string, unknown>) => {
      log.info({
        dialStatus: evt.dial_call_status,
        sipStatus: evt.dial_sip_status,
        callSid: evt.dial_call_sid,
        duration: evt.dial_call_duration,
        payload: evt,
      }, 'dial complete');
      session.hangup().reply();
    });

  if (!destination) {
    log.warn({ from: session.from, to: session.to }, 'no destination resolved — hanging up');
    session.hangup().send();
    return;
  }

  session
    .dial({
      answerOnBridge: true,
      anchorMedia: true,
      timeout: 30,
      callerId,
      actionHook: '/dial-complete',
      headers: forwardedHeaders,
      target: [{ type: 'phone', number: destination, trunk }],
    })
    .send();
});

logger.info({ port }, 'jambonz dial/livevox-passthrough example listening');
