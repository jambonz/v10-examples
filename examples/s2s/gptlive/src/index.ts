import http from 'http';
import { createEndpoint } from '@jambonz/sdk/websocket';
import pino from 'pino';

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
const port = parseInt(process.env.PORT || '3000', 10);

/* GPT Live has no response_create, so nothing forces a first turn. The model
 * does NOT reliably open the call on its own: see the session.started handler
 * below, which asks for the greeting via session.context.append — the mechanism
 * OpenAI's prompting guide prescribes and the only one that works. */
const SYSTEM_PROMPT = `You are a friendly and helpful voice assistant for Jambonz Mobile.
Keep your responses concise and conversational.
You are speaking via voice, so respond in plain prose with no markdown.`;

const envVars = {
  GPTLIVE_API_KEY: {
    type: 'string' as const,
    description: 'OpenAI API key enrolled in the GPT Live Early Access Program',
    required: true,
    obscure: true,
  },
  GPTLIVE_MODEL: {
    type: 'string' as const,
    description: 'GPT Live voice model (rides in the connection URL)',
    default: 'gpt-live-1-boulder-alpha',
  },
  DELEGATION_MODE: {
    type: 'string' as const,
    description: 'How the model delegates work: "responses" runs a Responses turn that can call '
      + 'functions; "client" asks this app for free-form text context',
    enum: ['responses', 'client'],
    default: 'responses',
  },
  DELEGATION_MODEL: {
    type: 'string' as const,
    description: 'Responses-side model for delegated turns (only used when DELEGATION_MODE=responses)',
    default: 'gpt-5.5',
  },
  VOICE: {
    type: 'string' as const,
    description: 'GPT Live output voice',
    default: 'marin',
  },
  GREETING: {
    type: 'string' as const,
    description: 'Exact wording the agent should open the call with',
    default: 'Hi, I am the Jambonz Mobile assistant. How can I help you today?',
  },
};

/* Flat Responses-shape function tool. It is declared inside the delegation (see
 * below), not at the top level of the session — GPT Live has no session.tools. */
const weatherTool = {
  type: 'function',
  name: 'get_weather',
  description: 'Get the current weather for a city. Call this whenever the caller asks about weather.',
  parameters: {
    type: 'object',
    properties: {
      location: { type: 'string', description: 'City name, e.g. "Chicago"' },
      scale: { type: 'string', enum: ['celsius', 'fahrenheit'], description: 'Temperature unit' },
    },
    required: ['location'],
  },
};

const server = http.createServer();
const makeService = createEndpoint({ server, port, envVars });
const svc = makeService({ path: '/' });

svc.on('session:new', (session) => {
  const log = logger.child({ callSid: session.callSid });
  log.info({ from: session.from, to: session.to }, 'new call');

  const env = session.data.env_vars ?? {};
  const apiKey = env.GPTLIVE_API_KEY?.trim();
  /* Read the fallbacks from envVars rather than repeating the literals: the
   * alpha's model names will churn, and a second copy here would let the portal
   * advertise one default while an unset deployment quietly used another. */
  const model = env.GPTLIVE_MODEL?.trim() || envVars.GPTLIVE_MODEL.default;
  const delegationMode = env.DELEGATION_MODE?.trim() || envVars.DELEGATION_MODE.default;
  const delegationModel = env.DELEGATION_MODEL?.trim() || envVars.DELEGATION_MODEL.default;
  const voice = env.VOICE?.trim() || envVars.VOICE.default;
  const greeting = env.GREETING?.trim() || envVars.GREETING.default;

  /* required:true means the portal normally prevents this, but a missing key
   * otherwise reaches the feature-server as auth:{apiKey:undefined} and throws
   * there — the caller just hears the call drop. Say something instead. */
  if (!apiKey) {
    log.error('GPTLIVE_API_KEY is not set — cannot start a GPT Live session');
    session
      .say({ text: 'The GPT Live API key is not configured. Goodbye.' })
      .hangup()
      .send();
    return;
  }

  /* GPT Live's defining feature: everything the model wants from outside the
   * audio conversation arrives as a *delegation*, and the two modes are wired
   * differently.
   *
   * 'responses' — the model runs a Responses API turn that can call functions.
   *   The nested `responses` object is REQUIRED and its `model` is mandatory;
   *   tools live at delegation.responses.tools (NOT delegation.tools). Function
   *   calls arrive on toolHook. Only this mode supports tools, and therefore
   *   only this mode supports jambonz's built-in handoff and hangup tools.
   *
   * 'client' — the model asks THIS APP for free-form text context instead. It
   *   emits delegation.created with item.target === 'client'; we answer with a
   *   delegation.context.append (see the eventHook handler). No function
   *   calling exists in this mode. */
  const delegation = delegationMode === 'client'
    ? { type: 'client' }
    : {
      type: 'responses',
      responses: {
        model: delegationModel,
        tools: [weatherTool],
      },
    };

  session
    .on('close', (code: number) => {
      log.info({ code }, 'session closed');
    })
    .on('error', (err: Error) => {
      log.error(err, 'session error');
    })
    .on('/s2s-event', (evt: Record<string, unknown>) => {
      const type = evt.type as string;

      /* Answer a client-targeted delegation. The model is asking us for context
       * in prose; reply with up to 500 tokens in a single input_text part,
       * quoting the delegation item's id so the server knows what it answers. */
      const item = evt.item as { id?: string; target?: string; content?: unknown } | undefined;
      if (type === 'delegation.created' && item?.target === 'client') {
        log.info({ item }, 'client delegation — supplying context');
        session.updateLlm({
          type: 'delegation.context.append',
          delegation_item_id: item.id,
          content: [{
            type: 'input_text',
            text: 'The caller is a Jambonz Mobile customer on the Unlimited plan. '
              + 'Their account is in good standing and they have already accepted the terms.',
          }],
        });
        return;
      }

      /* Ask the model to open the conversation. This is REQUIRED, not a nicety:
       * GPT Live has no response.create, and putting the greeting only in
       * `instructions` does not work — measured 0/5 openings that way, versus
       * 5/5 with the request below. When the model stays quiet it does not send
       * nothing, it streams output_audio.delta frames of DIGITAL SILENCE, so the
       * caller just hears dead air.
       *
       * The shape follows OpenAI's prompting guide: supply the INTENDED WORDING
       * and say WHEN to speak. Their caveat applies — a context append guides
       * the model, it is not a playback command, so the model may paraphrase,
       * or occasionally stay silent. If exact wording is a hard requirement,
       * speak it with a `say` verb before this `llm` verb instead. */
      if (type === 'session.started') {
        log.info({ greeting }, 'session started — asking the model to open the call');
        session.updateLlm({
          type: 'session.context.append',
          content: [{
            type: 'input_text',
            text: 'Immediately greet the caller using the exact text below. Do not wait for the '
              + 'caller to speak first. After the greeting, pause and listen.\n\n' + greeting,
          }],
        });
        return;
      }

      /* turn.* is a projection over transcript fragments — the readable view of
       * who said what. Everything else (usage, transcripts, response.*) is
       * logged at debug to keep the default output legible. */
      if (type === 'turn.done') {
        const turn = evt.turn as { role?: string; transcript?: string } | undefined;
        log.info({ role: turn?.role, transcript: turn?.transcript }, 'turn');
      } else {
        log.debug({ evt }, `s2s event: ${type}`);
      }
    })
    .on('/tool-call', async(evt: Record<string, unknown>) => {
      const { tool_call_id, name, args } = evt as {
        tool_call_id: string;
        name: string;
        args: Record<string, string>;
      };
      log.info({ name, args }, 'tool call');

      /* GPT Live wants its own envelope, NOT the OpenAI Realtime
       * conversation.item.create used by the openai/xai examples: results go
       * back as delegation.function_call_output.create, echoing the call_id.
       * There is no follow-on response.create — the server resumes the
       * delegation itself. */
      const respond = (output: string) => session.sendToolOutput(tool_call_id, {
        type: 'delegation.function_call_output.create',
        item: {
          type: 'function_call_output',
          call_id: tool_call_id,
          output,
        },
      });

      if (name !== 'get_weather') {
        respond(`Unknown tool: ${name}`);
        return;
      }

      try {
        const { location, scale = 'celsius' } = args;
        /* Bound the upstream calls. The feature-server's stall watchdog is
         * already disarmed by the time a function call is dispatched, so a
         * hung fetch would leave the caller in dead air until the call's own
         * time limit — undici applies no default request timeout. */
        const signal = AbortSignal.timeout(5000);

        const geoRes = await fetch(
          'https://geocoding-api.open-meteo.com/v1/search'
          + `?name=${encodeURIComponent(location)}&count=1&language=en&format=json`,
          { signal }
        );
        const geoData = await geoRes.json() as { results?: { latitude: number; longitude: number }[] };
        if (!geoData.results?.length) {
          respond(`No weather data found for "${location}".`);
          return;
        }

        const { latitude: lat, longitude: lng } = geoData.results[0];
        const wxRes = await fetch(
          'https://api.open-meteo.com/v1/forecast'
          + `?latitude=${lat}&longitude=${lng}&current=temperature_2m,wind_speed_10m&temperature_unit=${scale}`,
          { signal }
        );
        const weather = await wxRes.json() as {
          current: { temperature_2m: number; wind_speed_10m: number };
        };
        const { temperature_2m, wind_speed_10m } = weather.current;
        const unit = scale === 'fahrenheit' ? '°F' : '°C';

        respond(`The current temperature in ${location} is ${temperature_2m}${unit}`
          + ` with wind speed ${wind_speed_10m} km/h.`);
      } catch (err) {
        log.error(err, 'weather lookup failed');
        respond(`Error fetching weather: ${err}`);
      }
    })
    .on('/s2s-complete', (evt: Record<string, unknown>) => {
      log.info(evt, 's2s complete');
      session.reply();
    });

  session
    .s2s({
      vendor: 'gptlive',
      /* The model rides in the connection URL, so it goes HERE and must not be
       * repeated inside session_update — the feature-server rejects the verb if
       * it is. */
      model,
      auth: {
        apiKey,
      },
      /* Unlike the openai/xai realtime examples there is NO response_create:
       * GPT Live has no response.create client event, and the model starts and
       * drives the conversation on its own once the session is started. Audio
       * format is fixed by the API at 24 kHz mono PCM16, so there is nothing to
       * negotiate here either. */
      llmOptions: {
        session_update: {
          instructions: SYSTEM_PROMPT,
          audio: {
            output: { voice },
          },
          delegation,
        },
      },
      /* toolHook only ever fires in 'responses' mode; harmless in 'client' mode. */
      toolHook: '/tool-call',
      eventHook: '/s2s-event',
      actionHook: '/s2s-complete',
    })
    .send();

  log.info({ model, delegationMode, voice }, 'gptlive session started');
});

logger.info({ port }, 'jambonz s2s/gptlive example listening');
