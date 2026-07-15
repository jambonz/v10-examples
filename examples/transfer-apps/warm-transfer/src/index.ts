import * as http from 'node:http';
import pino from 'pino';
import { createEndpoint } from '@jambonz/sdk/websocket';
import type { LlmVendor } from '@jambonz/sdk';

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
const port = parseInt(process.env.PORT || '3000', 10);

// Human specialist the agent hands the caller off to.
const target = process.env.WARM_TRANSFER_TARGET;
// Caller ID presented on the outbound leg. Must be a number your carrier is
// authorized to present, or it will reject the call.
const callerIdOverride = process.env.WARM_TRANSFER_CALLER_ID;

// Speech + LLM (all overridable via env).
const ttsVendor = process.env.TTS_VENDOR || 'cartesia';
const ttsVoice = process.env.TTS_VOICE || '9626c31c-bec5-4cca-baa8-f8ba9e84c8bc';
const sttVendor = process.env.STT_VENDOR || 'deepgram';
const sttLanguage = process.env.STT_LANGUAGE || 'en-US';
const llmVendor = (process.env.LLM_VENDOR || 'openai') as LlmVendor;
const llmModel = process.env.LLM_MODEL || 'gpt-4.1-mini';
const llmBaseUrl = process.env.LLM_BASE_URL;

const systemPrompt =
  process.env.SYSTEM_PROMPT ||
  `You are a friendly virtual receptionist. Greet the caller, ask what they need ` +
  `help with, and once you understand their issue, transfer them to a human ` +
  `specialist by calling the transfer_to_human tool. Keep replies short and ` +
  `conversational. When you brief the specialist during a transfer, always ` +
  `speak exactly two things: first one short sentence saying why the caller is ` +
  `calling, then the literal words "Press one to connect, or hang up to decline." ` +
  `Never omit that instruction.`;

const server = http.createServer();
const makeService = createEndpoint({ server, port });
const svc = makeService({ path: '/' });

svc.on('session:new', (session) => {
  const log = logger.child({ callSid: session.callSid });
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
    // Handoff lifecycle events (transfer.initiated / .bridged / .returned / .failed).
    .on('/transfer-event', (evt: Record<string, unknown>) => {
      log.info({ event: evt.event_type, ...evt }, 'handoff event');
    })
    // Fires when the transfer resolves.
    .on('/transfer-done', (evt: Record<string, unknown>) => {
      log.info(
        { result: evt.transfer_result, reason: evt.transfer_reason },
        'handoff transfer resolved',
      );
    })
    // Plays to the parked caller while the agent briefs the specialist
    // (fires only because callerPresent is false).
    .on('/on-hold', () => {
      log.info('caller parked — playing transfer announcement');
      session
        .say({ text: 'Please hold while I transfer you to a specialist.' })
        .reply();
    })
    .on('/agent-done', () => {
      log.info('agent done');
      session.hangup().reply();
    });


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
        callerPresent: false, // caller is parked while the agent briefs the specialist
        target: [{ type: 'phone', number: target }],
        callerId: '+15085550101', // owned DID, or the carrier rejects the leg (target never rings)
        brief: { template: 'In one sentence, tell the specialist why the caller is calling, then say exactly: "Press one to connect, or hang up to decline."' },
        confirm: { prompt: 'Press one to connect.', digit: '1' },
        onHoldHook: '/on-hold', // announcement played to the parked caller during the brief
        disposition: {
          onNoAnswer: 'return',
          onBusy: 'return',
          onDecline: 'return',
          onFailure: 'return',
        },
        eventHook: '/transfer-event',
        actionHook: '/transfer-done',
      },
      eventHook: '/agent-event',
      actionHook: '/agent-done',
    })
    .send();
});

logger.info({ port }, 'warm transfer (agent + handoff) example listening');
