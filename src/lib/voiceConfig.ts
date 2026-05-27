import type { ChronicleVoiceConfig } from '../types';

export const DEFAULT_CHRONICLE_VOICE_CONFIG: ChronicleVoiceConfig = {
  enabled: false,
  autoSpeakResponses: false,
  saveVoiceTranscriptsToChronicle: true,
  transcriptionProvider: 'whisper-cli',
  synthesisProvider: 'piper-cli',
  realtimeProvider: 'none',
  automationProvider: 'none',
  whisperCli: {
    command: 'whisper',
    model: 'base',
    language: 'auto',
    translateToEnglish: false,
    initialPrompt: 'Chronicle reflection, prayer, Bible study, discipleship, formation',
  },
  localAi: {
    baseUrl: 'http://127.0.0.1:8080',
    whisperModel: 'whisper-1',
    apiKey: '',
  },
  piper: {
    command: 'piper',
    modelPath: '',
    speaker: 0,
  },
  homeAssistant: {
    baseUrl: 'http://homeassistant.local:8123',
    conversationAgentId: 'home_assistant',
    ttsEntityId: 'tts.piper',
    mediaPlayerEntityId: '',
    preferredLanguage: 'en',
  },
  liveKit: {
    url: '',
    roomName: 'chronicle-voice',
    participantName: 'chronicle-user',
    agentName: 'Chronicle Voice',
    tokenTtlMinutes: 10,
  },
};

export function normalizeVoiceConfig(value: unknown): ChronicleVoiceConfig {
  const next = value && typeof value === 'object'
    ? value as Partial<ChronicleVoiceConfig>
    : {};

  return {
    ...DEFAULT_CHRONICLE_VOICE_CONFIG,
    ...next,
    enabled: next.enabled === true,
    autoSpeakResponses: next.autoSpeakResponses === true,
    saveVoiceTranscriptsToChronicle: next.saveVoiceTranscriptsToChronicle !== false,
    transcriptionProvider: next.transcriptionProvider === 'localai-openai' ? 'localai-openai' : 'whisper-cli',
    synthesisProvider: next.synthesisProvider === 'home-assistant-tts' ? 'home-assistant-tts' : 'piper-cli',
    realtimeProvider: next.realtimeProvider === 'livekit' ? 'livekit' : 'none',
    automationProvider: next.automationProvider === 'home-assistant' ? 'home-assistant' : 'none',
    whisperCli: {
      ...DEFAULT_CHRONICLE_VOICE_CONFIG.whisperCli,
      ...(next.whisperCli || {}),
      command: typeof next.whisperCli?.command === 'string' && next.whisperCli.command.trim().length > 0
        ? next.whisperCli.command
        : DEFAULT_CHRONICLE_VOICE_CONFIG.whisperCli.command,
      model: typeof next.whisperCli?.model === 'string' && next.whisperCli.model.trim().length > 0
        ? next.whisperCli.model
        : DEFAULT_CHRONICLE_VOICE_CONFIG.whisperCli.model,
      language: typeof next.whisperCli?.language === 'string' && next.whisperCli.language.trim().length > 0
        ? next.whisperCli.language
        : DEFAULT_CHRONICLE_VOICE_CONFIG.whisperCli.language,
      translateToEnglish: next.whisperCli?.translateToEnglish === true,
      initialPrompt: typeof next.whisperCli?.initialPrompt === 'string'
        ? next.whisperCli.initialPrompt
        : DEFAULT_CHRONICLE_VOICE_CONFIG.whisperCli.initialPrompt,
    },
    localAi: {
      ...DEFAULT_CHRONICLE_VOICE_CONFIG.localAi,
      ...(next.localAi || {}),
      baseUrl: typeof next.localAi?.baseUrl === 'string'
        ? next.localAi.baseUrl
        : DEFAULT_CHRONICLE_VOICE_CONFIG.localAi.baseUrl,
      whisperModel: typeof next.localAi?.whisperModel === 'string' && next.localAi.whisperModel.trim().length > 0
        ? next.localAi.whisperModel
        : DEFAULT_CHRONICLE_VOICE_CONFIG.localAi.whisperModel,
      apiKey: typeof next.localAi?.apiKey === 'string' ? next.localAi.apiKey : '',
    },
    piper: {
      ...DEFAULT_CHRONICLE_VOICE_CONFIG.piper,
      ...(next.piper || {}),
      command: typeof next.piper?.command === 'string' && next.piper.command.trim().length > 0
        ? next.piper.command
        : DEFAULT_CHRONICLE_VOICE_CONFIG.piper.command,
      modelPath: typeof next.piper?.modelPath === 'string' ? next.piper.modelPath : '',
      speaker: typeof next.piper?.speaker === 'number' ? next.piper.speaker : DEFAULT_CHRONICLE_VOICE_CONFIG.piper.speaker,
    },
    homeAssistant: {
      ...DEFAULT_CHRONICLE_VOICE_CONFIG.homeAssistant,
      ...(next.homeAssistant || {}),
      baseUrl: typeof next.homeAssistant?.baseUrl === 'string'
        ? next.homeAssistant.baseUrl
        : DEFAULT_CHRONICLE_VOICE_CONFIG.homeAssistant.baseUrl,
      conversationAgentId: typeof next.homeAssistant?.conversationAgentId === 'string' && next.homeAssistant.conversationAgentId.trim().length > 0
        ? next.homeAssistant.conversationAgentId
        : DEFAULT_CHRONICLE_VOICE_CONFIG.homeAssistant.conversationAgentId,
      ttsEntityId: typeof next.homeAssistant?.ttsEntityId === 'string' && next.homeAssistant.ttsEntityId.trim().length > 0
        ? next.homeAssistant.ttsEntityId
        : DEFAULT_CHRONICLE_VOICE_CONFIG.homeAssistant.ttsEntityId,
      mediaPlayerEntityId: typeof next.homeAssistant?.mediaPlayerEntityId === 'string'
        ? next.homeAssistant.mediaPlayerEntityId
        : '',
      preferredLanguage: typeof next.homeAssistant?.preferredLanguage === 'string' && next.homeAssistant.preferredLanguage.trim().length > 0
        ? next.homeAssistant.preferredLanguage
        : DEFAULT_CHRONICLE_VOICE_CONFIG.homeAssistant.preferredLanguage,
    },
    liveKit: {
      ...DEFAULT_CHRONICLE_VOICE_CONFIG.liveKit,
      ...(next.liveKit || {}),
      url: typeof next.liveKit?.url === 'string' ? next.liveKit.url : '',
      roomName: typeof next.liveKit?.roomName === 'string' && next.liveKit.roomName.trim().length > 0
        ? next.liveKit.roomName
        : DEFAULT_CHRONICLE_VOICE_CONFIG.liveKit.roomName,
      participantName: typeof next.liveKit?.participantName === 'string' && next.liveKit.participantName.trim().length > 0
        ? next.liveKit.participantName
        : DEFAULT_CHRONICLE_VOICE_CONFIG.liveKit.participantName,
      agentName: typeof next.liveKit?.agentName === 'string' && next.liveKit.agentName.trim().length > 0
        ? next.liveKit.agentName
        : DEFAULT_CHRONICLE_VOICE_CONFIG.liveKit.agentName,
      tokenTtlMinutes: typeof next.liveKit?.tokenTtlMinutes === 'number' && next.liveKit.tokenTtlMinutes > 0
        ? next.liveKit.tokenTtlMinutes
        : DEFAULT_CHRONICLE_VOICE_CONFIG.liveKit.tokenTtlMinutes,
    },
  };
}
