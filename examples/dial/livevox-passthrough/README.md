# dial/livevox-passthrough

SIP header passthrough gateway. Takes an inbound call relayed by jambonz from a LiveKit carrier,
works out the LiveVox destination number, and bridges the call out over a LiveVox trunk —
forwarding every `X-LiveVox*` / `X-Prodigal*` header from the inbound INVITE verbatim onto the
outbound INVITE.

Demonstrates:
- Reading raw inbound SIP headers from `session.data.sip.headers`
- Forwarding custom SIP headers with the `dial` verb's `headers` property
- Trunk selection with `target[].trunk`
- `answerOnBridge: true` (don't answer the inbound leg until the outbound answers) and
  `anchorMedia: true` (keep media through the jambonz media server)
- Portal-configurable carrier/caller ID via `envVars` — including a `jambonzResource: 'carriers'`
  dropdown populated from the account's configured carriers

## Destination resolution

Checked in this order; the first usable value wins:

1. `X-LiveVox-Destination` inbound header
2. `X-Prodigal-Destination` inbound header
3. The dialed number, `session.to`
4. The `LIVEVOX_NUMBER` application variable (last resort — leave it empty to disable)

The `Diversion` header is **never** consulted.

If none of the above yields a number, the app logs a warning and returns a bare `hangup`.

Values are normalized before dialing, so `+15551234567`, `<tel:+15551234567>` and
`sip:15551234567@1.2.3.4;user=phone` all resolve to the same number.

## Header forwarding

Every inbound header whose name starts with `x-livevox` or `x-prodigal` (case-insensitive) is
copied onto the outbound INVITE with its name and value unchanged — including the destination
header itself. The full set is logged on the `new call` line as `forwardedHeaders`.

Note that jambonz delivers parsed INVITE headers with lowercased names, so that is the casing
that goes back out (e.g. `x-livevox-session-id`). SIP header names are case-insensitive per
RFC 3261, so this is correct on the wire; if a downstream system does a case-sensitive match,
re-case the keys in `collectForwardedHeaders()`.

## Setup

```bash
npm install
```

## Application Variables

Configured in the jambonz portal and passed via `session.data.env_vars`:

| Variable         | Required | Default             | Description |
|------------------|----------|---------------------|-------------|
| `CARRIER`        | No       | `Livevox - staging` | Outbound SIP trunk to route to. Rendered as a dropdown of the account's carriers — switch staging → production here |
| `CALLER_ID`      | No       | `+15082139758`      | Caller ID presented on the outbound INVITE |
| `LIVEVOX_NUMBER` | No       | *(empty)*           | Last-resort destination, used only when no destination header is present and the dialed number is unusable |

## Environment Variables

| Variable    | Default | Description |
|-------------|---------|-------------|
| `PORT`      | `3000`  | Port the WebSocket server listens on |
| `LOG_LEVEL` | `info`  | Pino log level (debug, info, warn, error) |

## Running

```bash
npm start
```

Configure your jambonz application to use the WebSocket URL `ws://your-server:3000/`, then assign
it to the number (or carrier) that LiveKit delivers calls to.

## Logging

Two log lines per call:

```
INFO: new call
    call_sid: "..."
    from: "+15551112222"
    to: "+15082139758"
    destination: "+15083334444"
    destinationSource: "x-livevox-destination"
    trunk: "Livevox - staging"
    callerId: "+15082139758"
    forwardedHeaders: {
      "x-livevox-destination": "+15083334444",
      "x-livevox-session-id": "abc123"
    }

INFO: dial complete
    call_sid: "..."
    dialStatus: "completed"
    sipStatus: 200
    duration: 42
```
