import * as http from 'node:http';
import pino from 'pino';
import { createEndpoint } from '@jambonz/sdk/websocket';
import type { LlmVendor } from '@jambonz/sdk';

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
const port = parseInt(process.env.PORT || '3000', 10);

const target = process.env.TRANSFER_TARGET;
const callerIdOverride = process.env.TRANSFER_CALLER_ID;

const ttsVendor = process.env.TTS_VENDOR || 'cartesia';
const ttsVoice = process.env.TTS_VOICE || '9626c31c-bec5-4cca-baa8-f8ba9e84c8bc';
const sttVendor = process.env.STT_VENDOR || 'deepgram';
const sttLanguage = process.env.STT_LANGUAGE || 'en-US';
const llmVendor = (process.env.LLM_VENDOR || 'openai') as LlmVendor;
const llmModel = process.env.LLM_MODEL || 'gpt-4.1-mini';
const llmBaseUrl = process.env.LLM_BASE_URL;

const systemPrompt =
  process.env.SYSTEM_PROMPT ||
  'You are a friendly virtual receptionist. Greet the caller, ask what they need ' +
  'help with, and once you understand their issue, transfer them to a human ' +
  'specialist by calling the transfer_to_human tool. Right before you call the ' +
  'tool, always tell the caller you are transferring them now (e.g. "Transferring ' +
  'you now, please hold."). Keep replies short and conversational.';

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
    .on('/transfer-event', (evt: Record<string, unknown>) => {
      log.info({ event: evt.event_type, ...evt }, 'handoff event');
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
        mode: 'blind',
        blindMethod: 'dial',
        target: [{ type: 'phone', number: target }],
        callerId,
        disposition: {
          onNoAnswer: 'return',
          onBusy: 'return',
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

logger.info({ port }, 'blind transfer (agent + handoff) example listening');
