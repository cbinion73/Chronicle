import type { ChronicleVoiceConfig } from '../types';

interface VoiceErrorPayload {
  error?: { errmsg?: string };
}

async function readJson<T>(response: Response): Promise<T> {
  const payload = await response.json() as T & VoiceErrorPayload;
  if (!response.ok) {
    throw new Error(payload.error?.errmsg || 'Voice request failed.')
  }
  return payload
}

function blobToBase64(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(reader.error || new Error('Unable to read audio blob.'))
    reader.onloadend = () => {
      const result = typeof reader.result === 'string' ? reader.result : ''
      resolve(result.split(',').pop() || '')
    }
    reader.readAsDataURL(blob)
  })
}

export interface ChronicleVoiceStatusPayload {
  ok: true;
  providers: {
    whisperCli: { available: boolean; command: string; model: string };
    localAi: { configured: boolean; baseUrl: string | null };
    piper: { available: boolean; command: string; modelConfigured: boolean; modelPath: string | null };
    homeAssistant: { configured: boolean; baseUrl: string | null; hasTtsTarget: boolean; hasMediaPlayer: boolean };
    liveKit: { configured: boolean; url: string | null };
  };
}

export async function fetchVoiceStatus() {
  const response = await fetch('/api/voice/status')
  return readJson<ChronicleVoiceStatusPayload>(response)
}

export async function transcribeVoiceBlob(blob: Blob, config: ChronicleVoiceConfig, provider = config.transcriptionProvider) {
  const audioBase64 = await blobToBase64(blob)
  const response = await fetch('/api/voice/transcribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      audioBase64,
      mimeType: blob.type,
      fileName: `chronicle-voice.${blob.type.includes('ogg') ? 'ogg' : blob.type.includes('wav') ? 'wav' : 'webm'}`,
      provider,
      config,
    }),
  })
  return readJson<{ ok: true; provider: string; transcript: string }>(response)
}

export async function synthesizeVoice(text: string, config: ChronicleVoiceConfig, provider = config.synthesisProvider) {
  const response = await fetch('/api/voice/speak', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text,
      provider,
      config,
    }),
  })
  return readJson<{ ok: true; provider: string; delivered?: boolean; mimeType?: string; audioBase64?: string }>(response)
}

export async function generateLiveKitVoiceToken(config: ChronicleVoiceConfig) {
  const response = await fetch('/api/voice/livekit/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ config }),
  })
  return readJson<{ ok: true; url: string; roomName: string; participantName: string; agentName: string; token: string }>(response)
}

export async function askHomeAssistantVoice(text: string, config: ChronicleVoiceConfig) {
  const response = await fetch('/api/voice/home-assistant/conversation', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, config }),
  })
  return readJson<{ ok: true; conversationId?: string; reply: string }>(response)
}
