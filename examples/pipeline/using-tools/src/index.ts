import * as http from 'node:http';
import pino from 'pino';
import { createEndpoint } from '@jambonz/sdk/websocket';

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

const envVars = {
  LLM_MODEL: {
    type: 'string' as const,
    description: 'LLM model to use',
    enum: [
      'gpt-5.4-mini', 'gpt-5.4-nano', 'gpt-5.4', 'gpt-4.1-mini', 'gpt-4.1',
      'claude-sonnet-4-6', 'claude-haiku-4-5-20251001', 'claude-opus-4-6',
    ],
    default: 'gpt-5.4-mini',
  },
  CARTESIA_VOICE: {
    type: 'string' as const,
    description: 'Cartesia voice ID',
    default: '9626c31c-bec5-4cca-baa8-f8ba9e84c8bc',
  },
  SYSTEM_PROMPT: {
    type: 'string' as const,
    description: 'System prompt for the voice agent',
    uiHint: 'textarea' as const,
    default: [
      'You are a helpful weather assistant.',
      'You can look up current weather for any location using the get_weather tool.',
      'When asked about weather, always use the tool to fetch real data.',
      'Do not guess or make up temperatures.',
      'After receiving tool results, report the temperature and wind speed.',
      'Your responses are concise, friendly, and conversational.',
      'Never use markdown, bullet points, numbered lists,',
      'emojis, asterisks, or any special formatting.',
      'When the conversation begins,',
      'greet the user and let them know you can help with weather.',
    ].join(' '),
  },
};

const weatherTool = {
  name: 'get_weather',
  description: 'Get the current temperature and wind speed for a given location.',
  parameters: {
    type: 'object',
    properties: {
      location: {
        type: 'string',
        description: 'City name or location, e.g. "San Francisco" or "Paris"',
      },
      scale: {
        type: 'string',
        enum: ['celsius', 'fahrenheit'],
        description: 'Temperature unit, defaults to celsius',
      },
    },
    required: ['location'],
  },
};

const port = parseInt(process.env.PORT || '3000', 10);
const server = http.createServer();
const makeService = createEndpoint({ server, port, envVars });

const svc = makeService({ path: '/' });
svc.on('session:new', (session) => {
  const log = logger.child({ call_sid: session.callSid });
  const model = session.data.env_vars?.LLM_MODEL || envVars.LLM_MODEL.default;
  const llmVendor = model.startsWith('claude') ? 'anthropic' : 'openai';
  const voice = session.data.env_vars?.CARTESIA_VOICE || envVars.CARTESIA_VOICE.default;
  const systemPrompt = session.data.env_vars?.SYSTEM_PROMPT || envVars.SYSTEM_PROMPT.default;

  session.on('/pipeline-event', (evt: Record<string, unknown>) => {
    log.info({ payload: evt }, `pipeline event: ${evt.type}`);
  });

  session.on('/tool-call', async(evt: Record<string, unknown>) => {
    const { tool_call_id, name, arguments: args } = evt as {
      tool_call_id: string;
      name: string;
      arguments: Record<string, string>;
    };
    log.info({ name, args }, 'tool call');

    if (name !== 'get_weather') {
      session.sendToolOutput(tool_call_id, `Unknown tool: ${name}`);
      return;
    }

    try {
      const { location, scale = 'celsius' } = args;

      const geoRes = await fetch(
        'https://geocoding-api.open-meteo.com/v1/search'
        + `?name=${encodeURIComponent(location)}&count=1&language=en&format=json`
      );
      const geoData = await geoRes.json() as { results?: { latitude: number; longitude: number }[] };
      if (!geoData.results?.length) {
        session.sendToolOutput(tool_call_id, `Sorry, I could not find weather data for "${location}".`);
        return;
      }

      const { latitude: lat, longitude: lng } = geoData.results[0];
      const wxRes = await fetch(
        'https://api.open-meteo.com/v1/forecast'
        + `?latitude=${lat}&longitude=${lng}&current=temperature_2m,wind_speed_10m&temperature_unit=${scale}`
      );
      const weather = await wxRes.json() as {
        current: { temperature_2m: number; wind_speed_10m: number };
      };
      const { temperature_2m, wind_speed_10m } = weather.current;
      const unit = scale === 'fahrenheit' ? '°F' : '°C';

      session.sendToolOutput(tool_call_id,
        `The current temperature in ${location} is ${temperature_2m}${unit}`
        + ` with wind speed ${wind_speed_10m} km/h.`
      );
    } catch (err) {
      log.error(err, 'weather lookup failed');
      session.sendToolOutput(tool_call_id, `Error fetching weather: ${err}`);
    }
  });

  session.on('/pipeline-complete', (evt: Record<string, unknown>) => {
    log.info({ payload: evt }, 'pipeline completed');
    session.hangup().reply();
  });

  session
    .pipeline({
      stt: {
        vendor: 'deepgram',
        language: 'multi',
        deepgramOptions: { model: 'nova-3-general' },
      },
      tts: {
        vendor: 'cartesia',
        voice,
      },
      llm: {
        vendor: llmVendor,
        model,
        llmOptions: {
          messages: [
            { role: 'system', content: systemPrompt },
          ],
          tools: [weatherTool],
        },
      },
      toolHook: '/tool-call',
      turnDetection: 'krisp',
      earlyGeneration: true,
      eventHook: '/pipeline-event',
      actionHook: '/pipeline-complete',
    })
    .send();
});

logger.info({ port }, 'jambonz pipeline/using-tools listening');
