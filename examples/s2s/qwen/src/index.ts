import http from 'http';
import { createEndpoint } from '@jambonz/sdk/websocket';
import pino from 'pino';

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
const port = parseInt(process.env.PORT || '3000', 10);

const envVars = {
  DASHSCOPE_API_KEY: {
    type: 'string' as const,
    description: 'Alibaba Model Studio (DashScope) API key',
    required: true,
    obscure: true,
  },
  DASHSCOPE_HOST: {
    type: 'string' as const,
    description: 'DashScope endpoint host (default: dashscope-intl.aliyuncs.com; '
      + 'use ws-<workspaceId>.<region>.maas.aliyuncs.com for a workspace-scoped '
      + 'endpoint, or dashscope.aliyuncs.com for the China/Beijing region — keys '
      + 'are region-bound)',
    required: false,
  },
};

const server = http.createServer();
const makeService = createEndpoint({ server, port, envVars });
const svc = makeService({ path: '/' });

svc.on('session:new', (session) => {
  const log = logger.child({ callSid: session.callSid });
  log.info({ from: session.from, to: session.to }, 'new call');

  const apiKey = session.data.env_vars?.DASHSCOPE_API_KEY?.trim();
  const host = session.data.env_vars?.DASHSCOPE_HOST?.trim();

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
    .qwen_s2s({
      model: 'qwen3.5-omni-flash-realtime',
      auth: {
        apiKey,
        ...(host && { host }),
      },
      llmOptions: {
        session_update: {
          modalities: ['text', 'audio'],
          voice: 'Ethan',
          instructions: 'You are a friendly and helpful voice assistant. '
            + 'Keep your responses concise and conversational.',
          turn_detection: {
            type: 'semantic_vad',
            threshold: 0.5,
            silence_duration_ms: 800,
          },
        },
        /* the agent speaks first: response_create triggers an immediate
         * response after the session is configured. Omit it and the agent
         * stays silent until the caller speaks. */
        response_create: {
          instructions: 'Greet the caller warmly and ask how you can help them today.',
        },
      },
      actionHook: '/s2s-complete',
    })
    .send();
});

logger.info({ port }, 'jambonz s2s/qwen example listening');
