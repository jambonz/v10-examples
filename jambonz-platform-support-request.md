<!--
Title   : jambonz platform support request — CES in the `dialogflow` verb + Chirp 3 HD voices
Purpose : Open questions for the jambonz / Lumen platform team, with reproducible evidence.
Author  : Ramon Salcido
Created : 2026-07-01
Updated : 2026-07-01
-->

# jambonz platform support request — CES (`dialogflow` verb) + Chirp 3 HD voices

> Questions for the **jambonz / Lumen** platform team. Two capabilities appear in
> the current jambonz **schema** (via the jambonz MCP schema server) but do **not**
> work on the deployed **api.jambonz.cloud** build we use. We want to confirm
> whether they are supported on our build / roadmap before we invest further.

## Our account / environment

| Field | Value |
|---|---|
| jambonz API base | `https://api.jambonz.cloud/v1` |
| Account SID | `4833652d-45c3-4e43-a6ca-47b768a16a45` |
| Service Provider SID | `6072f617-6151-4c15-8eb9-74a4967ab701` |
| Test inbound DID | `+14156366694` (application `mark_transfer_test`) |
| Speech vendor / label | Google / `google-poc` |

**What we run today (works):** a webhook app where our service (voice-bridge)
returns `answer` + `say` + `gather` per turn and bridges the caller's speech to a
Google **CES** (Customer Engagement Suite / GCXI) app via `apps.sessions.runSession`.
This "cascade" path is solid. We want to move to a **dumb-pipe** model where jambonz
hands the whole call to CES (CES owns greeting, turns, and barge-in).

---

## Question 1 — Does the deployed jambonz build support **`model: "ces"`** in the `dialogflow` verb?

The jambonz schema (dialogflow verb) advertises `model` ∈ `{es, cx, ces}`, plus
`welcomeEvent`, `bargein`, `noInputEvent`, `tts`, `eventHook`, `actionHook`. We
returned this verb from our call webhook (SA-key credentials as a **JSON string**,
per docs):

```json
[
  { "verb": "answer" },
  {
    "verb": "dialogflow",
    "model": "ces",
    "project": "gcp-prj-ccva-np-01",
    "agent": "2215d8fe-2175-4e19-bb30-c3ce49765630",
    "region": "global",
    "lang": "en-US",
    "credentials": "<service-account key as JSON string>",
    "welcomeEvent": "welcome",
    "bargein": true,
    "tts": { "vendor": "google", "language": "en-US", "voice": "en-US-Studio-O", "label": "google-poc" },
    "eventHook": "https://…/df-event",
    "actionHook": "https://…/df-done"
  }
]
```

**Symptom (reproducible):** the call is **answered, then torn down in ~60 ms**
(`terminated_reason = "called party hungup"`, `duration = 0`). The CES/dialogflow
session **never starts** — our `eventHook` and `actionHook` are **never called**,
and **no jambonz Alert** is raised (i.e. the verb passes syntax validation but the
connector cannot be instantiated). We ruled out our own variables:

| Attempt | `region` | `credentials` form | Result |
|---|---|---|---|
| 1 | `us` | JSON object | drop ~70 ms, no session |
| 2 | `global` | JSON object | drop ~70 ms, no session |
| 3 | `global` | **JSON string** (per docs.jambonz.org) | drop ~60 ms, no session |

**Call SIDs for your feature-server logs** (account `4833652d-…`, to `+14156366694`,
2026-07-01 ~22:07–22:27 UTC): `a5f7bdce`, `401f3766`, `a0cc5ca6`, `f654bbf9`.

**Please confirm:**
1. Does our deployed **api.jambonz.cloud** build implement `model: "ces"` in the
   `dialogflow` verb? If yes, since which **feature-server version**, and is our
   account on that version?
2. Can you share the **feature-server log** for the SIDs above so we can see the
   exact error at session instantiation?
3. For CES specifically, what are the correct values for **`agent`** (the CES app
   id, the root-agent id, or the full resource name?), **`region`**, and any
   required fields (e.g. `environment`)?
4. Any working **CES example** (verb payload) you can share?

---

## Question 2 — Are **Chirp 3 HD / Gemini** Google voices supported in the `say` verb?

The Google TTS voice `en-US-Chirp3-HD-Kore` (and the bare Gemini name `Kore`)
produce **silence** on live calls when set as the `say` synthesizer `voice`, even
though the raw Google `text:synthesize` REST API accepts `en-US-Chirp3-HD-Kore`
and returns audio. Conventional families (Studio / Neural2 / WaveNet) work fine.

**Please confirm:**
1. Does the deployed build support **Chirp 3 HD** (`en-US-Chirp3-HD-*`) voices in
   `say` (and `gather`/`dialogflow` `tts`)? Any required flag (`stream`, `engine`)?
2. Is bare-name **Gemini-TTS** voice support (e.g. `Kore`, which needs a model
   parameter) on the roadmap?

---

## Question 3 (secondary) — S2S verbs on our account

The schema shows `google_s2s` / `openai_s2s` (min version `10.1.0`). Are these
enabled on our account, and what **jambonz version** are we running? (Context only —
S2S bypasses the CES app, so it is not our primary path.)

---

## What we need to proceed

If **`model: "ces"`** is supported (or can be enabled) on our build, we flip a
single feature flag (`DSF_DIALOGFLOW_VERB=1`) and continue — the dumb-pipe code is
already written and gated off. Until then we remain on the working cascade path.
