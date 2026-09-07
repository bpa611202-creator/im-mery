export class AudioStreamer {
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private processorNode: ScriptProcessorNode | null = null;
  private analyserNode: AnalyserNode | null = null;
  private isRecording: boolean = false;
  private isMuted: boolean = false;

  private onAudioChunkCallback: ((base64Pcm: string) => void) | null = null;
  private onUserInterruptCallback: (() => void) | null = null;
  private isAssistantSpeakingCheck: (() => boolean) | null = null;

  private interruptConsecutiveCount: number = 0;
  private currentVolume: number = 0;
  private frequencyData: Uint8Array = new Uint8Array(64);
  private currentSessionId: number = 0;

  async start(
    onAudioChunk: (base64Pcm: string) => void,
    onUserInterrupt: () => void,
    isAssistantSpeaking: () => boolean
  ): Promise<boolean> {
    // Stop any existing stream and increment session to guard against duplicate audio tracks
    this.stop();
    const sessionId = ++this.currentSessionId;

    try {
      this.onAudioChunkCallback = onAudioChunk;
      this.onUserInterruptCallback = onUserInterrupt;
      this.isAssistantSpeakingCheck = isAssistantSpeaking;

      // 1. Request microphone stream with clean echo cancellation
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // Guard against race conditions: if stop was requested while awaiting getUserMedia
      if (this.currentSessionId !== sessionId) {
        stream.getTracks().forEach((track) => track.stop());
        return false;
      }
      this.mediaStream = stream;

      // 2. AudioContext locked to 16kHz for Gemini Live API PCM16 requirement
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new AudioCtx({ sampleRate: 16000 });

      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      if (this.currentSessionId !== sessionId) {
        this.stop();
        return false;
      }

      // 3. Setup nodes
      this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.analyserNode = this.audioContext.createAnalyser();
      this.analyserNode.fftSize = 128;
      this.frequencyData = new Uint8Array(this.analyserNode.frequencyBinCount);

      // ScriptProcessor with 4096 buffer size (~256ms of 16kHz audio)
      this.processorNode = this.audioContext.createScriptProcessor(4096, 1, 1);

      this.processorNode.onaudioprocess = (e: AudioProcessingEvent) => {
        if (!this.isRecording || this.isMuted || this.currentSessionId !== sessionId) {
          this.currentVolume = 0;
          return;
        }

        const inputData = e.inputBuffer.getChannelData(0);

        // Calculate RMS volume for visualizer & interruption detection
        let sumSquares = 0;
        for (let i = 0; i < inputData.length; i++) {
          sumSquares += inputData[i] * inputData[i];
        }
        const rms = Math.sqrt(sumSquares / inputData.length);
        this.currentVolume = Math.min(1, rms * 4.5);

        // Update frequency data
        if (this.analyserNode) {
          this.analyserNode.getByteFrequencyData(this.frequencyData);
        }

        // Interruption detection: if MERY is speaking and user speaks firmly
        if (this.isAssistantSpeakingCheck && this.isAssistantSpeakingCheck()) {
          if (rms > 0.045) {
            this.interruptConsecutiveCount++;
            if (this.interruptConsecutiveCount >= 2) {
              console.log('[AudioStreamer] User voice detected while assistant speaking -> Instant Interruption triggered');
              this.onUserInterruptCallback?.();
              this.interruptConsecutiveCount = 0;
            }
          } else {
            this.interruptConsecutiveCount = 0;
          }
        } else {
          this.interruptConsecutiveCount = 0;
        }

        // Convert Float32Array [-1.0, 1.0] to 16-bit signed PCM little-endian
        const pcm16Base64 = this.floatTo16BitPCMBase64(inputData);
        if (pcm16Base64 && this.onAudioChunkCallback && this.currentSessionId === sessionId) {
          this.onAudioChunkCallback(pcm16Base64);
        }
      };

      // Connect pipeline
      this.sourceNode.connect(this.analyserNode);
      this.analyserNode.connect(this.processorNode);
      this.processorNode.connect(this.audioContext.destination);

      this.isRecording = true;
      return true;
    } catch (err: any) {
      if (this.currentSessionId === sessionId) {
        this.stop();
      }
      console.warn('[AudioStreamer] Microphone initialization notice:', err?.message || err);
      throw err;
    }
  }

  stop() {
    this.currentSessionId++;
    this.isRecording = false;
    this.currentVolume = 0;

    if (this.processorNode) {
      try {
        this.processorNode.onaudioprocess = null;
        this.processorNode.disconnect();
      } catch {}
      this.processorNode = null;
    }

    if (this.sourceNode) {
      try {
        this.sourceNode.disconnect();
      } catch {}
      this.sourceNode = null;
    }

    if (this.analyserNode) {
      try {
        this.analyserNode.disconnect();
      } catch {}
      this.analyserNode = null;
    }

    if (this.mediaStream) {
      try {
        this.mediaStream.getTracks().forEach((track) => {
          track.stop();
          track.enabled = false;
        });
      } catch {}
      this.mediaStream = null;
    }

    if (this.audioContext && this.audioContext.state !== 'closed') {
      try {
        this.audioContext.close();
      } catch {}
      this.audioContext = null;
    }
  }

  setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.mediaStream) {
      this.mediaStream.getAudioTracks().forEach((t) => {
        t.enabled = !muted;
      });
    }
  }

  getIsMuted(): boolean {
    return this.isMuted;
  }

  getVolume(): number {
    return this.currentVolume;
  }

  getFrequencyData(): Uint8Array {
    return this.frequencyData;
  }

  private floatTo16BitPCMBase64(input: Float32Array): string {
    const pcm16 = new Int16Array(input.length);
    for (let i = 0; i < input.length; i++) {
      const s = Math.max(-1, Math.min(1, input[i]));
      pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }

    // Convert Int16Array buffer to binary string
    const bytes = new Uint8Array(pcm16.buffer);
    let binary = '';
    const chunkSize = 8192;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode.apply(
        null,
        Array.from(bytes.subarray(i, i + chunkSize))
      );
    }
    return btoa(binary);
  }
}

export const audioStreamer = new AudioStreamer();
