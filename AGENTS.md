<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Cursor Cloud specific instructions

Standard commands live in `README.md` and `package.json` (`dev`, `build`, `lint`, `test`, `db:push`, `db:seed`, `db:studio`). Notes below are the non-obvious bits for running this app in the Cloud Agent VM.

### Database: local Postgres behind a Neon HTTP/WS proxy

The app talks to Postgres only through `@neondatabase/serverless` (`drizzle-orm/neon-http`), which speaks Neon's SQL-over-HTTP/WebSocket protocol instead of TCP. In this VM that endpoint is faked by a tiny local proxy so the app runs unmodified against a local Postgres:

- Real Postgres 16 runs locally (cluster `16/main`, port 5432, role/db `pokermon`/`pokermon`).
- `.cursor/neon-proxy/server.mjs` serves `https://api.pokermon.local/sql` (HTTP transport) and `wss://.../v2` (WebSocket tunnel for `drizzle-kit push`/`studio`), forwarding to local Postgres.
- The neon driver rewrites the first host label to `api.` and always uses `https://<host>/sql` on port 443, so `.env.local` uses host `pg.pokermon.local` → driver hits `api.pokermon.local`. Both names map to `127.0.0.1` in `/etc/hosts`.
- The `node` binary has `cap_net_bind_service` (via `setcap`) so the proxy can bind port 443 as the `ubuntu` user.
- Postgres loopback auth is set to cleartext `password` in `pg_hba.conf` to match the driver's `pipelineConnect: "password"` default (otherwise `db:push` fails with an "invalid SASL authentication mechanism" error).
- `NODE_EXTRA_CA_CERTS` is exported in `~/.bashrc` pointing at the proxy's self-signed cert (`~/.config/pokermon-neon-proxy/proxy.crt`) so Node's fetch/WebSocket trust it. Any node process that talks to the DB (dev server, `db:push`, `db:seed`, `tsx`) needs this env var; interactive shells get it automatically.

These pieces (Postgres install/data, certs, `/etc/hosts`, `setcap`, `~/.bashrc`) are baked into the VM; the startup update script only refreshes JS dependencies.

### Starting services (not auto-started on boot)

Run these once per fresh VM, in order:

1. Postgres: `sudo pg_ctlcluster 16 main start` (no-op/harmless if already running).
2. Proxy: `node .cursor/neon-proxy/server.mjs` (leave running; must be up before any DB call, including `db:push`/`db:seed`).
3. Dev server: `npm run dev` (http://localhost:3000).

`.env.local` (gitignored) holds `DATABASE_URL` + `SESSION_SECRET`; the update script creates it if missing.

### Gotchas

- `npm run lint` currently reports 2 pre-existing errors in `src/components/BottomNav.tsx` (new `react-hooks` rules); they are not caused by environment setup.
- `npm run test` (vitest) is pure ledger math and needs no database.
- If you re-run `npm install`, npm may rewrite `package-lock.json` metadata; that churn is cosmetic — don't commit it.
