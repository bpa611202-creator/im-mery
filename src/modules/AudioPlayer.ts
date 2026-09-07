export class AudioPlayer {
  private audioContext: AudioContext | null = null;
  private analyserNode: AnalyserNode | null = null;
  private gainNode: GainNode | null = null;
  private nextStartTime: number = 0;
  private activeSources: AudioBufferSourceNode[] = [];
  private isCurrentlyPlaying: boolean = false;
  private frequencyData: Uint8Array = new Uint8Array(64);
  private currentVolume: number = 0;

  private onPlaybackStartCallback: (() => void) | null = null;
  private onPlaybackEndCallback: (() => void) | null = null;
  private endTimeout: any = null;

  init() {
    if (!this.audioContext || this.audioContext.state === 'closed') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      // Output: 24kHz for Gemini Live API audio
      this.audioContext = new AudioCtx({ sampleRate: 24000 });

      this.gainNode = this.audioContext.createGain();
      this.gainNode.gain.value = 1.0;

      this.analyserNode = this.audioContext.createAnalyser();
      this.analyserNode.fftSize = 128;
      this.frequencyData = new Uint8Array(this.analyserNode.frequencyBinCount);

      this.gainNode.connect(this.analyserNode);
      this.analyserNode.connect(this.audioContext.destination);
    }
  }

  setCallbacks(onStart: () => void, onEnd: () => void) {
    this.onPlaybackStartCallback = onStart;
    this.onPlaybackEndCallback = onEnd;
  }

  async playPCMChunk(base64Pcm: string, sampleRate: number = 24000) {
    this.init();

    if (this.audioContext && this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    if (!this.audioContext || !this.gainNode) return;

    try {
      // Decode base64 to binary
      const binaryString = atob(base64Pcm);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Convert 16-bit PCM (little endian) to Float32 [-1, 1] using DataView to handle alignment safely
      const sampleCount = Math.floor(bytes.byteLength / 2);
      if (sampleCount === 0) return;
      const dataView = new DataView(bytes.buffer, bytes.byteOffset, sampleCount * 2);
      const float32Array = new Float32Array(sampleCount);
      for (let i = 0; i < sampleCount; i++) {
        float32Array[i] = dataView.getInt16(i * 2, true) / 32768.0;
      }

      // Create AudioBuffer
      const audioBuffer = this.audioContext.createBuffer(1, float32Array.length, sampleRate);
      audioBuffer.copyToChannel(float32Array, 0);

      // Schedule gapless playback
      const currentTime = this.audioContext.currentTime;
      const startTime = Math.max(currentTime, this.nextStartTime);

      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.gainNode);

      this.activeSources.push(source);

      source.onended = () => {
        const idx = this.activeSources.indexOf(source);
        if (idx !== -1) {
          this.activeSources.splice(idx, 1);
        }
        if (this.activeSources.length === 0) {
          this.scheduleEndCheck();
        }
      };

      source.start(startTime);
      this.nextStartTime = startTime + audioBuffer.duration;

      if (!this.isCurrentlyPlaying) {
        this.isCurrentlyPlaying = true;
        if (this.endTimeout) {
          clearTimeout(this.endTimeout);
          this.endTimeout = null;
        }
        this.onPlaybackStartCallback?.();
      }
    } catch (err: any) {
      console.warn('[AudioPlayer] PCM playback notice:', err?.message || err);
    }
  }

  // Support for playing encoded audio (e.g. ElevenLabs / Cartesia MP3/WAV)
  async playEncodedAudio(base64Audio: string) {
    this.init();
    if (!this.audioContext || !this.gainNode) return;

    try {
      this.stop(); // Clear any existing stream
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      const binaryString = atob(base64Audio);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const decodedBuffer = await this.audioContext.decodeAudioData(bytes.buffer.slice(0));
      const source = this.audioContext.createBufferSource();
      source.buffer = decodedBuffer;
      source.connect(this.gainNode);

      this.activeSources.push(source);
      this.isCurrentlyPlaying = true;
      this.onPlaybackStartCallback?.();

      source.onended = () => {
        const idx = this.activeSources.indexOf(source);
        if (idx !== -1) this.activeSources.splice(idx, 1);
        this.isCurrentlyPlaying = false;
        this.onPlaybackEndCallback?.();
      };

      source.start(0);
    } catch (err: any) {
      console.warn('[AudioPlayer] Encoded audio playback notice:', err?.message || err);
      this.isCurrentlyPlaying = false;
      this.onPlaybackEndCallback?.();
    }
  }

  private scheduleEndCheck() {
    if (this.endTimeout) clearTimeout(this.endTimeout);
    this.endTimeout = setTimeout(() => {
      if (this.activeSources.length === 0 && this.isCurrentlyPlaying) {
        this.isCurrentlyPlaying = false;
        this.currentVolume = 0;
        this.onPlaybackEndCallback?.();
      }
    }, 120);
  }

  // Instant interruption: stop all active sources and clear timeline
  stop() {
    if (this.endTimeout) {
      clearTimeout(this.endTimeout);
      this.endTimeout = null;
    }

    for (const source of this.activeSources) {
      try {
        source.onended = null;
        source.stop();
        source.disconnect();
      } catch {}
    }
    this.activeSources = [];
    this.nextStartTime = 0;
    this.currentVolume = 0;

    if (this.isCurrentlyPlaying) {
      this.isCurrentlyPlaying = false;
      this.onPlaybackEndCallback?.();
    }
  }

  // Complete cleanup: stops active sources, clears buffers, and closes AudioContext
  cleanup() {
    this.stop();
    if (this.audioContext && this.audioContext.state !== 'closed') {
      try {
        this.audioContext.close();
      } catch {}
      this.audioContext = null;
      this.gainNode = null;
      this.analyserNode = null;
    }
  }

  isPlaying(): boolean {
    return this.isCurrentlyPlaying || this.activeSources.length > 0;
  }

  getVolume(): number {
    if (!this.isPlaying()) return 0;
    if (this.analyserNode) {
      this.analyserNode.getByteFrequencyData(this.frequencyData);
      let sum = 0;
      for (let i = 0; i < this.frequencyData.length; i++) {
        sum += this.frequencyData[i];
      }
      this.currentVolume = Math.min(1, (sum / this.frequencyData.length / 128) * 1.6);
    }
    return this.currentVolume;
  }

  getFrequencyData(): Uint8Array {
    if (!this.isPlaying()) {
      this.frequencyData.fill(0);
      return this.frequencyData;
    }
    if (this.analyserNode) {
      this.analyserNode.getByteFrequencyData(this.frequencyData);
    }
    return this.frequencyData;
  }

  setVolume(volume: number) {
    if (this.gainNode) {
      this.gainNode.gain.value = Math.max(0, Math.min(1, volume));
    }
  }
}

export const audioPlayer = new AudioPlayer();
