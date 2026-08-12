import http from 'http';
import { createEndpoint } from '@jambonz/sdk/websocket';
import pino from 'pino';

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
const port = parseInt(process.env.PORT || '3000', 10);

/* Deepgram Flux TTS models follow the pattern flux-{voice}-{language} */
const fluxTtsModels = [
  'flux-alexis-en', 'flux-haley-en', 'flux-heather-en', 'flux-cole-en',
  'flux-priya-en', 'flux-jack-en', 'flux-bruce-en', 'flux-rufus-en',
  'flux-drew-en', 'flux-renee-en', 'flux-marcus-en', 'flux-sharon-en',
];

const envVars = {
  DEEPGRAM_FLUX_TTS_MODEL: {
    type: 'string' as const,
    description: 'Deepgram Flux TTS model (voice) used to speak back',
    enum: fluxTtsModels,
    default: 'flux-alexis-en',
  },
  DEEPGRAM_FLUX_EOT_THRESHOLD: {
    type: 'string' as const,
    description: 'End-of-turn confidence threshold (0-1); higher waits longer before ending the turn',
    default: '0.7',
  },
};

const server = http.createServer();
const makeService = createEndpoint({ server, port, envVars });
const svc = makeService({ path: '/' });

svc.on('session:new', (session) => {
  const log = logger.child({ callSid: session.callSid });
  log.info({ from: session.from, to: session.to }, 'new call');

  const env = (session.data.env_vars ?? {}) as Record<string, string>;
  const ttsModel = env.DEEPGRAM_FLUX_TTS_MODEL || 'flux-alexis-en';
  const eotThreshold = parseFloat(env.DEEPGRAM_FLUX_EOT_THRESHOLD || '0.7');

  /* Flux STT is turn-based: jambonz returns the final transcript on Deepgram's
   * EndOfTurn event, so no gather timeout tuning is needed for end-of-speech */
  const recognizer = {
    vendor: 'deepgramflux',
    language: 'en',
    deepgramOptions: {
      model: 'flux-general-en',
      eotThreshold,
    },
  };

  /* Flux TTS: the voice IS the model (flux-{voice}-en), no separate language */
  const synthesizer = {
    vendor: 'deepgramflux',
    voice: ttsModel,
  };

  session
    .on('close', (code: number) => {
      log.info({ code }, 'session closed');
    })
    .on('error', (err: Error) => {
      log.error(err, 'session error');
    })
    .on('/echo', (evt: Record<string, unknown>) => {
      log.debug({ reason: evt.reason }, 'gather event');

      switch (evt.reason) {
        case 'speechDetected': {
          const speech = evt.speech as { alternatives: { transcript: string; confidence?: number }[] };
          const { transcript, confidence } = speech.alternatives[0];
          log.info({ transcript, confidence }, 'speech detected');

          session
            .say({
              text: confidence
                ? `You said: ${transcript}. The confidence score was ${confidence.toFixed(2)}.`
                : `You said: ${transcript}.`,
              synthesizer,
            })
            .gather({
              input: ['speech'],
              actionHook: '/echo',
              timeout: 15,
              recognizer,
              say: { text: 'Please say something else.', synthesizer },
            })
            .reply();
          break;
        }
        case 'timeout':
          session
            .gather({
              input: ['speech'],
              actionHook: '/echo',
              timeout: 15,
              recognizer,
              say: { text: 'Are you still there? I didn\'t hear anything.', synthesizer },
            })
            .reply();
          break;
        default:
          session.reply();
          break;
      }
    });

  session
    .pause({ length: 1 })
    .gather({
      input: ['speech'],
      actionHook: '/echo',
      timeout: 15,
      recognizer,
      say: { text: 'Please say something and I will echo it back to you.', synthesizer },
    })
    .send();
});

logger.info({ port }, 'jambonz gather/echo-deepgramflux example listening');
