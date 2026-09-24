import * as http from 'node:http';
import pino from 'pino';
import { createEndpoint } from '@jambonz/sdk/websocket';

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

const envVars = {
  DIAL_TARGET: {
    type: 'string' as const,
    description: 'Phone number in E.164 format to bridge the caller to',
    default: '+15551234567',
    required: true,
  },
  STT_VENDOR: {
    type: 'string' as const,
    description: 'Speech-to-text vendor used for both legs',
    enum: ['deepgram', 'google', 'microsoft', 'aws', 'assemblyai'],
    default: 'deepgram',
  },
  STT_LANGUAGE: {
    type: 'string' as const,
    description: 'Recognition language',
    default: 'en-US',
  },
};

const port = parseInt(process.env.PORT || '3000', 10);
const server = http.createServer();
const makeService = createEndpoint({ server, port, envVars });
const svc = makeService({ path: '/' });

interface Speech {
  is_final?: boolean;
  channel_tag?: number;
  alternatives?: { transcript?: string; confidence?: number }[];
}

svc.on('session:new', (session) => {
  const log = logger.child({ call_sid: session.callSid });
  log.info({ from: session.from, to: session.to }, 'new call');

  const env = (session.data.env_vars || {}) as Record<string, string>;
  const target = env.DIAL_TARGET || '+15551234567';
  const vendor = env.STT_VENDOR || 'deepgram';
  const language = env.STT_LANGUAGE || 'en-US';

  // transcript log, both legs interleaved in arrival order
  const transcript: { speaker: string; text: string }[] = [];

  session
    .on('close', (code: number) => {
      log.info({ code, turns: transcript.length }, 'session closed');
    })
    .on('error', (err: Error) => {
      log.error(err, 'session error');
    })
    .on('/transcription', (evt: Record<string, unknown>) => {
      const speech = evt.speech as Speech | undefined;
      if (!speech?.is_final) return;

      const text = speech.alternatives?.[0]?.transcript;
      if (!text) return;

      // channel 1 is the A-leg (caller), channel 2 the B-leg (called party)
      const speaker = speech.channel_tag === 2 ? 'callee' : 'caller';
      transcript.push({ speaker, text });
      log.info({ speaker, text, confidence: speech.alternatives?.[0]?.confidence }, 'final transcript');
    })
    .on('/dial-complete', (evt: Record<string, unknown>) => {
      log.info({ dialStatus: evt.dial_call_status, transcript }, 'dial complete');
      session.hangup().reply();
    });

  session
    .say({ text: 'Connecting your call. This conversation will be transcribed.' })
    .dial({
      callerId: session.from,
      target: [{ type: 'phone', number: target }],
      actionHook: '/dial-complete',
      timeout: 30,
      answerOnBridge: true,
      // nested transcribe runs for the life of the bridge; omitting `channel`
      // transcribes both legs with a separate recognizer each
      transcribe: {
        transcriptionHook: '/transcription',
        recognizer: {
          vendor,
          language,
          separateRecognitionPerChannel: true,
        },
      },
    })
    .send();
});

logger.info({ port }, 'jambonz dial/transcribe-both-legs example listening');
