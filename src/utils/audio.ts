// Audio playback and voice utility for MERY
import { humanConversationEngine } from '../modules/HumanConversationEngine';
import { TurnTakingAnalysis } from '../types';

export interface FullDuplexConfig {
  wakeWordEnabled: boolean;
  onInterimSpeech: (text: string) => void;
  onSpeechComplete: (text: string, analysis?: TurnTakingAnalysis) => void;
  onBargeIn: () => void;
  onWakeWordDetected: (wakeWord: string, remainingText: string) => void;
  onBackchannel?: (text: string) => void;
  onRecognitionStateChange?: (state: 'idle' | 'listening' | 'speaking') => void;
  onError?: (err: any) => void;
}

class VoiceService {
  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private currentSource: AudioBufferSourceNode | null = null;
  private isPlaying: boolean = false;
  private recognition: any = null;
  private isRecognizing: boolean = false;
  private isFullDuplexRunning = false;
  private fullDuplexConfig: FullDuplexConfig | null = null;
  private silenceTimer: any = null;
  private currentSpokenText = '';
  private restartTimeout: any = null;
  private isWokenUp = false;

  // SpeechSynthesis persistence and watchdog to prevent hanging states and Chrome GC bugs
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private speechWatchdogTimer: any = null;
  private speechHeartbeatTimer: any = null;
  private currentLanguage: string = (typeof window !== 'undefined' && localStorage.getItem('mery_spoken_language')) || 'gu-IN';

  public setLanguage(lang: string) {
    let normalized = lang;
    if (lang.startsWith('gu')) normalized = 'gu-IN';
    else if (lang.startsWith('hi')) normalized = 'hi-IN';
    else if (lang.startsWith('en')) normalized = 'en-IN';
    else if (lang === 'auto') normalized = 'gu-IN';

    this.currentLanguage = normalized;
    console.log('[LANGUAGE] active (voiceService):', normalized);
    if (this.recognition) {
      try {
        this.recognition.lang = normalized;
      } catch (e) {
        console.warn('Could not update recognition language immediately:', e);
      }
    }
  }

  public getLanguage(): string {
    return this.currentLanguage;
  }

  constructor() {
    // Warm up speech synthesis voices in browser
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        try {
          window.speechSynthesis.getVoices();
        } catch {}
      };
    }
  }

  private initAudioContext(): AudioContext {
    if (!this.audioCtx || this.audioCtx.state === 'closed') {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioCtx = new AudioContextClass();
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 64;
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  public getAnalyser(): AnalyserNode | null {
    return this.analyser;
  }

  // Soft futuristic auditory chime using Web Audio API
  public playAcousticChime(type: 'listen_start' | 'listen_stop' | 'mery_speaking' | 'wake_word' | 'interruption' | 'sync'): void {
    try {
      const ctx = this.initAudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;
      gain.gain.setValueAtTime(0.001, now);

      if (type === 'listen_start') {
        // Soft ascending two-tone chime (Aurora chime)
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.12);
        gain.gain.linearRampToValueAtTime(0.08, now + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);
        osc.start(now);
        osc.stop(now + 0.3);
      } else if (type === 'listen_stop') {
        // Gentle descending acknowledgment
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, now);
        osc.frequency.exponentialRampToValueAtTime(440, now + 0.12);
        gain.gain.linearRampToValueAtTime(0.06, now + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
        osc.start(now);
        osc.stop(now + 0.24);
      } else if (type === 'mery_speaking') {
        // Subtle soft rose-gold bell chime
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, now);
        osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.15);
        gain.gain.linearRampToValueAtTime(0.07, now + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
        osc.start(now);
        osc.stop(now + 0.36);
      } else if (type === 'wake_word') {
        // Three-tone harmonic recognition chime
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.setValueAtTime(659.25, now + 0.08); // E5
        osc.frequency.setValueAtTime(783.99, now + 0.16); // G5
        gain.gain.linearRampToValueAtTime(0.09, now + 0.08);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.38);
        osc.start(now);
        osc.stop(now + 0.4);
      } else if (type === 'interruption') {
        // Instant soft frequency drop acknowledging user taking over
        osc.type = 'sine';
        osc.frequency.setValueAtTime(620, now);
        osc.frequency.exponentialRampToValueAtTime(320, now + 0.1);
        gain.gain.linearRampToValueAtTime(0.05, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
        osc.start(now);
        osc.stop(now + 0.2);
      }
    } catch {
      // Audio context might be restricted before first click
    }
  }

  // Play Gemini 24kHz raw PCM or WAV base64
  public async playGeminiAudio(base64Data: string, sampleRate = 24000): Promise<void> {
    this.stopAudio();
    const ctx = this.initAudioContext();

    try {
      const binaryString = atob(base64Data);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Check if PCM 16-bit
      const int16Array = new Int16Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 2);
      const float32Array = new Float32Array(int16Array.length);
      for (let i = 0; i < int16Array.length; i++) {
        float32Array[i] = int16Array[i] / 32768.0;
      }

      const audioBuffer = ctx.createBuffer(1, float32Array.length, sampleRate);
      audioBuffer.copyToChannel(float32Array, 0);

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;

      if (this.analyser) {
        source.connect(this.analyser);
        this.analyser.connect(ctx.destination);
      } else {
        source.connect(ctx.destination);
      }

      this.currentSource = source;
      this.isPlaying = true;

      return new Promise((resolve) => {
        source.onended = () => {
          this.isPlaying = false;
          this.currentSource = null;
          resolve();
        };
        source.start(0);
      });
    } catch (e) {
      console.warn("Could not play Gemini raw audio, falling back to speech synthesis:", e);
      throw e;
    }
  }

  // Play standard encoded audio formats (MP3 / WAV from ElevenLabs / Cartesia)
  public async playEncodedAudio(base64Data: string): Promise<void> {
    this.stopAudio();
    const ctx = this.initAudioContext();

    try {
      const binaryString = atob(base64Data);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const decodedBuffer = await ctx.decodeAudioData(bytes.buffer);
      const source = ctx.createBufferSource();
      source.buffer = decodedBuffer;

      if (this.analyser) {
        source.connect(this.analyser);
        this.analyser.connect(ctx.destination);
      } else {
        source.connect(ctx.destination);
      }

      this.currentSource = source;
      this.isPlaying = true;

      return new Promise((resolve) => {
        source.onended = () => {
          this.isPlaying = false;
          this.currentSource = null;
          resolve();
        };
        source.start(0);
      });
    } catch (e) {
      console.warn("Could not decode encoded audio buffer, falling back to speech synthesis:", e);
      throw e;
    }
  }

  // Fallback / Instant natural humanoid browser speech synthesis
  public speakBrowserVoice(
    text: string,
    onStart?: () => void,
    onEnd?: () => void,
    vocalParams?: { pitch?: number; rate?: number }
  ): void {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      onEnd?.();
      return;
    }

    // Stop any previous speech synthesis and clear timers
    this.stopAudio();

    // Clean text of emotion tags, code blocks and markdown symbols
    const cleanText = text
      .replace(/\[emotion:\s*[^\]]+\]/gi, '')
      .replace(/[*_#`~]/g, '')
      .trim();

    if (!cleanText) {
      onEnd?.();
      return;
    }

    try {
      // Resume if browser queue is paused
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.pitch = vocalParams?.pitch ?? 1.05; // Warm, young adult female register
      utterance.rate = vocalParams?.rate ?? 0.94; // Human natural conversational pacing
      utterance.volume = 0.95;

      // Keep utterance reference alive on instance so Chromium GC doesn't abort speech prematurely
      this.currentUtterance = utterance;

      // 1. Determine requested language locale
      let requestedLang = this.currentLanguage || 'gu-IN';
      if (/[\u0A80-\u0AFF]/.test(cleanText)) {
        requestedLang = 'gu-IN';
      } else if (/[\u0900-\u097F]/.test(cleanText)) {
        requestedLang = 'hi-IN';
      }

      console.log('[VOICE] requested:', requestedLang);

      const voices = window.speechSynthesis.getVoices();
      let selectedVoice: SpeechSynthesisVoice | null = null;

      if (requestedLang === 'gu-IN' || requestedLang.startsWith('gu')) {
        utterance.lang = 'gu-IN';
        // Strict Gujarati matching: only voices whose language starts with 'gu' or name has 'gujarat'
        selectedVoice =
          voices.find(
            (v) =>
              v.lang.toLowerCase().startsWith('gu') ||
              v.lang.toLowerCase().includes('gujarat') ||
              v.name.toLowerCase().includes('gujarat')
          ) || null;

        if (selectedVoice) {
          utterance.voice = selectedVoice;
          utterance.lang = selectedVoice.lang || 'gu-IN';
          console.log('[VOICE] selected:', selectedVoice.name);
          console.log('[VOICE] locale:', selectedVoice.lang);
        } else {
          // STRICT: Do NOT assign any English, Hindi, or other voice!
          utterance.voice = null;
          utterance.lang = 'gu-IN';
          console.warn('[VOICE] Warning: No native Gujarati voice found in browser voices list. Using browser engine gu-IN locale synthesis without foreign voice fallback.');
          console.log('[VOICE] selected: none (browser native gu-IN)');
          console.log('[VOICE] locale: gu-IN');
        }
      } else if (requestedLang === 'hi-IN' || requestedLang.startsWith('hi')) {
        utterance.lang = 'hi-IN';
        // Strict Hindi matching: only voices whose language starts with 'hi' or name has 'hindi'
        selectedVoice =
          voices.find(
            (v) =>
              v.lang.toLowerCase().startsWith('hi') ||
              v.lang.toLowerCase().includes('hindi') ||
              v.name.toLowerCase().includes('hindi')
          ) || null;

        if (selectedVoice) {
          utterance.voice = selectedVoice;
          utterance.lang = selectedVoice.lang || 'hi-IN';
          console.log('[VOICE] selected:', selectedVoice.name);
          console.log('[VOICE] locale:', selectedVoice.lang);
        } else {
          // STRICT: Do NOT assign any English or other voice!
          utterance.voice = null;
          utterance.lang = 'hi-IN';
          console.warn('[VOICE] Warning: No native Hindi voice found in browser voices list. Using browser engine hi-IN locale synthesis without foreign voice fallback.');
          console.log('[VOICE] selected: none (browser native hi-IN)');
          console.log('[VOICE] locale: hi-IN');
        }
      } else {
        // English
        const enLocale = requestedLang.startsWith('en') ? requestedLang : 'en-IN';
        utterance.lang = enLocale;
        // Prefer en-IN Indian English or high quality English voice, but STRICTLY English (lang starts with 'en')
        selectedVoice =
          voices.find(
            (v) =>
              v.lang.toLowerCase().startsWith('en-in') ||
              (v.lang.toLowerCase().startsWith('en') && v.name.toLowerCase().includes('india'))
          ) ||
          voices.find(
            (v) =>
              (v.name.includes('Natural') ||
                v.name.includes('Google') ||
                v.name.includes('Samantha') ||
                v.name.includes('Victoria') ||
                v.name.includes('Karen') ||
                v.name.includes('Zira') ||
                v.name.includes('Female')) &&
              v.lang.toLowerCase().startsWith('en')
          ) ||
          voices.find((v) => v.lang.toLowerCase().startsWith('en')) ||
          null;

        if (selectedVoice) {
          utterance.voice = selectedVoice;
          utterance.lang = selectedVoice.lang || enLocale;
          console.log('[VOICE] selected:', selectedVoice.name);
          console.log('[VOICE] locale:', selectedVoice.lang);
        } else {
          utterance.voice = null;
          utterance.lang = enLocale;
          console.log('[VOICE] selected: none (browser default en-IN)');
          console.log('[VOICE] locale:', enLocale);
        }
      }

      let hasEnded = false;
      const cleanupAndEnd = () => {
        if (hasEnded) return;
        hasEnded = true;
        clearTimeout(this.speechWatchdogTimer);
        clearInterval(this.speechHeartbeatTimer);
        this.speechWatchdogTimer = null;
        this.speechHeartbeatTimer = null;
        this.currentUtterance = null;
        this.isPlaying = false;
        onEnd?.();
      };

      utterance.onstart = () => {
        this.isPlaying = true;
        onStart?.();

        // Chrome 15-second speech synthesis pause bug workaround
        clearInterval(this.speechHeartbeatTimer);
        this.speechHeartbeatTimer = setInterval(() => {
          if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
            window.speechSynthesis.pause();
            window.speechSynthesis.resume();
          }
        }, 10000);
      };

      utterance.onend = () => {
        cleanupAndEnd();
      };

      utterance.onerror = (event: any) => {
        // Interrupted/canceled occurs normally on barge-in
        if (event?.error !== 'interrupted' && event?.error !== 'canceled') {
          console.warn('SpeechSynthesis notice:', event?.error || 'error');
        }
        cleanupAndEnd();
      };

      // Watchdog timer: If browser never fires onend/onerror (browser bug or headless limit),
      // ensure we resolve and do not leave MERY hanging in 'speaking' or 'thinking'
      const estimatedDurationMs = Math.max(5000, (cleanText.length / 12) * 1000 + 4000);
      clearTimeout(this.speechWatchdogTimer);
      this.speechWatchdogTimer = setTimeout(() => {
        if (this.currentUtterance === utterance) {
          console.warn('SpeechSynthesis watchdog triggered safety completion');
          cleanupAndEnd();
        }
      }, estimatedDurationMs);

      window.speechSynthesis.speak(utterance);
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
    } catch (err) {
      console.warn('Speech synthesis initialization error:', err);
      this.isPlaying = false;
      this.currentUtterance = null;
      onEnd?.();
    }
  }

  public stopAudio(): void {
    clearTimeout(this.speechWatchdogTimer);
    clearInterval(this.speechHeartbeatTimer);
    this.speechWatchdogTimer = null;
    this.speechHeartbeatTimer = null;

    if (this.currentSource) {
      try {
        this.currentSource.onended = null;
        this.currentSource.stop();
        this.currentSource.disconnect();
      } catch {}
      this.currentSource = null;
    }

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      if (this.currentUtterance) {
        this.currentUtterance.onstart = null;
        this.currentUtterance.onend = null;
        this.currentUtterance.onerror = null;
        this.currentUtterance = null;
      }
      try {
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
        window.speechSynthesis.cancel();
      } catch {}
    }
    this.isPlaying = false;
  }

  // Complete cleanup: stops recognition, stops audio, and closes audioCtx
  public resetAllAudio(): void {
    this.stopFullDuplex();
    this.stopAudio();
    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      try {
        this.audioCtx.close();
      } catch {}
      this.audioCtx = null;
      this.analyser = null;
    }
  }

  public isCurrentlyPlaying(): boolean {
    return this.isPlaying;
  }

  // ==========================================
  // FULL-DUPLEX ALWAYS-READY VOICE ENGINE
  // ==========================================

  public startFullDuplex(config: FullDuplexConfig): boolean {
    const SpeechRecognitionClass =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionClass) {
      return false;
    }

    this.fullDuplexConfig = config;
    this.isFullDuplexRunning = true;
    this.currentSpokenText = '';
    this.isWokenUp = !config.wakeWordEnabled; // If wake word is off, immediately awake

    // Wire Human Conversation Engine decision & backchannel callbacks
    humanConversationEngine.setCallbacks(
      (analysis, fullText) => {
        if (!this.fullDuplexConfig || !this.isFullDuplexRunning) return;
        if (analysis.decisionMode === 'SILENT') {
          // Comfortable silence held
          console.log('[VoiceService] HumanConversationEngine held comfortable silence.');
          return;
        }
        if (analysis.decisionMode === 'BACKCHANNEL' && analysis.backchannelText) {
          this.fullDuplexConfig.onBackchannel?.(analysis.backchannelText);
          return;
        }
        this.playAcousticChime('listen_stop');
        this.fullDuplexConfig.onSpeechComplete(fullText, analysis);
      },
      (backchannelText) => {
        if (!this.fullDuplexConfig || !this.isFullDuplexRunning) return;
        this.fullDuplexConfig.onBackchannel?.(backchannelText);
      }
    );

    this.initAudioContext();
    return this.launchSpeechEngine();
  }

  public updateFullDuplexConfig(updates: Partial<FullDuplexConfig>): void {
    if (this.fullDuplexConfig) {
      this.fullDuplexConfig = { ...this.fullDuplexConfig, ...updates };
      if (updates.wakeWordEnabled !== undefined) {
        this.isWokenUp = !updates.wakeWordEnabled;
      }
    }
  }

  public setWokenUp(woken: boolean): void {
    this.isWokenUp = woken;
  }

  public getIsWokenUp(): boolean {
    return this.isWokenUp;
  }

  public isFullDuplexActive(): boolean {
    return this.isFullDuplexRunning;
  }

  private launchSpeechEngine(): boolean {
    const SpeechRecognitionClass =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionClass || !this.isFullDuplexRunning) {
      return false;
    }

    try {
      // Safely detach all listeners before aborting to prevent ghost onend callbacks from spawning duplicate instances
      if (this.recognition) {
        this.recognition.onstart = null;
        this.recognition.onend = null;
        this.recognition.onerror = null;
        this.recognition.onresult = null;
        this.recognition.onspeechstart = null;
        this.recognition.onspeechend = null;
        try {
          this.recognition.abort();
        } catch {}
        this.recognition = null;
      }

      const rec = new SpeechRecognitionClass();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = this.currentLanguage === 'auto' ? 'gu-IN' : (this.currentLanguage || 'gu-IN');

      rec.onstart = () => {
        this.isRecognizing = true;
        this.fullDuplexConfig?.onRecognitionStateChange?.('listening');
      };

      rec.onspeechstart = () => {
        // User started speaking! If MERY is talking, INTERRUPT IMMEDIATELY!
        if (this.isPlaying) {
          this.stopAudio();
          this.playAcousticChime('interruption');
          this.fullDuplexConfig?.onBargeIn();
          humanConversationEngine.handleBargeIn();
        }
      };

      rec.onresult = (event: any) => {
        // Double check barge-in interruption
        if (this.isPlaying) {
          this.stopAudio();
          this.playAcousticChime('interruption');
          this.fullDuplexConfig?.onBargeIn();
          humanConversationEngine.handleBargeIn();
        }

        let interim = '';
        let finalChunk = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const res = event.results[i];
          if (res.isFinal) {
            finalChunk += res[0].transcript + ' ';
          } else {
            interim += res[0].transcript;
          }
        }

        const candidateText = (this.currentSpokenText + ' ' + finalChunk + ' ' + interim)
          .replace(/\s+/g, ' ')
          .trim();

        if (!candidateText) return;

        // If Wake Word mode is active and not yet woken up, scan for wake word
        if (this.fullDuplexConfig?.wakeWordEnabled && !this.isWokenUp) {
          const wakeWordMatch = candidateText.match(/\b(hey\s+mery|hey\s+mary|hey\s+m4|mery|mary|m4)\b/i);
          if (wakeWordMatch) {
            this.isWokenUp = true;
            this.playAcousticChime('wake_word');

            const matchIndex = wakeWordMatch.index || 0;
            const wakePhrase = wakeWordMatch[0];
            const remaining = candidateText.slice(matchIndex + wakePhrase.length).replace(/^[,\s.!?-]+/, '').trim();

            this.fullDuplexConfig.onWakeWordDetected(wakePhrase, remaining);
            this.currentSpokenText = remaining;

            if (remaining) {
              humanConversationEngine.handleInterimSpeech(remaining);
            }
            return;
          } else {
            // Passive listening: ignore background chatter until wake word spoken
            return;
          }
        }

        // Live spoken transcript update
        this.fullDuplexConfig?.onInterimSpeech(candidateText);

        if (finalChunk.trim()) {
          this.currentSpokenText = (this.currentSpokenText + ' ' + finalChunk).replace(/\s+/g, ' ').trim();
        }

        // Pass candidate text to HumanConversationEngine for smart turn-taking,
        // dynamic end-of-speech detection, backchanneling, and response decisions
        humanConversationEngine.handleInterimSpeech(candidateText);
      };

      rec.onerror = (event: any) => {
        const error = event.error;

        // Fatal permission denial - stop engine cleanly to avoid infinite error loop
        if (error === 'not-allowed' || error === 'service-not-allowed') {
          console.warn('Speech recognition permission denied:', error);
          this.isFullDuplexRunning = false;
          this.isRecognizing = false;
          this.fullDuplexConfig?.onError?.(error);
          return;
        }

        // no-speech happens on natural silence. Commit unfinalized words if present
        if (error === 'no-speech') {
          if (this.currentSpokenText.trim().length > 0) {
            this.commitSpokenSpeech();
          }
          return;
        }

        if (error === 'aborted') {
          return;
        }

        console.warn('Speech recognition notice:', error);
        this.fullDuplexConfig?.onError?.(error);
      };

      rec.onend = () => {
        this.isRecognizing = false;

        // If speech was pending in buffer when onend was triggered by silence, commit now
        if (this.currentSpokenText.trim().length > 0) {
          this.commitSpokenSpeech();
        }

        // Automatically resurrect listening so MERY stays ready
        if (this.isFullDuplexRunning) {
          clearTimeout(this.restartTimeout);
          this.restartTimeout = setTimeout(() => {
            if (this.isFullDuplexRunning) {
              this.launchSpeechEngine();
            }
          }, 200);
        } else {
          this.fullDuplexConfig?.onRecognitionStateChange?.('idle');
        }
      };

      this.recognition = rec;
      rec.start();
      return true;
    } catch (err: any) {
      console.warn('Could not launch speech engine:', err?.message || err);
      this.isRecognizing = false;
      // Reschedule retry after transient startup failure
      if (this.isFullDuplexRunning) {
        clearTimeout(this.restartTimeout);
        this.restartTimeout = setTimeout(() => {
          if (this.isFullDuplexRunning) {
            this.launchSpeechEngine();
          }
        }, 400);
      }
      return false;
    }
  }

  private resetSilenceTimer(): void {
    clearTimeout(this.silenceTimer);
    this.silenceTimer = setTimeout(() => {
      this.commitSpokenSpeech();
    }, 950);
  }

  private commitSpokenSpeech(): void {
    clearTimeout(this.silenceTimer);
    const textToCommit = this.currentSpokenText.trim();
    this.currentSpokenText = '';

    if (textToCommit.length > 0 && this.fullDuplexConfig) {
      this.playAcousticChime('listen_stop');
      this.fullDuplexConfig.onSpeechComplete(textToCommit);
    }
  }

  public stopFullDuplex(): void {
    this.isFullDuplexRunning = false;
    this.isRecognizing = false;
    clearTimeout(this.silenceTimer);
    clearTimeout(this.restartTimeout);
    humanConversationEngine.resetSession();
    this.currentSpokenText = '';
    this.stopAudio();

    if (this.recognition) {
      this.recognition.onstart = null;
      this.recognition.onend = null;
      this.recognition.onerror = null;
      this.recognition.onresult = null;
      this.recognition.onspeechstart = null;
      this.recognition.onspeechend = null;
      try {
        this.recognition.abort();
      } catch {}
      this.recognition = null;
    }
  }

  // Legacy compatibility helpers
  public startSpeechRecognition(
    onResult: (transcript: string, isFinal: boolean) => void,
    onError: (err: any) => void,
    onEnd: () => void
  ): boolean {
    return this.startFullDuplex({
      wakeWordEnabled: false,
      onInterimSpeech: (t) => onResult(t, false),
      onSpeechComplete: (t) => onResult(t, true),
      onBargeIn: () => this.stopAudio(),
      onWakeWordDetected: () => {},
      onError,
    });
  }

  public stopSpeechRecognition(): void {
    this.stopFullDuplex();
  }
}

export const voiceService = new VoiceService();
