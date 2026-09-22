// Audio playback and voice utility for MERY
import { humanConversationEngine } from '../modules/HumanConversationEngine';
import { TurnTakingAnalysis } from '../types';

/**
 * Phonetically translates Gujarati Unicode characters (U+0A81 - U+0AF9)
 * into Devanagari script (U+0901 - U+0979) via constant offset 0x0180 (384).
 * This enables high-fidelity native Indian Hindi female voices (e.g. Swara, Google हिन्दी)
 * to pronounce Gujarati speech with authentic Indic phonetics without skipping or dropping words.
 */
export function convertGujaratiToDevanagari(text: string): string {
  let res = '';
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code >= 0x0A81 && code <= 0x0AF9) {
      res += String.fromCharCode(code - 0x0180);
    } else {
      res += text[i];
    }
  }
  return res;
}

const GUJARATI_CHAR_MAP: Record<string, string> = {
  '\u0A85': 'a', '\u0A86': 'aa', '\u0A87': 'i', '\u0A88': 'ee', '\u0A89': 'u', '\u0A8A': 'oo',
  '\u0A8F': 'e', '\u0A90': 'ai', '\u0A93': 'o', '\u0A94': 'au',
  '\u0A95': 'k', '\u0A96': 'kh', '\u0A97': 'g', '\u0A98': 'gh',
  '\u0A9A': 'ch', '\u0A9B': 'chh', '\u0A9C': 'j', '\u0A9D': 'jh',
  '\u0A9E': 'ny', '\u0A9F': 't', '\u0AA0': 'th', '\u0AA1': 'd', '\u0AA2': 'dh', '\u0AA3': 'n',
  '\u0AA4': 't', '\u0AA5': 'th', '\u0AA6': 'd', '\u0AA7': 'dh', '\u0AA8': 'n',
  '\u0AAA': 'p', '\u0AAB': 'f', '\u0AAC': 'b', '\u0AAD': 'bh', '\u0AAE': 'm',
  '\u0AAF': 'y', '\u0AB0': 'r', '\u0AB2': 'l', '\u0AB3': 'l', '\u0AB5': 'v',
  '\u0AB6': 'sh', '\u0AB7': 'sh', '\u0AB8': 's', '\u0AB9': 'h',
  '\u0ABE': 'aa', '\u0ABF': 'i', '\u0AC0': 'ee', '\u0AC1': 'u', '\u0AC2': 'oo',
  '\u0AC7': 'e', '\u0AC8': 'ai', '\u0ACB': 'o', '\u0ACC': 'au',
  '\u0A82': 'n', '\u0A83': 'h', '\u0ACD': '',
};

const GUJARATI_WORD_OVERRIDES: Record<string, string> = {
  'હું': 'Hun',
  'છું': 'chhun',
  'છે': 'chhe',
  'મેરી': 'Mery',
  'સિસ્ટમ': 'system',
  'ઓનલાઇન': 'online',
  'અને': 'ane',
  'સાંભળી': 'sambhadi',
  'રહી': 'rahi',
  'આજે': 'aaje',
  'આપણો': 'aapno',
  'શું': 'shun',
  'પ્લાન': 'plan',
  'કેમ': 'kem',
  'છો': 'chho',
  'વાત': 'vaat',
  'કરવી': 'karvi',
  'બોલો': 'bolo',
  'કોઈ': 'koi',
  'વાંધો': 'vandho',
  'નહીં': 'nahin',
  'મજામાં': 'majama',
  'તમે': 'tame',
  'મારે': 'mare',
  'કાઠિયાવાડી': 'Kathiyawadi',
  'ગુજરાતી': 'Gujarati',
  'સમજી': 'samji',
  'હા': 'ha',
  'ના': 'na',
};

/**
 * Fallback phonetic transliteration for platforms with ONLY English female voices
 * (e.g. standard macOS/iOS without Indic voice pack installed).
 * Prevents silence or garbled glyph errors and guarantees crisp verbal articulation.
 */
export function transliterateGujaratiToGujlish(text: string): string {
  let processed = text;
  for (const [w, repl] of Object.entries(GUJARATI_WORD_OVERRIDES)) {
    processed = processed.split(w).join(repl);
  }

  let res = '';
  for (let i = 0; i < processed.length; i++) {
    const ch = processed[i];
    if (GUJARATI_CHAR_MAP[ch] !== undefined) {
      res += GUJARATI_CHAR_MAP[ch];
      const isConsonant = ch >= '\u0A95' && ch <= '\u0AB9';
      const nextCh = processed[i + 1];
      const nextIsMatraOrVirama = nextCh >= '\u0ABE' && nextCh <= '\u0ACD';
      if (isConsonant && !nextIsMatraOrVirama && nextCh && nextCh !== ' ' && nextCh >= '\u0A80' && nextCh <= '\u0AFF') {
        res += 'a';
      }
    } else {
      res += ch;
    }
  }
  return res;
}

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

// --- Voice quality filters (module-level so they're defined once, not re-created per call) ---

// Absolute male identification filter: reject masculine voices
function isMaleVoice(v: SpeechSynthesisVoice): boolean {
  const s = `${v.name} ${v.voiceURI} ${v.lang}`.toLowerCase();
  return (
    /\b(male|man|boy|david|george|mark|ravi|hemant|niranjan|madhav|guy|stefan|daniel|oliver|richard|james|brian|russell|michael|paul|tom|alex|fred|shah|neil|alok|ajay|kunal|rahul|sean|pradeep|tarun|microsoft david|microsoft mark|microsoft ravi)\b/i.test(s) ||
    s.includes('(male)') ||
    s.includes('- male') ||
    s.includes(' male ')
  );
}

// Robotic voice filter: reject mechanical, low-quality synthesizers
function isRoboticVoice(v: SpeechSynthesisVoice): boolean {
  const s = `${v.name} ${v.voiceURI}`.toLowerCase();
  return /\b(espeak|desktop|zira|speech-dispatcher|synthesizer|robot|festival|mbrola|klatt)\b/i.test(s);
}

// Absolute female identification filter: prioritize feminine voices
function isFemaleVoice(v: SpeechSynthesisVoice): boolean {
  const s = `${v.name} ${v.voiceURI} ${v.lang}`.toLowerCase();
  return (
    !isMaleVoice(v) &&
    (/\b(female|woman|girl|dhwani|swara|kalpana|diti|geeta|shruti|kavya|vaani|leela|ananya|neerja|heera|priya|sunita|samantha|karen|victoria|fiona|moira|tessa|veena|jenny|aria|ava|emma|sonia|natural|online)\b/i.test(s) ||
    s.includes('(female)') ||
    s.includes('- female') ||
    s.includes(' female '))
  );
}

// Quality scoring: prioritize modern Natural, Online, Neural, Google, Apple Enhanced female voices
function scoreVoice(v: SpeechSynthesisVoice): number {
  const s = `${v.name} ${v.voiceURI}`.toLowerCase();
  let score = 0;
  if (isRoboticVoice(v)) score -= 150;
  if (isMaleVoice(v)) score -= 200;
  if (isFemaleVoice(v)) score += 50;
  if (s.includes('natural')) score += 60;
  if (s.includes('online')) score += 45;
  if (s.includes('neural')) score += 40;
  if (s.includes('google')) score += 35;
  if (s.includes('enhanced')) score += 30;
  if (s.includes('premium')) score += 30;
  if (s.includes('siri')) score += 25;
  return score;
}

class VoiceService {
  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private currentSource: AudioBufferSourceNode | null = null;
  private isPlaying: boolean = false;
  private onPlaybackEndCallback: (() => void) | null = null;
  private recognition: any = null;
  private isRecognizing: boolean = false;
  private isFullDuplexRunning = false;
  private fullDuplexConfig: FullDuplexConfig | null = null;
  private silenceTimer: any = null;
  private currentSpokenText = '';
  private restartTimeout: any = null;
  private isWokenUp = false;
  private micStream: MediaStream | null = null;
  private lastSpokenText: string = '';

  // Proactively check and request microphone permission via getUserMedia
  // This triggers the browser prompt if needed and enables echo cancellation/noise suppression
  public async ensureMicrophonePermission(): Promise<{ granted: boolean; error?: string }> {
    if (typeof window === 'undefined') return { granted: false, error: 'no-window' };

    const SpeechRecognitionClass =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionClass) {
      return { granted: false, error: 'speech-recognition-unsupported' };
    }

    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        if (!this.micStream || !this.micStream.active) {
          this.micStream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            },
          });
        }
        // Connect to analyser for realtime audio waveforms if audio context is active
        if (this.audioCtx && this.analyser && this.micStream) {
          try {
            const source = this.audioCtx.createMediaStreamSource(this.micStream);
            source.connect(this.analyser);
          } catch {}
        }
        return { granted: true };
      } catch (err: any) {
        console.warn('[VoiceService] Microphone access check notice:', err?.name, err?.message);
        if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
          return { granted: false, error: 'not-allowed' };
        }
        // Return granted so SpeechRecognition can attempt connection on hardware-specific states
        return { granted: true };
      }
    }
    return { granted: true };
  }

  // SpeechSynthesis persistence and watchdog to prevent hanging states and Chrome GC bugs
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private speechWatchdogTimer: any = null;
  private speechHeartbeatTimer: any = null;
  private currentLanguage: string = (typeof window !== 'undefined' && localStorage.getItem('mery_spoken_language')) || 'gu-IN';

  // The ONE voice MERY speaks with for the entire session, regardless of language.
  // undefined = not yet resolved (voices list may still be loading); null = resolved, none found.
  private pinnedVoice: SpeechSynthesisVoice | null | undefined = undefined;
  // Becomes true the first moment real speech actually plays - before that,
  // the pinned choice stays open to being refined as more voices load in.
  private voiceSelectionFinalized: boolean = false;

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

  public getAvailableVoicesRanked(): SpeechSynthesisVoice[] {
    if (typeof window === 'undefined' || !window.speechSynthesis) return [];
    const voices = window.speechSynthesis.getVoices();
    return voices
      .filter((v) => !isRoboticVoice(v))
      .filter((v) => {
        const lang = v.lang.toLowerCase();
        const name = v.name.toLowerCase();
        return (
          lang.startsWith('gu') ||
          lang.startsWith('hi') ||
          lang.startsWith('en') ||
          name.includes('gujarat') ||
          name.includes('hindi')
        );
      })
      .sort((a, b) => scoreVoice(b) - scoreVoice(a));
  }

  public previewVoice(voice: SpeechSynthesisVoice): void {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const lang = voice.lang.toLowerCase();
    const sample = lang.startsWith('gu')
      ? 'નમસ્તે, હું મેરી છું.'
      : lang.startsWith('hi')
      ? 'नमस्ते, मैं मेरी हूँ।'
      : "Hi, I'm Mery.";
    const utt = new SpeechSynthesisUtterance(sample);
    utt.voice = voice;
    utt.lang = voice.lang;
    utt.pitch = 1.0;
    utt.rate = 1.0;
    window.speechSynthesis.speak(utt);
  }

  public getSelectedVoiceURI(): string | null {
    try {
      return typeof window !== 'undefined' ? localStorage.getItem('mery_selected_voice_uri') : null;
    } catch {
      return null;
    }
  }

  public selectVoice(voice: SpeechSynthesisVoice): void {
    this.pinnedVoice = voice;
    try {
      localStorage.setItem('mery_selected_voice_uri', voice.voiceURI);
    } catch {}
  }

  private getPinnedVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
    // Once real speech has actually started, keep using that exact voice for
    // the rest of the session - don't let it change mid-conversation.
    if (this.voiceSelectionFinalized && this.pinnedVoice !== undefined) return this.pinnedVoice;
    if (!voices || voices.length === 0) return this.pinnedVoice ?? null;

    // Respect a voice the user manually picked in the Voice Selection UI
    try {
      const savedURI = typeof window !== 'undefined' ? localStorage.getItem('mery_selected_voice_uri') : null;
      if (savedURI) {
        const saved = voices.find((v) => v.voiceURI === savedURI);
        if (saved) {
          this.pinnedVoice = saved;
          return saved;
        }
      }
    } catch {}

    const gujaratiVoices = voices
      .filter(
        (v) =>
          (v.lang.toLowerCase().startsWith('gu') ||
            v.lang.toLowerCase().includes('gujarat') ||
            v.name.toLowerCase().includes('gujarat')) &&
          !isMaleVoice(v) &&
          !isRoboticVoice(v)
      )
      .sort((a, b) => scoreVoice(b) - scoreVoice(a));

    const hindiVoices = voices
      .filter(
        (v) =>
          (v.lang.toLowerCase().startsWith('hi') || v.name.toLowerCase().includes('hindi')) &&
          !isMaleVoice(v) &&
          !isRoboticVoice(v)
      )
      .sort((a, b) => scoreVoice(b) - scoreVoice(a));

    const englishVoices = voices
      .filter((v) => v.lang.toLowerCase().startsWith('en') && !isMaleVoice(v) && !isRoboticVoice(v) && isFemaleVoice(v))
      .sort((a, b) => scoreVoice(b) - scoreVoice(a));

    const chosen =
      gujaratiVoices.find(isFemaleVoice) ||
      gujaratiVoices[0] ||
      hindiVoices.find(isFemaleVoice) ||
      hindiVoices[0] ||
      englishVoices[0] ||
      voices[0] ||
      null;

    this.pinnedVoice = chosen;
    return chosen;
  }

  constructor() {
    // Warm up speech synthesis voices AND keep refining the pinned voice as
    // better voice batches arrive (Android/some browsers expose voices in
    // stages - a small basic set first, then a fuller/better set moments
    // later). We deliberately do NOT lock the choice here: locking too early
    // can pin onto an inferior voice from the first, incomplete batch. The
    // choice only gets locked once real speech actually starts (see
    // voiceSelectionFinalized in speakBrowserVoice), so by the time the user
    // is actually talking to MERY, the pinned voice reflects the full,
    // final list.
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const refreshPinnedVoice = () => {
        try {
          const v = window.speechSynthesis.getVoices();
          if (v.length > 0 && !this.voiceSelectionFinalized) {
            this.getPinnedVoice(v);
          }
        } catch {}
      };
      refreshPinnedVoice();
      window.speechSynthesis.addEventListener('voiceschanged', refreshPinnedVoice);
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

  public setOnPlaybackEndCallback(callback: (() => void) | null): void {
    this.onPlaybackEndCallback = callback;
  }

  // Closes mic when Mery starts speaking to prevent audio overlap, feedback, and Bluetooth duplex issues
  public onPlaybackStart(): void {
    this.isPlaying = true;
    clearTimeout(this.restartTimeout);
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {}
    }
    this.isRecognizing = false;
  }

  // Triggered when Mery finishes speaking: fires onPlaybackEndCallback and restarts speech engine after ~300ms
  public onPlaybackEnd(): void {
    this.isPlaying = false;
    try {
      this.onPlaybackEndCallback?.();
    } catch (e) {
      console.warn('[VoiceService] onPlaybackEndCallback notice:', e);
    }

    if (this.isFullDuplexRunning) {
      clearTimeout(this.restartTimeout);
      this.restartTimeout = setTimeout(() => {
        if (this.isFullDuplexRunning && !this.isPlaying) {
          this.launchSpeechEngine();
        }
      }, 300);
    }
  }

  public setPlaying(playing: boolean): void {
    if (playing) {
      this.onPlaybackStart();
    } else {
      this.onPlaybackEnd();
    }
  }

  public notifyPlaybackEnded(): void {
    this.onPlaybackEnd();
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
      this.onPlaybackStart();

      return new Promise((resolve) => {
        source.onended = () => {
          this.currentSource = null;
          this.onPlaybackEnd();
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
      this.onPlaybackStart();

      return new Promise((resolve) => {
        source.onended = () => {
          this.currentSource = null;
          this.onPlaybackEnd();
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

    // Clean text of emotion tags, code blocks, URLs, markdown symbols, and emojis for smooth, human speech
    let cleanText = text
      .replace(/\[emotion:\s*[^\]]+\]/gi, '')
      .replace(/```[\s\S]*?```/g, '')
      .replace(/`[^`]*`/g, '')
      .replace(/https?:\/\/\S+/g, '')
      .replace(/[*_#~>|\\{}[\]()]/g, '')
      .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
      .replace(/\s+/g, ' ')
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

      const voices = window.speechSynthesis.getVoices();
      const pinnedVoice = this.getPinnedVoice(voices);
      // Real speech is about to play - lock this exact voice for the rest of
      // the session so it can no longer drift, even if more voiceschanged
      // events fire later.
      this.voiceSelectionFinalized = true;
      const pinnedLang = (pinnedVoice?.lang || this.currentLanguage || 'gu-IN').toLowerCase();

      const hasGujarati = /[\u0A80-\u0AFF]/.test(cleanText);
      if (hasGujarati && !pinnedLang.startsWith('gu')) {
        cleanText = pinnedLang.startsWith('hi')
          ? convertGujaratiToDevanagari(cleanText)
          : transliterateGujaratiToGujlish(cleanText);
      }

      const utterance = new SpeechSynthesisUtterance(cleanText);
      const targetPitch = vocalParams?.pitch ?? 1.0;
      utterance.pitch = Math.min(1.04, Math.max(0.96, targetPitch));
      const targetRate = vocalParams?.rate ?? 1.0;
      utterance.rate = Math.min(1.08, Math.max(0.92, targetRate));
      utterance.volume = 1.0;

      this.currentUtterance = utterance;

      utterance.voice = pinnedVoice;
      utterance.lang = pinnedVoice?.lang || 'gu-IN';

      let hasEnded = false;
      const cleanupAndEnd = () => {
        if (hasEnded) return;
        hasEnded = true;
        clearTimeout(this.speechWatchdogTimer);
        clearInterval(this.speechHeartbeatTimer);
        this.speechWatchdogTimer = null;
        this.speechHeartbeatTimer = null;
        this.currentUtterance = null;
        this.lastSpokenText = '';
        // Clear current spoken text so any ambient noise or speaker echo does not bleed into next turn
        this.currentSpokenText = '';
        this.onPlaybackEnd();
        onEnd?.();
      };

      utterance.onstart = () => {
        this.onPlaybackStart();
        this.lastSpokenText = cleanText.toLowerCase();
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
      this.currentUtterance = null;
      this.onPlaybackEnd();
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
    if (this.isPlaying) {
      this.onPlaybackEnd();
    }
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

    this.fullDuplexConfig = { ...config, wakeWordEnabled: false };
    this.isFullDuplexRunning = true;
    this.currentSpokenText = '';
    this.isWokenUp = true; // Permanently awake - directly responds to all user speech

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
        // Critical: Clear spoken text buffer BEFORE onSpeechComplete so rec.onend cannot double-commit!
        this.currentSpokenText = '';
        this.playAcousticChime('listen_stop');
        this.restartRecognitionForNextTurn();
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

  // Gracefully restart recognition for the next utterance so event.results buffer starts clean
  private restartRecognitionForNextTurn(): void {
    if (this.recognition) {
      try {
        this.recognition.onstart = null;
        this.recognition.onend = null;
        this.recognition.onerror = null;
        this.recognition.onresult = null;
        this.recognition.onspeechstart = null;
        this.recognition.onspeechend = null;
        this.recognition.abort();
      } catch {}
      this.recognition = null;
    }
    this.isRecognizing = false;
    if (this.isFullDuplexRunning) {
      clearTimeout(this.restartTimeout);
      this.restartTimeout = setTimeout(() => {
        if (this.isFullDuplexRunning) {
          this.launchSpeechEngine();
        }
      }, 350);
    }
  }

  public updateFullDuplexConfig(updates: Partial<FullDuplexConfig>): void {
    if (this.fullDuplexConfig) {
      this.fullDuplexConfig = { ...this.fullDuplexConfig, ...updates, wakeWordEnabled: false };
      this.isWokenUp = true;
    }
  }

  public setWokenUp(_woken: boolean): void {
    this.isWokenUp = true;
  }

  public getIsWokenUp(): boolean {
    return this.isWokenUp;
  }

  public isFullDuplexActive(): boolean {
    return this.isFullDuplexRunning;
  }

  public isSpeaking(): boolean {
    return this.isPlaying;
  }

  private launchSpeechEngine(): boolean {
    const SpeechRecognitionClass =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionClass || !this.isFullDuplexRunning) {
      return false;
    }

    // If Mery is currently speaking, do not open mic or start recognition
    if (this.isPlaying) {
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
        if (this.isPlaying) {
          try {
            rec.stop();
          } catch {}
          this.isRecognizing = false;
          return;
        }
        this.isRecognizing = true;
        this.fullDuplexConfig?.onRecognitionStateChange?.('listening');
      };

      rec.onspeechstart = () => {
        if (this.isPlaying) {
          try {
            rec.stop();
          } catch {}
          this.isRecognizing = false;
          return;
        }
        this.fullDuplexConfig?.onRecognitionStateChange?.('listening');
      };

      rec.onresult = (event: any) => {
        // If Mery is speaking, do not just filter text - actually stop recognition to close the mic
        if (this.isPlaying) {
          try {
            rec.stop();
          } catch {}
          this.isRecognizing = false;
          return;
        }

        // Collect full transcript from all segments in current session
        let finalTranscripts = '';
        let interimTranscripts = '';

        for (let i = 0; i < event.results.length; ++i) {
          const res = event.results[i];
          if (res.isFinal) {
            finalTranscripts += res[0].transcript + ' ';
          } else {
            interimTranscripts += res[0].transcript;
          }
        }

        const candidateText = (finalTranscripts + interimTranscripts)
          .replace(/\s+/g, ' ')
          .trim();

        if (!candidateText) return;

        // If Wake Word mode is active and not yet woken up, scan for wake word
        if (this.fullDuplexConfig?.wakeWordEnabled && !this.isWokenUp) {
          const wakeWordMatch = candidateText.match(/\b(hey\s+mery|hey\s+mary|mery|mary)\b|(મેરી|હેય\s*મેરી|મારી|એલા\s*મેરી)/i);
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

        this.currentSpokenText = candidateText;

        // Live spoken transcript update for UI
        this.fullDuplexConfig?.onInterimSpeech(candidateText);

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

        // Handle language not supported (e.g. gu-IN missing on some systems) with graceful fallback
        if (error === 'language-not-supported') {
          console.warn('Language not supported by SpeechRecognition:', rec.lang);
          if (rec.lang === 'gu-IN') {
            this.currentLanguage = 'hi-IN';
          } else {
            this.currentLanguage = 'en-IN';
          }
          if (this.isFullDuplexRunning && !this.isPlaying) {
            clearTimeout(this.restartTimeout);
            this.restartTimeout = setTimeout(() => {
              if (this.isFullDuplexRunning && !this.isPlaying) {
                this.launchSpeechEngine();
              }
            }, 300);
          }
          return;
        }

        if (error === 'no-speech' || error === 'aborted') {
          return;
        }

        if (error === 'audio-capture') {
          console.warn('No microphone found or audio capture error.');
          this.fullDuplexConfig?.onError?.(error);
          return;
        }

        console.warn('Speech recognition advisory:', error);
        this.fullDuplexConfig?.onError?.(error);
      };

      rec.onend = () => {
        this.isRecognizing = false;

        // If Mery is currently speaking, do not resurrect recognition;
        // onPlaybackEnd will restart it ~300ms after playback completes
        if (this.isPlaying) {
          return;
        }

        // If speech was pending in buffer when onend was triggered by silence and turn was not yet dispatched, commit now
        if (this.currentSpokenText.trim().length > 0) {
          const textToCommit = this.currentSpokenText.trim();
          this.currentSpokenText = '';
          humanConversationEngine.resetSession();
          this.playAcousticChime('listen_stop');
          this.fullDuplexConfig?.onSpeechComplete(textToCommit);
        }

        // Automatically resurrect listening so MERY stays ready
        if (this.isFullDuplexRunning) {
          clearTimeout(this.restartTimeout);
          this.restartTimeout = setTimeout(() => {
            if (this.isFullDuplexRunning && !this.isPlaying) {
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
      if (this.isFullDuplexRunning && !this.isPlaying) {
        clearTimeout(this.restartTimeout);
        this.restartTimeout = setTimeout(() => {
          if (this.isFullDuplexRunning && !this.isPlaying) {
            this.launchSpeechEngine();
          }
        }, 400);
      }
      return false;
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

    if (this.micStream) {
      try {
        this.micStream.getTracks().forEach((track) => track.stop());
      } catch {}
      this.micStream = null;
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