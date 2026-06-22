import * as http from 'node:http';
import pino from 'pino';
import { createEndpoint } from '@jambonz/sdk/websocket';

// Layer-1 handoff on the cascaded `agent` verb (Deepgram STT/TTS + OpenAI LLM).
// The `handoff` block auto-injects a `transfer_to_human` tool into the LLM's
// toolset; when the caller asks for a human, the model calls it and jambonz runs
// the packaged transfer to the destination (default xhoaluu2@sip.jambonz.me) —
// no tool webhook needed.

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
const port = parseInt(process.env.PORT || '3000', 10);

const envVars = {
  OPENAI_API_KEY: {
    type: 'string' as const,
    description: 'OpenAI API key (for the agent LLM)',
    required: true,
    obscure: true,
  },
  HANDOFF_TARGET: {
    type: 'string' as const,
    description: 'SIP user or phone to hand off to',
    default: 'xhoaluu2@sip.jambonz.me',
  },
};

const SYSTEM_PROMPT = [
  'You are a friendly support assistant for a phone line.',
  'Greet the caller in one short sentence and ask how you can help.',
  'When the caller asks to speak to a human, a person, or an agent — or says they want a transfer —',
  'immediately call the transfer_to_human function. Keep spoken replies short and natural.',
].join(' ');

const server = http.createServer();
const makeService = createEndpoint({ server, port, envVars });
const svc = makeService({ path: '/' });

svc.on('session:new', (session) => {
  const log = logger.child({ call_sid: session.callSid });
  const apiKey = session.data.env_vars?.OPENAI_API_KEY?.trim();
  const target = session.data.env_vars?.HANDOFF_TARGET || envVars.HANDOFF_TARGET.default;
  log.info({ from: session.from, to: session.to, target }, 'new call');

  session
    .on('close', (code: number) => log.info({ code }, 'session closed'))
    .on('error', (err: Error) => log.error(err, 'session error'))
    .on('/agent-event', (evt: Record<string, unknown>) => log.info({ type: evt.type }, 'agent event'))
    .on('/agent-complete', (evt: Record<string, unknown>) => {
      // completion_reason: 'transferred' when the handoff bridged the human.
      log.info({ completion_reason: evt.completion_reason }, 'agent complete');
      session.hangup().reply();
    });

  session
    .agent({
      stt: { vendor: 'deepgram', language: 'en-US' },
      tts: { vendor: 'deepgram', voice: 'aura-2-thalia-en' },
      llm: {
        vendor: 'openai',
        model: 'gpt-4o',
        auth: { apiKey },
        llmOptions: { systemPrompt: SYSTEM_PROMPT, maxTokens: 256 },
      },
      greeting: true,
      turnDetection: 'stt',
      bargeIn: { enable: true },
      eventHook: '/agent-event',
      actionHook: '/agent-complete',
      // The handoff block injects a transfer_to_human tool and runs the packaged
      // transfer when the model calls it. brief:'none' keeps the tool args simple.
      handoff: {
        mode: 'blind',
        blindMethod: 'dial',
        brief: 'none',
        target: [{ type: 'user', name: target }],
      },
    })
    .send();
});

logger.info({ port }, 'jambonz handoff/agent example listening');
