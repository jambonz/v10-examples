import * as http from 'node:http';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import pino from 'pino';
import { createEndpoint } from '@jambonz/sdk/websocket';
import { translateText } from './translate.js';

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

const msLanguages = [
  'en-US', 'es-ES', 'es-MX', 'fr-FR', 'de-DE', 'it-IT', 'pt-BR', 'pt-PT',
  'zh-CN', 'zh-TW', 'ja-JP', 'ko-KR', 'ar-SA', 'hi-IN', 'ru-RU', 'uk-UA',
  'pl-PL', 'nl-NL', 'sv-SE', 'da-DK', 'nb-NO', 'fi-FI', 'tr-TR', 'el-GR',
  'he-IL', 'th-TH', 'vi-VN', 'id-ID', 'ms-MY', 'tl-PH', 'cs-CZ', 'ro-RO',
  'hu-HU', 'sk-SK', 'bg-BG', 'hr-HR', 'ca-ES', 'cy-GB',
];

const envVars = {
  CALLER_LANGUAGE: {
    type: 'string' as const,
    description: 'Language of the caller (BCP-47)',
    enum: msLanguages,
    default: 'en-US',
  },
  CALLER_TTS_VOICE: {
    type: 'string' as const,
    description: 'Microsoft TTS voice for the caller',
    default: 'en-US-JennyNeural',
  },
  CALLED_LANGUAGE: {
    type: 'string' as const,
    description: 'Language of the called party (BCP-47)',
    enum: msLanguages,
    default: 'es-ES',
  },
  CALLED_TTS_VOICE: {
    type: 'string' as const,
    description: 'Microsoft TTS voice for the called party',
    default: 'es-ES-ElviraNeural',
  },
  GOOGLE_JSON_KEY: {
    type: 'string' as const,
    description: 'Google service account JSON key for Translate API',
    required: true,
    uiHint: 'filepicker' as const,
  },
};

const port = parseInt(process.env.PORT || '3000', 10);
const server = http.createServer();
const makeService = createEndpoint({ server, port, envVars });
const svc = makeService({ path: '/' });

svc.on('session:new', (session) => {
  const log = logger.child({ call_sid: session.callSid });
  log.info({ from: session.from, to: session.to }, 'new call');

  const env = (session.data.env_vars ?? {}) as Record<string, string>;
  const callerLang = env.CALLER_LANGUAGE || 'en-US';
  const calledLang = env.CALLED_LANGUAGE || 'es-ES';
  const callerTtsVoice = env.CALLER_TTS_VOICE || 'en-US-JennyNeural';
  const calledTtsVoice = env.CALLED_TTS_VOICE || 'es-ES-ElviraNeural';

  /* Write the Google JSON key to a temp file so the client library can find it */
  if (env.GOOGLE_JSON_KEY && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    const tmpPath = path.join(os.tmpdir(), `gcloud-key-${session.callSid}.json`);
    fs.writeFileSync(tmpPath, env.GOOGLE_JSON_KEY);
    process.env.GOOGLE_APPLICATION_CREDENTIALS = tmpPath;
    log.info('wrote Google credentials to temp file');
  }

  const recognizerA = { vendor: 'microsoft', language: callerLang };
  const recognizerB = { vendor: 'microsoft', language: calledLang };
  const synthesizerA = { vendor: 'microsoft', language: callerLang, voice: callerTtsVoice };
  const synthesizerB = { vendor: 'microsoft', language: calledLang, voice: calledTtsVoice };

  session
    .on('close', (code: number) => {
      log.info({ code }, 'session closed');
    })
    .on('error', (err: Error) => {
      log.error(err, 'session error');
    });

  /* Prompt for phone number */
  session.on('/collect-digits', (evt: Record<string, unknown>) => {
    const digits = evt.digits as string | undefined;
    log.info({ digits, reason: evt.reason }, 'gather result');

    if (evt.reason !== 'dtmfDetected' || !digits) {
      session
        .say({
          text: 'I did not receive any digits. Please try again.',
          synthesizer: synthesizerA,
        })
        .gather({
          input: ['digits'],
          finishOnKey: '#',
          actionHook: '/collect-digits',
          say: {
            text: 'Please enter the phone number to call, followed by the pound key.',
            synthesizer: synthesizerA,
          },
        })
        .reply();
      return;
    }

    const numberToDial = `+${digits}`;
    log.info({ numberToDial }, 'starting translation bridge');

    /* Capture B-leg call_sid when it connects */
    session.on('call:status', (statusEvt: Record<string, unknown>) => {
      if (!session.locals.call_sid_b && statusEvt.direction === 'outbound') {
        session.locals.call_sid_b = statusEvt.call_sid as string;
        log.info({ callSidB: statusEvt.call_sid }, 'B-leg connected');
      }
    });

    /* A-leg transcription → translate → speak on B-leg dub track */
    session.on('/transcription-a', (txEvt: Record<string, unknown>) => {
      const speech = txEvt.speech as { alternatives?: { transcript?: string }[] } | undefined;
      const transcript = speech?.alternatives?.[0]?.transcript;
      session.reply();

      const callSidB = session.locals.call_sid_b as string | undefined;
      if (!transcript || !callSidB) return;

      log.info({ transcript }, 'A says');
      translateText(transcript, callerLang, calledLang)
        .then((translation) => {
          if (!translation) return undefined;
          log.info({ translation }, 'B hears');
          session.injectCommand('dub', {
            action: 'sayOnTrack',
            track: 'b',
            say: { text: translation, synthesizer: synthesizerB },
          }, callSidB);
          return undefined;
        })
        .catch((err) => log.error(err, 'translation error A→B'));
    });

    /* B-leg transcription → translate → speak on A-leg dub track */
    session.on('/transcription-b', (txEvt: Record<string, unknown>) => {
      const speech = txEvt.speech as { alternatives?: { transcript?: string }[] } | undefined;
      const transcript = speech?.alternatives?.[0]?.transcript;
      session.reply();

      if (!transcript) return;

      log.info({ transcript }, 'B says');
      translateText(transcript, calledLang, callerLang)
        .then((translation) => {
          if (!translation) return undefined;
          log.info({ translation }, 'A hears');
          session.injectCommand('dub', {
            action: 'sayOnTrack',
            track: 'a',
            say: { text: translation, synthesizer: synthesizerA },
          });
          return undefined;
        })
        .catch((err) => log.error(err, 'translation error B→A'));
    });

    session.on('/dial-complete', (dialEvt: Record<string, unknown>) => {
      log.info({ status: dialEvt.dial_call_status }, 'dial complete');
      session.hangup().reply();
    });

    /* Set up A-leg transcription + dub, then dial B-leg */
    session
      .config({
        boostAudioSignal: '-20 dB',
        recognizer: recognizerA,
        transcribe: {
          enable: true,
          transcriptionHook: '/transcription-a',
        },
      })
      .dub({ action: 'addTrack', track: 'a' })
      .say({
        text: 'Connecting your call with real-time translation.',
        synthesizer: synthesizerA,
      })
      .dial({
        callerId: session.from,
        target: [{ type: 'phone', number: numberToDial }],
        boostAudioSignal: '-20 dB',
        transcribe: {
          transcriptionHook: '/transcription-b',
          channel: 2,
          recognizer: recognizerB,
        },
        dub: [{ action: 'addTrack', track: 'b' }],
        actionHook: '/dial-complete',
        timeout: 30,
      })
      .reply();
  });

  /* Initial prompt */
  session
    .pause({ length: 1 })
    .gather({
      input: ['digits'],
      finishOnKey: '#',
      actionHook: '/collect-digits',
      say: {
        text: 'Please enter the phone number to call, followed by the pound key.',
        synthesizer: synthesizerA,
      },
    })
    .say({
      text: 'We did not receive any digits. Goodbye.',
      synthesizer: synthesizerA,
    })
    .hangup()
    .send();
});

logger.info({ port }, 'jambonz transcribe/realtime-translator listening');
