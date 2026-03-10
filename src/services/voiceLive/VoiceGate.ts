// ═══════════════════════════════════════════════════════════
// VoiceGate — Silero VAD-based audio gating
//
// Sits between AudioCapture and Gemini Live:
//   AudioCapture → onChunk → VoiceGate.feed() → [VAD] → onSpeechChunk
//
// Only forwards audio chunks that contain actual speech.
// Uses Silero VAD v5 (ONNX) via onnxruntime-web.
//
// Design:
//   feed() is synchronous — uses the PREVIOUS inference result
//   to decide immediately, then kicks off async inference for
//   the current chunk. Pre-speech buffer (3 chunks = 450ms)
//   ensures no audio is lost at speech start.
//
// Pipeline latency: ~150ms (one chunk) — imperceptible.
// ═══════════════════════════════════════════════════════════

import * as ort from 'onnxruntime-web';

// Silero VAD v5 expects 512 samples @ 16kHz per frame (32ms)
const FRAME_SIZE = 512;

/** VoiceGate configuration */
export interface VoiceGateConfig {
  /** Probability to START speech detection (0-1, default 0.7) */
  positiveSpeechThreshold?: number;
  /** Probability to END speech detection (0-1, default 0.3) */
  negativeSpeechThreshold?: number;
  /** Pre-speech chunks to buffer (default 3 = ~450ms) */
  preSpeechBufferSize?: number;
  /** Silence hangover in chunks before ending speech (default 4 = ~600ms) */
  silenceHangoverChunks?: number;
}

export class VoiceGate {
  // ── Callbacks ──
  onSpeechChunk: (pcm: ArrayBuffer) => void = () => {};
  onSpeechStateChange: (speaking: boolean) => void = () => {};

  // ── State ──
  private speaking = false;
  private preSpeechBuffer: ArrayBuffer[] = [];
  private silenceChunkCount = 0;

  // ── ONNX session + Silero hidden state ──
  private session: ort.InferenceSession | null = null;
  private h: ort.Tensor | null = null;
  private c: ort.Tensor | null = null;
  private sr: ort.Tensor | null = null;
  private ready = false;
  private inferring = false;

  // Latest speech probability from async inference
  private currentProb = 0;

  // ── Config ──
  private positiveThreshold: number;
  private negativeThreshold: number;
  private preSpeechBufferSize: number;
  private silenceHangoverChunks: number;

  constructor(config: VoiceGateConfig = {}) {
    this.positiveThreshold = config.positiveSpeechThreshold ?? 0.7;
    this.negativeThreshold = config.negativeSpeechThreshold ?? 0.3;
    this.preSpeechBufferSize = config.preSpeechBufferSize ?? 3;
    this.silenceHangoverChunks = config.silenceHangoverChunks ?? 4;
  }

  // ═══════════════════════════════════════════════════════════
  // Public API
  // ═══════════════════════════════════════════════════════════

  /**
   * Load the Silero VAD v5 ONNX model.
   * Call once before feed(). Assets must be in public/vad/.
   */
  async init(): Promise<void> {
    try {
      // Point ONNX Runtime to our bundled WASM files
      ort.env.wasm.wasmPaths = '/vad/';
      // Disable threading to avoid SharedArrayBuffer requirements
      ort.env.wasm.numThreads = 1;

      this.session = await ort.InferenceSession.create('/vad/silero_vad_v5.onnx', {
        executionProviders: ['wasm'],
      });

      // Silero VAD v5 LSTM: 2 layers × 1 batch × 64 hidden units
      this.h = new ort.Tensor('float32', new Float32Array(128), [2, 1, 64]);
      this.c = new ort.Tensor('float32', new Float32Array(128), [2, 1, 64]);
      this.sr = new ort.Tensor('int64', BigInt64Array.from([16000n]), [1]);

      this.ready = true;
      console.log('[VoiceGate] ✅ Silero VAD v5 loaded');
    } catch (err) {
      console.error('[VoiceGate] ❌ Init failed — passthrough mode:', err);
      this.ready = false;
    }
  }

  /**
   * Feed a PCM16 chunk from AudioCapture (~150ms @ 16kHz).
   *
   * Synchronous decision based on previous inference result:
   *   speaking → forward chunk via onSpeechChunk
   *   silent   → buffer chunk (pre-speech ring buffer)
   *
   * Then kicks off async inference to update probability for next chunk.
   */
  feed(pcm: ArrayBuffer): void {
    if (!this.ready) {
      // VAD unavailable — passthrough
      this.onSpeechChunk(pcm);
      return;
    }

    // ── Immediate decision based on previous inference ──
    this.decide(pcm);

    // ── Async inference for next decision ──
    this.runInferenceAsync(pcm);
  }

  /** Current speech state */
  isSpeaking(): boolean {
    return this.speaking;
  }

  /** Reset state (new voice session) */
  reset(): void {
    this.speaking = false;
    this.currentProb = 0;
    this.preSpeechBuffer = [];
    this.silenceChunkCount = 0;
    this.inferring = false;
    // Reset LSTM hidden state
    if (this.h?.data) (this.h.data as Float32Array).fill(0);
    if (this.c?.data) (this.c.data as Float32Array).fill(0);
  }

  /** Release ONNX resources */
  async destroy(): Promise<void> {
    this.ready = false;
    if (this.session) {
      await this.session.release().catch(() => {});
      this.session = null;
    }
    this.h = null;
    this.c = null;
    this.sr = null;
    this.preSpeechBuffer = [];
  }

  // ═══════════════════════════════════════════════════════════
  // Decision logic
  // ═══════════════════════════════════════════════════════════

  private decide(pcm: ArrayBuffer): void {
    const prob = this.currentProb;

    if (!this.speaking) {
      // ── Silent state ──
      if (prob >= this.positiveThreshold) {
        // Speech detected — flush pre-speech buffer + forward
        this.speaking = true;
        this.silenceChunkCount = 0;
        this.onSpeechStateChange(true);

        for (const buffered of this.preSpeechBuffer) {
          this.onSpeechChunk(buffered);
        }
        this.preSpeechBuffer = [];
        this.onSpeechChunk(pcm);
      } else {
        // Still silent — ring-buffer for pre-speech capture
        this.preSpeechBuffer.push(pcm);
        if (this.preSpeechBuffer.length > this.preSpeechBufferSize) {
          this.preSpeechBuffer.shift();
        }
      }
    } else {
      // ── Speaking state ──
      if (prob < this.negativeThreshold) {
        this.silenceChunkCount++;
        if (this.silenceChunkCount >= this.silenceHangoverChunks) {
          // Sustained silence — end speech
          this.speaking = false;
          this.silenceChunkCount = 0;
          this.onSpeechStateChange(false);
          return;
        }
      } else {
        this.silenceChunkCount = 0;
      }
      // Still speaking (or hangover) — forward
      this.onSpeechChunk(pcm);
    }
  }

  // ═══════════════════════════════════════════════════════════
  // Async ONNX inference
  // ═══════════════════════════════════════════════════════════

  private runInferenceAsync(pcm: ArrayBuffer): void {
    if (this.inferring || !this.session || !this.h || !this.c || !this.sr) return;
    this.inferring = true;

    // Convert Int16 → Float32
    const int16 = new Int16Array(pcm);
    const float32 = new Float32Array(int16.length);
    for (let i = 0; i < int16.length; i++) {
      float32[i] = int16[i] / 32768;
    }

    // Process all complete frames, take max probability
    this.processFrames(float32)
      .then((maxProb) => {
        this.currentProb = maxProb;
      })
      .catch(() => {
        // Inference failed — keep last probability
      })
      .finally(() => {
        this.inferring = false;
      });
  }

  /**
   * Run Silero inference on all 512-sample frames in the chunk.
   * Returns the maximum speech probability across all frames.
   */
  private async processFrames(audio: Float32Array): Promise<number> {
    let maxProb = 0;
    let offset = 0;

    while (offset + FRAME_SIZE <= audio.length) {
      const frame = audio.subarray(offset, offset + FRAME_SIZE);
      offset += FRAME_SIZE;

      const input = new ort.Tensor('float32', frame, [1, FRAME_SIZE]);

      const result = await this.session!.run({
        input,
        sr: this.sr!,
        h: this.h!,
        c: this.c!,
      });

      // Update hidden state
      this.h = result.hn;
      this.c = result.cn;

      const prob = (result.output?.data as Float32Array)?.[0] ?? 0;
      if (prob > maxProb) maxProb = prob;
    }

    return maxProb;
  }
}
