import { config } from 'dotenv';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import * as http from 'node:http';
import pino from 'pino';
import { createEndpoint } from '@jambonz/sdk/websocket';
import type { LlmVendor } from '@jambonz/sdk';

// Load .env from the app root (one level up from src/), independent of the
// directory `npm start` was launched from.
config({ path: resolve(dirname(fileURLToPath(import.meta.url)), '../.env') });

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
const port = parseInt(process.env.PORT || '3000', 10);

// --- Transfer destination -------s------------------------------------------
const target = process.env.THREE_WAY_TARGET || '+15085550100';
// Caller ID presented to the specialist on the outbound leg. Must be a number
// your outbound carrier owns (a DID on your account). Override with
// THREE_WAY_CALLER_ID.
const callerIdOverride = process.env.THREE_WAY_CALLER_ID || '+15085550101';

// --- Speech + LLM (all overridable via env) -------------------------------
const ttsVendor = process.env.TTS_VENDOR || 'cartesia';
const ttsVoice = process.env.TTS_VOICE || '9626c31c-bec5-4cca-baa8-f8ba9e84c8bc';
const sttVendor = process.env.STT_VENDOR || 'deepgram';
const sttLanguage = process.env.STT_LANGUAGE || 'en-US';

// See warm-transfer for the "grok" note: xAI Grok = vendor 'openai' +
// LLM_BASE_URL=https://api.x.ai/v1; Groq the host = LLM_VENDOR=groq.
const llmVendor = (process.env.LLM_VENDOR || 'openai') as LlmVendor;
const llmModel = process.env.LLM_MODEL || 'gpt-4.1-mini';
const llmBaseUrl = process.env.LLM_BASE_URL;

const systemPrompt =
  process.env.SYSTEM_PROMPT ||
  `You are a friendly virtual receptionist. Greet the caller, ask what they need ` +
  `help with, and once you understand their issue, bring in a human specialist ` +
  `by calling the transfer_to_human tool. The caller stays on the line and will ` +
  `hear you introduce them, so keep the introduction brief and natural.`;

const server = http.createServer();
const makeService = createEndpoint({ server, port });

makeService({ path: '/' }).on('session:new', (session) => {
  const log = logger.child({ callSid: session.callSid });
  // Owned DID to present to the specialist. Falls back to the dialed DID.
  const callerId = callerIdOverride || session.to;
  log.info({ from: session.from, to: session.to, target, callerId }, 'new call');

  session
    .on('close', (code: number) => {
      log.info({ code }, 'session closed');
    })
    .on('error', (err: Error) => {
      log.error(err, 'session error');
    })
    .on('/agent-event', (evt: Record<string, unknown>) => {
      if (evt.type === 'turn_end') {
        log.info({ transcript: evt.transcript, response: evt.response }, 'turn');
      }
    })
    .on('/transfer-done', (evt: Record<string, unknown>) => {
      log.info(
        { result: evt.transfer_result, reason: evt.transfer_reason },
        'handoff transfer resolved',
      );
    })
    .on('/agent-done', () => {
      log.info('agent done');
      session.hangup().reply();
    });

  // Three-way warm transfer with ONE property: callerPresent: true. jambonz
  // joins the caller into a three-way with the specialist and lets the agent
  // introduce them — no conference verb, no REST createCall, no second
  // WebSocket endpoint. The handoff tool and choreography are injected for us.
  session
    .agent({
      stt: { vendor: sttVendor, language: sttLanguage },
      tts: { vendor: ttsVendor, voice: ttsVoice },
      llm: {
        vendor: llmVendor,
        model: llmModel,
        ...(llmBaseUrl ? { connectOptions: { baseURL: llmBaseUrl } } : {}),
        llmOptions: { systemPrompt },
      },
      turnDetection: 'stt',
      handoff: {
        mode: 'warm',
        callerPresent: true, // caller joins the three-way and hears the brief
        target: [{ type: 'phone', number: target }],
        callerId, // owned DID, or the carrier rejects the leg (target never rings)
        brief: 'auto',
        disposition: {
          onNoAnswer: 'return',
          onBusy: 'return',
          onDecline: 'return',
          onFailure: 'return',
        },
        actionHook: '/transfer-done',
      },
      eventHook: '/agent-event',
      actionHook: '/agent-done',
    })
    .send();
});

logger.info({ port }, 'three-way warm transfer (agent + handoff) example listening');
