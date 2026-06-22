# transfer/lcc

Live Call Control (LCC) transfer over WebSocket transport, in two halves:

- **`src/index.ts`** (parking app) — answers the caller and parks them in a long
  `pause`. Logs the jambonz `call_sid` on each new call.
- **`src/trigger-transfer.ts`** (REST trigger) — injects a blind/dial transfer into
  the in-progress call via `client.calls.transfer(callSid, ...)` (the updateCall REST
  API). jambonz replaces the running pause with the transfer.

This demonstrates redirecting a live call to a packaged transfer from OUTSIDE the
call, mid-flight — distinct from the standalone example where the transfer is part of
the call's original script.

## Setup

```bash
npm install
```

## Running

1. Start the parking app and point a jambonz application at `ws://your-server:3000/`:

   ```bash
   npm start
   ```

2. Place a call to the app. Copy the `call_sid` it logs.

3. Inject the transfer via REST (default target `xhoaluu2@sip.jambonz.me`):

   ```bash
   JAMBONZ_REST_API_BASE_URL=https://your-jambonz/v1 \
   JAMBONZ_ACCOUNT_SID=... JAMBONZ_API_KEY=... CALL_SID=<the call_sid> \
   npm run trigger
   ```

## Environment Variables (trigger)

| Variable                    | Default                   | Description |
|-----------------------------|---------------------------|-------------|
| `JAMBONZ_REST_API_BASE_URL` | —                         | jambonz REST API base URL (required) |
| `JAMBONZ_ACCOUNT_SID`       | —                         | Account SID (required) |
| `JAMBONZ_API_KEY`           | —                         | API key (required) |
| `CALL_SID`                  | —                         | The in-progress call to transfer (required) |
| `TRANSFER_TARGET`           | `xhoaluu2@sip.jambonz.me` | SIP user or phone to transfer to |
