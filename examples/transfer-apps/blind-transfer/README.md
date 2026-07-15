# transfer/blind

Blind transfer that immediately hands the caller off to a target number by dialing a new outbound leg, over WebSocket transport.

Uses the `dial` verb rather than `sip:refer` on purpose: many carriers (Twilio among them) reject an inbound SIP REFER with `403 Forbidden`. Bridging a fresh outbound leg keeps the media on jambonz and works over any trunk.

Demonstrates:
- The `dial` verb bridging the caller to a phone target
- `answerOnBridge` so the caller hears ringback until the target answers
- `forwardPAI` to preserve the caller's identity to the target
- Declaring an application env var (`TRANSFER_TARGET`) for portal configuration

## Setup

```bash
npm install
```

## Environment Variables

| Variable          | Default          | Description |
|-------------------|------------------|-------------|
| `PORT`            | `3000`           | Port the WebSocket server listens on |
| `LOG_LEVEL`       | `info`           | Pino log level (debug, info, warn, error) |
| `TRANSFER_TARGET` | `+15085550100`   | Phone number (E.164) to transfer the caller to. Also configurable per-application from the jambonz portal. |

## Running

```bash
npm start
```

Configure your jambonz application to use the WebSocket URL `ws://your-server:3000/`.
