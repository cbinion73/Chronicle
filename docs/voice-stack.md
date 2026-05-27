# Chronicle Voice Stack

Chronicle now includes a local voice foundation for:

1. `Whisper` speech-to-text
2. `Piper` local text-to-speech
3. `LiveKit` room-based realtime sessions
4. `Home Assistant` voice automation and announcements

## Chronicle routes

- `GET /api/voice/status`
- `POST /api/voice/transcribe`
- `POST /api/voice/speak`
- `POST /api/voice/home-assistant/conversation`
- `POST /api/voice/home-assistant/service`
- `POST /api/voice/livekit/token`

## Environment variables

### Whisper / Piper

- `CHRONICLE_WHISPER_COMMAND`
- `CHRONICLE_WHISPER_MODEL`
- `CHRONICLE_PIPER_COMMAND`
- `CHRONICLE_PIPER_MODEL`

### LocalAI

- `CHRONICLE_LOCALAI_BASE_URL`
- `CHRONICLE_LOCALAI_API_KEY`
- `CHRONICLE_LOCALAI_WHISPER_MODEL`

### Home Assistant

- `CHRONICLE_HOME_ASSISTANT_URL`
- `CHRONICLE_HOME_ASSISTANT_TOKEN`
- `CHRONICLE_HOME_ASSISTANT_CONVERSATION_AGENT`
- `CHRONICLE_HOME_ASSISTANT_TTS_ENTITY_ID`
- `CHRONICLE_HOME_ASSISTANT_MEDIA_PLAYER_ENTITY_ID`

### LiveKit

- `LIVEKIT_URL`
- `LIVEKIT_API_KEY`
- `LIVEKIT_API_SECRET`

## Notes

- Chronicle stores local routing and model choices in app state.
- Chronicle keeps Home Assistant and LiveKit secrets server-side in environment variables.
- `piper-cli` speaks on the machine running Chronicle.
- Home Assistant TTS is the path for remote speakers and voice satellites.
- The LiveKit scaffold under `voice/livekit-agent/` is intentionally small and is meant to be adapted, not shipped unchanged.
