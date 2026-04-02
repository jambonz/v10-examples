# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

This is a monorepo of jambonz example applications using the `@jambonz/sdk` TypeScript SDK. All examples use WebSocket transport (not webhooks) and are written in TypeScript, run via `tsx` with no build step.

## Commands

```bash
# Install all workspace dependencies (run from root)
npm install

# Lint all examples
npm run lint

# Lint with auto-fix
npm run lint:fix

# Run a specific example
npx tsx examples/<category>/<name>/src/index.ts

# Or from within an example directory
cd examples/say/basic && npm start
```

## Architecture

**Monorepo structure**: npm workspaces with pattern `examples/*/*`. Each example is an independent package under `examples/<category>/<name>/`.

**Each example contains**:
- `package.json` — with `"type": "module"`, `tsx` as devDep, `@jambonz/sdk` + `pino` as deps
- `src/index.ts` — the application entry point
- `README.md` — documents the example, its envVars, and environment variables

**SDK import pattern**: `import { createEndpoint } from '@jambonz/sdk/websocket'` — the SDK has sub-path exports: `/websocket`, `/webhook`, `/client`, `/types`.

**Standard application structure**:
```typescript
import * as http from 'node:http';
import pino from 'pino';
import { createEndpoint } from '@jambonz/sdk/websocket';

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
const port = parseInt(process.env.PORT || '3000', 10);
const server = http.createServer();
const makeService = createEndpoint({ server, port, envVars });
const svc = makeService({ path: '/' });

svc.on('session:new', (session) => {
  const log = logger.child({ call_sid: session.callSid });
  // ... verb chain ...
  session.verb1(...).verb2(...).send();
});
```

**Key patterns**:
- `pino` for all logging, with a child logger per call binding `call_sid`
- `envVars` object passed to `createEndpoint()` for portal-discoverable application variables — these arrive at runtime in `session.data.env_vars`
- `envVars` support `type`, `description`, `default`, `enum` (dropdown), `required`, `obscure` (secrets), `uiHint` (`textarea`, `filepicker`)
- Action hooks: verb callbacks arrive as session events on the hook path (e.g., `session.on('/my-hook', handler)`)
- `session.send()` for initial verb delivery, `session.reply()` for responding to action hooks
- Pipeline examples derive LLM vendor from model name: `model.startsWith('claude') ? 'anthropic' : 'openai'`

## Style

- ESLint 9 flat config with `typescript-eslint` and `eslint-plugin-promise`
- 2-space indent, single quotes, semicolons, 120 char max line length
- `space-before-function-paren: 'never'` — no space before parens: `function foo()`, `async(evt)`
- `promise/always-return: 'error'` — `.then()` callbacks must return a value on all paths
- `prefer-const`, `arrow-parens: 'always'`
