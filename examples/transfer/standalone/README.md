# transfer/standalone

Standalone `transfer` verb over WebSocket transport. Greets the caller, then hands
them to a human agent (default `xhoaluu2@sip.jambonz.me`) using the strategy chosen
via `TRANSFER_MODE`.

Demonstrates the packaged `transfer` verb and its built-in failure handling:
- **blind-refer** — SIP REFER; jambonz drops out of the media path (default `blindMethod`)
- **blind-dial** — bridged outbound INVITE to the human
- **warm-parked** — caller held on hold; a brief is spoken to the human only; then bridge
- **warm-3way** — caller + human in a conference; the brief is heard by both
- **no-answer** — warm-parked with a short timeout + `disposition.onNoAnswer: 'return'`; a
  `say` scheduled AFTER the transfer proves the verb stack resumes when nobody answers

The `actionHook` (`/transfer-complete`) reports the outcome (`transfer_result`,
`transfer_reason`, `sip_status`).

## Setup

```bash
npm install
```

## Environment Variables

| Variable          | Default                     | Description |
|-------------------|-----------------------------|-------------|
| `TRANSFER_TARGET` | `xhoaluu2@sip.jambonz.me`   | SIP user or phone to transfer to |
| `TRANSFER_MODE`   | `blind-dial`                | `blind-refer` \| `blind-dial` \| `warm-parked` \| `warm-3way` \| `no-answer` |
| `PORT`            | `3000`                      | Port the WebSocket server listens on |
| `LOG_LEVEL`       | `info`                      | Pino log level (debug, info, warn, error) |

## Running

```bash
npm start
```

Configure your jambonz application to use the WebSocket URL `ws://your-server:3000/`.
