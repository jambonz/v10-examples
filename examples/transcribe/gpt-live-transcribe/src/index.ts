import * as http from 'node:http';
import pino from 'pino';
import { createEndpoint } from '@jambonz/sdk/websocket';

/*
 * Real-time transcription with OpenAI's gpt-live-transcribe.
 *
 * This model is client-endpointed: it does not support OpenAI's server-side
 * turn detection (the API rejects a turn_detection block), so jambonz ends
 * each utterance itself using a local voice-activity detector on the media
 * server and tells OpenAI when to finalize. The vadSilenceMs / vadVoiceMs /
 * vadMode options below tune that detector.
 *
 * It also accepts fields the other OpenAI STT models do not: keywords
 * (literal term hints — defaults to the recognizer's hints when unset),
 * delay (the latency/accuracy trade-off), and languages (a list, replacing
 * the singular language).
 */

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
const port = parseInt(process.env.PORT || '3000', 10);

const server = http.createServer();
const makeService = createEndpoint({ server, port });
const svc = makeService({ path: '/' });

svc.on('session:new', (session) => {
  const log = logger.child({ call_sid: session.callSid });
  log.info({ from: session.from, to: session.to }, 'new call');

  session
    .on('close', (code: number) => {
      log.info({ code }, 'session closed');
    })
    .on('error', (err: Error) => {
      log.error(err, 'session error');
    })
    .on('/transcription', (evt: Record<string, unknown>) => {
      const transcript = evt.transcript as string | undefined;
      const is_final = evt.is_final as boolean | undefined;
      if (!transcript) return;
      if (is_final) {
        log.info({ transcript }, 'final transcription');
      } else {
        log.debug({ transcript }, 'partial transcript');
      }
    });

  session
    .say({ text: 'Your call is now being transcribed by G P T live transcribe.' })
    .transcribe({
      transcriptionHook: '/transcription',
      recognizer: {
        vendor: 'openai',
        language: 'en-US',
        interim: true,
        openaiOptions: {
          model: 'gpt-live-transcribe',
          // literal term hints the model should be primed for; when unset,
          // the recognizer's hints are used instead
          keywords: ['jambonz', 'drachtio', 'SIP'],
          // latency/accuracy trade-off: minimal | low | medium | high | xhigh
          delay: 'low',
          // local VAD: milliseconds of silence that ends an utterance and
          // finalizes its transcript (defaults shown)
          vadSilenceMs: 500,
          vadVoiceMs: 250,
        },
      },
    })
    .send();
});

logger.info({ port }, 'jambonz transcribe/gpt-live-transcribe example listening');
