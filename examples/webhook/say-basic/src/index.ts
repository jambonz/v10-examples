import express from 'express';
import pino from 'pino';
import pinoHttp from 'pino-http';
import { WebhookResponse } from '@jambonz/sdk/webhook';

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
const port = parseInt(process.env.PORT || '3000', 10);

const app = express();
app.use(express.json());
app.use(pinoHttp({ logger }));

app.post('/', (req, res) => {
  const { call_sid, from, to } = req.body;
  logger.info({ call_sid, from, to }, 'new call');

  const jambonz = new WebhookResponse();
  jambonz
    .say({ text: 'Hello! This is a basic text to speech example using jambonz webhooks.' })
    .pause({ length: 1 })
    .say({ text: 'This next message will repeat three times.' })
    .say({ text: 'I can say things more than once.', loop: 3 })
    .say({ text: 'Thank you for trying jambonz. Goodbye!' })
    .hangup();

  res.json(jambonz);
});

app.listen(port, () => {
  logger.info({ port }, 'jambonz webhook/say-basic example listening');
});
