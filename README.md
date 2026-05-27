# Chronicle

Chronicle is a local-first Bible study, prayer, discipleship, and reflection app.

## Local development

```bash
npm install
npm run dev
```

## LAN serving

```bash
npm run serve:lan
```

## Mac desktop app

Chronicle can now be packaged as a Mac desktop app while keeping the local-first architecture and embedded service layer.

Development shell:

```bash
npm run desktop:dev
```

Package a local `.app` bundle:

```bash
npm run desktop:build
```

Create a distributable Mac build:

```bash
npm run desktop:dist
```

See [docs/mac-desktop-app.md](/Users/chris/Desktop/CODE/chronicle/docs/mac-desktop-app.md) for how the embedded service root, Application Support data, and local env/secrets work.

## Voice stack

Chronicle now includes a local voice foundation for Whisper, Piper, LiveKit, and Home Assistant.

See [docs/voice-stack.md](/Users/chris/Desktop/CODE/chronicle/docs/voice-stack.md) for the backend routes, required environment variables, and the LiveKit worker scaffold.
