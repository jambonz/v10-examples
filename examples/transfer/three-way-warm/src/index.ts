import * as http from 'node:http';
import pino from 'pino';
import { createEndpoint } from '@jambonz/sdk/websocket';
import { JambonzClient } from '@jambonz/sdk/client';

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
const port = parseInt(process.env.PORT || '3000', 10);

const conferenceName = process.env.CONFERENCE_NAME || 'transfer-demo-room';
const threeWayTarget = process.env.THREE_WAY_TARGET || '+15085551212';

// REST config used to originate the specialist's leg into the conference.
const baseUrl = process.env.JAMBONZ_REST_API_BASE_URL;
const accountSid = process.env.JAMBONZ_ACCOUNT_SID;
const apiKey = process.env.JAMBONZ_API_KEY;

// Public ws(s):// URL of THIS app, so jambonz can drive the outbound
// specialist leg back to the /specialist path below.
const publicWsUrl = (process.env.PUBLIC_WS_URL || `ws://localhost:${port}`).replace(/\/+$/, '');

// Speech settings for the outbound leg — required by createCall when no
// application_sid is used. Override to match your account's configured vendor.
const speechSynthesisVendor = process.env.SPEECH_SYNTHESIS_VENDOR || 'google';
const speechSynthesisLanguage = process.env.SPEECH_SYNTHESIS_LANGUAGE || 'en-US';
const speechSynthesisVoice = process.env.SPEECH_SYNTHESIS_VOICE || 'en-US-Standard-C';
const speechRecognizerVendor = process.env.SPEECH_RECOGNIZER_VENDOR || 'google';
const speechRecognizerLanguage = process.env.SPEECH_RECOGNIZER_LANGUAGE || 'en-US';

const client = baseUrl && accountSid && apiKey
  ? new JambonzClient({ baseUrl, accountSid, apiKey })
  : null;

if (!client) {
  logger.warn('REST API not configured; the specialist will not be dialed into the conference');
}

const server = http.createServer();
const makeService = createEndpoint({ server, port });

// Caller flow: the inbound caller joins the conference, and we originate an
// outbound call that brings the specialist into the same room (three-way).
makeService({ path: '/' }).on('session:new', (session) => {
  const log = logger.child({ call_sid: session.callSid });
  log.info({ from: session.from, to: session.to, conferenceName, threeWayTarget }, 'new call');

  session
    .on('close', (code: number) => {
      log.info({ code }, 'session closed');
    })
    .on('error', (err: Error) => {
      log.error(err, 'session error');
    })
    .on('/conference-end', (evt: Record<string, unknown>) => {
      log.info({ payload: evt }, 'conference ended');
      session.hangup().reply();
    });

  session
    .say({ text: 'Bringing you into a three-way call with a specialist. Please hold.' })
    .conference({
      name: conferenceName,
      beep: true,
      startConferenceOnEnter: true,
      endConferenceOnExit: false,
      actionHook: '/conference-end',
      statusEvents: ['join', 'leave'],
      statusHook: '/conference-status',
    })
    .send();

  // Bring the specialist into the same conference on a second, outbound leg.
  if (!client) return;

  client.calls
    .create({
      from: session.to, // present the dialed DID as the caller ID
      to: { type: 'phone', number: threeWayTarget },
      call_hook: `${publicWsUrl}/specialist`,
      speech_synthesis_vendor: speechSynthesisVendor,
      speech_synthesis_language: speechSynthesisLanguage,
      speech_synthesis_voice: speechSynthesisVoice,
      speech_recognizer_vendor: speechRecognizerVendor,
      speech_recognizer_language: speechRecognizerLanguage,
    })
    .then((callSid) => {
      log.info({ callSid }, 'specialist call originated');
      return callSid;
    })
    .catch((err) => {
      log.error(err, 'failed to originate specialist call');
    });
});

// Specialist flow (the outbound leg): answer and join the same conference.
makeService({ path: '/specialist' }).on('session:new', (session) => {
  const log = logger.child({ call_sid: session.callSid });
  log.info({ from: session.from, to: session.to, conferenceName }, 'specialist answered — joining');

  session
    .on('close', (code: number) => {
      log.info({ code }, 'specialist session closed');
    })
    .on('error', (err: Error) => {
      log.error(err, 'specialist session error');
    });

  session
    .answer()
    .say({ text: 'Connecting you into the call now.' })
    .conference({
      name: conferenceName,
      startConferenceOnEnter: true,
      endConferenceOnExit: false,
    })
    .send();
});

logger.info({ port }, 'three-way warm transfer example listening');
