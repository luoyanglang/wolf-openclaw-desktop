// ═══════════════════════════════════════════════════════════
// GeminiLiveService — Gemini Live WebSocket voice relay
//
// Manages the real-time WebSocket connection to Gemini's
// native-audio model. Gemini acts as STT + TTS only;
// all intelligence comes from the OpenClaw Gateway via
// the ask_aegis function call.
//
// Critical implementation notes (proven by PoC testing):
//   - Callbacks MUST be passed at connect() time
//   - responseModalities: ['AUDIO'] is required
//   - thinkingConfig: MINIMAL (relay should not reason)
//   - Function calling mode: AUTO (ANY causes infinite loop)
//   - Audio input: PCM16 @ 16kHz
//   - Audio output: PCM16 @ 24kHz
// ═══════════════════════════════════════════════════════════

import {
  GoogleGenAI,
  Modality,
  ThinkingLevel,
  Type,
} from '@google/genai';
import type { GeminiLiveConfig, VoiceState } from './types';

/** The ask_aegis function declaration exposed to Gemini */
const ASK_AEGIS_DECLARATION = {
  name: 'ask_aegis',
  description:
    'Forward the user message to AEGIS for processing. Call this for EVERY user input without exception.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      message: {
        type: Type.STRING,
        description: 'The user message to forward to AEGIS',
      },
    },
    required: ['message'],
  },
};

export class GeminiLiveService {
  // ── Private state ──
  private session: any = null;
  private config: GeminiLiveConfig | null = null;
  private connected = false;
  private pendingCallId: string | null = null;
  private toolCallCancelled = false;

  // ═══════════════════════════════════════════════════════════
  // Public API
  // ═══════════════════════════════════════════════════════════

  /**
   * Connect to Gemini Live WebSocket.
   * Callbacks are wired at connect time (the only way that works with the SDK).
   */
  async connect(config: GeminiLiveConfig): Promise<void> {
    // Disconnect any existing session first
    if (this.session) {
      this.disconnect();
    }

    this.config = config;
    const ai = new GoogleGenAI({ apiKey: config.apiKey });

    try {
      this.session = await ai.live.connect({
        model: config.model,
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: config.systemPrompt,
          tools: [{ functionDeclarations: [ASK_AEGIS_DECLARATION] }],
          // Function calling mode is controlled by the system prompt.
          // The SDK's Live API does not expose toolConfig directly.
          // System prompt strongly instructs Gemini to always call ask_aegis.
          // NEVER use mode: ANY at the API level — it causes infinite loop.
          thinkingConfig: {
            thinkingLevel: ThinkingLevel.MINIMAL,
          },
          speechConfig: config.voice
            ? {
                voiceConfig: {
                  prebuiltVoiceConfig: {
                    voiceName: config.voice,
                  },
                },
              }
            : undefined,
        },
        callbacks: {
          onmessage: (msg: any) => this.handleMessage(msg),
          onerror: (e: any) => this.handleError(e),
          onclose: (e: any) => this.handleClose(e),
        },
      });

      this.connected = true;
      config.onStateChange('listening');
    } catch (err) {
      this.connected = false;
      config.onError(
        err instanceof Error ? err : new Error(String(err))
      );
      throw err;
    }
  }

  /**
   * Stream a chunk of microphone audio to Gemini.
   * @param pcm16k - Raw PCM16 mono audio at 16kHz (Int16 little-endian)
   */
  sendAudio(pcm16k: ArrayBuffer): void {
    if (!this.session || !this.connected) return;

    // Convert ArrayBuffer to base64
    const base64 = this.arrayBufferToBase64(pcm16k);

    try {
      this.session.sendRealtimeInput({
        audio: {
          data: base64,
          mimeType: 'audio/pcm;rate=16000',
        },
      });
    } catch (err) {
      console.error('[GeminiLive] sendAudio error:', err);
    }
  }

  /**
   * Send the Gateway's response back to Gemini so it can read it aloud.
   * @param text - The AEGIS response text
   */
  /**
   * Send the Gateway's response back to Gemini so it can read it aloud.
   * Returns true if the response was sent, false if the tool call was cancelled.
   */
  sendToolResponse(text: string): boolean {
    // Tool call was cancelled while Gateway was processing
    if (this.toolCallCancelled) {
      console.warn('[GeminiLive] Tool call was cancelled — dropping response, back to listening');
      this.toolCallCancelled = false;
      this.pendingCallId = null;
      this.config?.onStateChange('listening');
      return false;
    }

    if (!this.session || !this.connected || !this.pendingCallId) {
      console.warn('[GeminiLive] sendToolResponse called but no pending call');
      return false;
    }

    try {
      this.session.sendToolResponse({
        functionResponses: [
          {
            name: 'ask_aegis',
            id: this.pendingCallId,
            response: { content: text },
          },
        ],
      });
      this.pendingCallId = null;
      this.toolCallCancelled = false;

      // Gemini will now generate audio — state → speaking
      this.config?.onStateChange('speaking');
      return true;
    } catch (err) {
      console.error('[GeminiLive] sendToolResponse error:', err);
      this.config?.onError(
        err instanceof Error ? err : new Error(String(err))
      );
      return false;
    }
  }

  /**
   * Disconnect from Gemini Live WebSocket.
   */
  disconnect(): void {
    if (this.session) {
      try {
        this.session.close?.();
      } catch {
        // Ignore close errors
      }
      this.session = null;
    }
    this.connected = false;
    this.pendingCallId = null;
    this.toolCallCancelled = false;
  }

  /**
   * Check if currently connected.
   */
  isConnected(): boolean {
    return this.connected;
  }

  // ═══════════════════════════════════════════════════════════
  // Message handler
  // ═══════════════════════════════════════════════════════════

  private handleMessage(msg: any): void {
    if (!this.config) return;

    // ── Function call from Gemini (ask_aegis) ──
    if (msg.toolCall) {
      const calls = msg.toolCall.functionCalls;
      if (calls && calls.length > 0) {
        const call = calls[0];
        // Save the call ID for sendToolResponse later
        this.pendingCallId = call.id;
        const userMessage = call.args?.message || '';

        // State → thinking (Gateway is about to process)
        this.config.onStateChange('thinking');
        this.config.onToolCall(userMessage);
      }
      return;
    }

    // ── Tool call cancellation (Gemini cancelled a pending function call) ──
    if (msg.toolCallCancellation) {
      console.warn('[GeminiLive] ⚠️ Tool call cancelled by Gemini — suppressing (Gateway still processing)');
      this.toolCallCancelled = true;
      // Do NOT emit 'listening' here — mic must stay muted while Gateway is processing.
      // VoiceLivePage will handle cleanup when the Gateway response arrives.
      return;
    }

    // ── Server content (audio output or turn signals) ──
    if (msg.serverContent) {
      const sc = msg.serverContent;

      // Audio chunks from model response
      if (sc.modelTurn?.parts) {
        for (const part of sc.modelTurn.parts) {
          // Audio data (base64 PCM @ 24kHz)
          if (part.inlineData?.data) {
            const pcm = this.base64ToArrayBuffer(part.inlineData.data);
            this.config.onAudioChunk(pcm);
          }
          // Optional text output
          if (part.text && this.config.onTranscript) {
            this.config.onTranscript(part.text);
          }
        }
      }

      // Turn complete — Gemini finished speaking, ready for next input
      if (sc.turnComplete) {
        this.config.onStateChange('listening');
      }
    }
  }

  private handleError(e: any): void {
    console.error('[GeminiLive] WebSocket error:', e);
    this.config?.onError(
      e instanceof Error ? e : new Error(e?.message || String(e))
    );
  }

  private handleClose(e: any): void {
    this.connected = false;
    this.session = null;
    this.pendingCallId = null;
    this.config?.onClose();
  }

  // ═══════════════════════════════════════════════════════════
  // Encoding helpers
  // ═══════════════════════════════════════════════════════════

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }
}
