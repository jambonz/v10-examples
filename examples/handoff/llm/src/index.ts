import * as http from 'node:http';
import pino from 'pino';
import { createEndpoint } from '@jambonz/sdk/websocket';

// Layer-1 handoff on the realtime `llm` verb (OpenAI gpt-realtime / s2s).
// The `handoff` block auto-injects a `transfer_to_human` tool. Driven
// conversationally (per the jambonz openai-s2s example): the model greets, and
// when the caller asks for a human it calls the tool and jambonz runs the
// packaged transfer to the destination (default xhoaluu2@sip.jambonz.me).

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
const port = parseInt(process.env.PORT || '3000', 10);

const envVars = {
  OPENAI_API_KEY: {
    type: 'string' as const,
    description: 'OpenAI API key (for the realtime LLM)',
    required: true,
    obscure: true,
  },
  HANDOFF_TARGET: {
    type: 'string' as const,
    description: 'SIP user or phone to hand off to',
    default: 'xhoaluu2@sip.jambonz.me',
  },
};

const INSTRUCTIONS = [
  'You are a call-routing assistant for a support line.',
  'When the caller asks to speak to a human, a person, or an agent — or says they want a transfer —',
  'immediately call the transfer_to_human function. Keep spoken replies very short.',
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
    .on('/llm-event', (evt: Record<string, unknown>) => log.info({ type: evt.type }, 'llm event'))
    .on('/llm-complete', (evt: Record<string, unknown>) => {
      // completion_reason: 'transferred' when the handoff bridged the human.
      log.info({ completion_reason: evt.completion_reason }, 'llm complete');
      session.hangup().reply();
    });

  session
    .llm({
      vendor: 'openai',
      auth: { apiKey },
      eventHook: '/llm-event',
      actionHook: '/llm-complete',
      llmOptions: {
        // The model greets so the caller hears something and a turn opens.
        response_create: {
          instructions: 'Greet the caller in one short sentence and ask how you can help.',
        },
        // Instructions + tool_choice auto; the handoff tool is injected by jambonz.
        session_update: { type: 'realtime', instructions: INSTRUCTIONS },
      },
      // Injects transfer_to_human and runs the packaged transfer when called.
      handoff: {
        mode: 'blind',
        blindMethod: 'dial',
        brief: 'none',
        target: [{ type: 'user', name: target }],
      },
    })
    .send();
});

logger.info({ port }, 'jambonz handoff/llm example listening');
