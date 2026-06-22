import pino from 'pino';
import { JambonzClient } from '@jambonz/sdk/client';

// Live Call Control (LCC) transfer — the TRIGGER half.
//
// Injects a blind/dial transfer into an in-progress call via the updateCall REST
// API. Run this while a call placed to the parking app (src/index.ts) is on hold;
// pass that call's jambonz call_sid.
//
// Usage:
//   JAMBONZ_REST_API_BASE_URL=https://your-jambonz/v1 \
//   JAMBONZ_ACCOUNT_SID=... JAMBONZ_API_KEY=... CALL_SID=... \
//   [TRANSFER_TARGET=xhoaluu2@sip.jambonz.me] \
//   npx tsx src/trigger-transfer.ts

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

const baseUrl = process.env.JAMBONZ_REST_API_BASE_URL;
const accountSid = process.env.JAMBONZ_ACCOUNT_SID;
const apiKey = process.env.JAMBONZ_API_KEY;
const callSid = process.env.CALL_SID;
const target = process.env.TRANSFER_TARGET || 'xhoaluu2@sip.jambonz.me';

if (!baseUrl || !accountSid || !apiKey || !callSid) {
  logger.error('Missing env: JAMBONZ_REST_API_BASE_URL, JAMBONZ_ACCOUNT_SID, JAMBONZ_API_KEY, CALL_SID');
  process.exit(1);
}

const client = new JambonzClient({ baseUrl, accountSid, apiKey });

try {
  await client.calls.transfer(callSid, {
    mode: 'blind',
    blindMethod: 'dial',
    target: [{ type: 'user', name: target }],
    timeout: 20,
  });
  logger.info({ callSid, target }, 'LCC transfer injected — caller should now be dialed to the target');
} catch (err) {
  logger.error(err, 'failed to inject LCC transfer');
  process.exit(1);
}
