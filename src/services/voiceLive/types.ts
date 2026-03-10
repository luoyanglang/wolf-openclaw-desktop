// ═══════════════════════════════════════════════════════════
// Voice Live — Shared Types
// ═══════════════════════════════════════════════════════════

/** Current state of the voice session */
export type VoiceState = 'idle' | 'listening' | 'thinking' | 'speaking';

/** Callback for receiving PCM audio chunks */
export type AudioChunkCallback = (pcm: ArrayBuffer) => void;

/** Configuration for GeminiLiveService.connect() */
export interface GeminiLiveConfig {
  /** Gemini API key */
  apiKey: string;
  /** Live model id (e.g. 'gemini-2.5-flash-native-audio-latest') */
  model: string;
  /** Voice name (e.g. 'Orus', 'Kore', 'Puck') */
  voice?: string;
  /** System instruction for the relay */
  systemPrompt: string;

  // ── Callbacks ──

  /** Called when Gemini sends a function call with the user's transcribed message */
  onToolCall: (message: string) => void;
  /** Called for each PCM audio output chunk (24kHz, 16-bit LE mono) */
  onAudioChunk: (pcm24k: ArrayBuffer) => void;
  /** Called when the voice state changes */
  onStateChange: (state: VoiceState) => void;
  /** Optional: called with any text output from the model */
  onTranscript?: (text: string) => void;
  /** Called on connection or runtime errors */
  onError: (error: Error) => void;
  /** Called when the WebSocket connection closes */
  onClose: () => void;
}

/** Persisted user settings for Voice Live */
export interface VoiceLiveSettings {
  geminiApiKey: string;
  geminiModel: string;
  geminiVoice: string;
  responseModel: string;
}
