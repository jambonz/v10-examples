import http from 'http';
import { createEndpoint } from '@jambonz/sdk/websocket';
import pino from 'pino';

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
const port = parseInt(process.env.PORT || '3000', 10);

const SYSTEM_PROMPT = `You are a friendly and helpful voice assistant for Jambonz Mobile.
Keep your responses concise and conversational.
You are speaking via voice, so respond in plain prose with no markdown.`;

const envVars = {
  VOICELIVE_API_KEY: {
    type: 'string' as const,
    description: 'Azure Voice Live API key (Keys and Endpoint on your Foundry resource)',
    required: true,
    obscure: true,
  },
  VOICELIVE_HOST: {
    type: 'string' as const,
    description: 'Resource hostname, e.g. my-resource.services.ai.azure.com (no https://, no trailing /)',
    required: true,
  },
  VOICELIVE_MODEL: {
    type: 'string' as const,
    description: 'gpt-realtime-2.1 for native speech-to-speech, or a text model such as '
      + 'gpt-4.1 to run cascaded (Azure STT -> LLM -> Azure TTS)',
    required: false,
  },
};

const server = http.createServer();
const makeService = createEndpoint({ server, port, envVars });
const svc = makeService({ path: '/' });

svc.on('session:new', (session) => {
  const log = logger.child({ callSid: session.callSid });
  log.info({ from: session.from, to: session.to }, 'new call');

  const apiKey = session.data.env_vars?.VOICELIVE_API_KEY?.trim();
  const host = session.data.env_vars?.VOICELIVE_HOST?.trim();
  const model = session.data.env_vars?.VOICELIVE_MODEL?.trim() || 'gpt-realtime-2.1';

  session
    .on('close', (code: number) => {
      log.info({ code }, 'session closed');
    })
    .on('error', (err: Error) => {
      log.error(err, 'session error');
    })
    .on('/s2s-complete', (evt: Record<string, unknown>) => {
      log.info(evt, 's2s complete');
      session.reply();
    });

  session
    .s2s({
      vendor: 'voicelive',
      // gpt-realtime-2.1 answers in its own voice; a text model such as gpt-4.1 runs
      // cascaded, where Azure STT and the voice below do all the audio work.
      model,
      auth: {
        apiKey,
      },
      // The Voice Live endpoint is resource-specific, so host is required.
      // apiVersion defaults to 2026-04-10.
      connectOptions: {
        host,
      },
      // voicelive requires BOTH session_update and response_create. session_update is
      // sent verbatim in Voice Live's FLAT shape — voice, turn_detection and modalities
      // at the top level, NOT nested under audio.input/audio.output the way the OpenAI
      // Realtime GA format has them. Do not set audio formats; jambonz negotiates those.
      llmOptions: {
        session_update: {
          modalities: ['text', 'audio'],
          instructions: SYSTEM_PROMPT,
          // An Azure TTS voice, declared as an object rather than an id string.
          // 'azure-standard' covers Neural, HD and MAI voices; HD voices also take
          // a temperature, and any voice takes a rate between 0.5 and 1.5.
          voice: {
            name: 'en-US-Ava:DragonHDLatestNeural',
            type: 'azure-standard',
            temperature: 0.8,
          },
          // Azure-only: decides end-of-turn from meaning rather than volume, and
          // drops filler words so an "umm" does not trigger barge-in.
          turn_detection: {
            type: 'azure_semantic_vad',
            threshold: 0.5,
            silence_duration_ms: 500,
            remove_filler_words: true,
          },
          // Azure-only: server-side noise suppression, which also improves the
          // accuracy of interruption and end-of-turn detection.
          input_audio_noise_reduction: {
            type: 'azure_deep_noise_suppression',
          },
        },
        response_create: {
          instructions: 'Greet the caller warmly, introduce yourself as the Jambonz Mobile assistant, '
            + 'and ask how you can help.',
        },
      },
      actionHook: '/s2s-complete',
    })
    .send();
});

logger.info({ port }, 'jambonz s2s/voicelive example listening');
