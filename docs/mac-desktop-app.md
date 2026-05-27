# Chronicle Mac Desktop App

Chronicle now supports a Mac desktop packaging path that keeps the app local-first while embedding the local service layer inside the desktop lifecycle.

## What the desktop app does

- launches an Electron shell
- starts an embedded Chronicle preview server on `127.0.0.1:43174`
- keeps the mutable Chronicle service root in:
  - `~/Library/Application Support/Chronicle/service`
- keeps your local-first data inside that service root instead of depending on the repo living on the Desktop

## Why it is shaped this way

Chronicle already depends on:

- local files
- local Bible assets
- local OCR/import scripts
- local snapshots
- local voice and Home Assistant routes

So the desktop app keeps those assumptions, but moves ownership under a real installed app instead of a manually run repo folder.

## Development

Run the normal Vite app plus the Electron shell:

```bash
npm run desktop:dev
```

That launches:

- Vite on `http://127.0.0.1:5175`
- Electron pointed at that dev URL

## Packaging

Create a local `.app` directory build:

```bash
npm run desktop:build
```

Create a distributable Mac build:

```bash
npm run desktop:dist
```

## Embedded service layout

On launch, the desktop app syncs runtime assets into the Chronicle service root:

- `dist/`
- `public/`
- `scripts/`
- `src/`
- `vite.config.ts`
- `package.json`
- `tsconfig*.json`

It also seeds `data/` on first run without overwriting existing user data.

## Secrets and local env

The desktop service reads local environment values from:

1. the process environment
2. `~/Library/Application Support/Chronicle/chronicle.env` if present
3. `~/Library/Application Support/Chronicle/service/.env.local`

That gives Chronicle a stable place for local secrets like:

- `OPENAI_API_KEY`
- `CHRONICLE_HOME_ASSISTANT_URL`
- `CHRONICLE_HOME_ASSISTANT_TOKEN`
- `LIVEKIT_URL`
- `LIVEKIT_API_KEY`
- `LIVEKIT_API_SECRET`

## Notes

- The packaged app still uses a local HTTP service internally; it is just app-managed now.
- The service root is intentionally local and user-owned.
- LAN or always-on serving can still be layered on top later, but the desktop app no longer depends on the repo folder staying in one place.
