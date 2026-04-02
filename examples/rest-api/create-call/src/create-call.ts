import pino from 'pino';
import { JambonzClient } from '@jambonz/sdk/client';

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

const baseUrl = process.env.JAMBONZ_REST_API_BASE_URL;
const accountSid = process.env.JAMBONZ_ACCOUNT_SID;
const apiKey = process.env.JAMBONZ_API_KEY;
const from = process.env.FROM;
const to = process.env.TO;
const applicationSid = process.env.APPLICATION_SID;

if (!baseUrl || !accountSid || !apiKey) {
  logger.error('Missing required env vars: JAMBONZ_REST_API_BASE_URL, JAMBONZ_ACCOUNT_SID, JAMBONZ_API_KEY');
  process.exit(1);
}
if (!from || !to || !applicationSid) {
  logger.error('Missing required env vars: FROM, TO, APPLICATION_SID');
  process.exit(1);
}

const client = new JambonzClient({ baseUrl, accountSid, apiKey });

try {
  const callSid = await client.calls.create({
    from,
    to: { type: 'phone', number: to },
    application_sid: applicationSid,
  });
  logger.info({ callSid }, 'call created successfully');
} catch (err) {
  logger.error(err, 'failed to create call');
  process.exit(1);
}
