# transfer/warm

Warm transfer with call screening over WebSocket transport. The app dials a target, briefs them, and lets them **accept or decline** (by speech or keypad). The caller is bridged only if the target accepts.

Demonstrates:
- The `dial` verb with a `confirmHook` to screen the target's leg before bridging
- A `gather` (speech + DTMF) capturing the accept/decline decision
- Bridging on accept; hanging up the target leg on decline (no bridge)
- Carrying the decision across hooks to tell the caller the outcome

## Setup

```bash
npm install
```

## Environment Variables

| Variable               | Default        | Description |
|------------------------|----------------|-------------|
| `PORT`                 | `3000`         | Port the WebSocket server listens on |
| `LOG_LEVEL`            | `info`         | Pino log level (debug, info, warn, error) |
| `WARM_TRANSFER_TARGET` | `+15085551212` | Specialist phone number (E.164). Configurable per-application from the jambonz portal. |

## Running

```bash
npm start
```

Configure your jambonz application to use the WebSocket URL `ws://your-server:3000/`.

The target hears: *"Incoming transfer from &lt;caller&gt;. Say yes or press 1 to accept, no or 2 to decline."* On accept the caller is connected; on decline the caller is told the specialist was unavailable.
