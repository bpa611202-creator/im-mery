import { VoiceModulationConfig } from '../types';
import { stateManager } from './StateManager';

export interface TTSOptions {
  voiceId?: string;
  speed?: number;
  pitch?: number;
  stability?: number;
  similarityBoost?: number;
  style?: number;
  apiKey?: string;
  voiceModulation?: VoiceModulationConfig;
}

export interface TTSResult {
  audioBase64?: string;
  isDirectAudio?: boolean; // If true, played via native speech synthesis
  durationMs?: number;
}

export interface ITTSProvider {
  id: string;
  name: string;
  isConfigured(): boolean;
  synthesize(text: string, options?: TTSOptions): Promise<TTSResult>;
}

export class ElevenLabsProvider implements ITTSProvider {
  id = 'elevenlabs';
  name = 'ElevenLabs Conversational Neural';

  isConfigured(): boolean {
    const key = localStorage.getItem('mery_key_elevenlabs') || '';
    return key.trim().length > 0;
  }

  async synthesize(text: string, options?: TTSOptions): Promise<TTSResult> {
    const apiKey = options?.apiKey || localStorage.getItem('mery_key_elevenlabs') || '';
    const voiceId = options?.voiceId || localStorage.getItem('mery_voice_elevenlabs') || '21m00Tcm4TlvDq8ikWAM';

    // Provider-specific mapping from abstract VoiceModulationConfig
    const mod = options?.voiceModulation;
    const stability = mod ? mod.stability : (options?.stability ?? 0.65);
    const similarityBoost = mod ? mod.similarityBoost : (options?.similarityBoost ?? 0.80);
    const style = mod ? mod.style : (options?.style ?? 0.20);
    const speed = mod ? mod.rate : (options?.speed ?? 1.0);

    const res = await fetch('/api/tts/elevenlabs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        voiceId,
        apiKey,
        stability,
        similarityBoost,
        style,
        speed,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.message || 'ElevenLabs synthesis failed');
    }

    return {
      audioBase64: data.audioBase64,
    };
  }
}

export class CartesiaProvider implements ITTSProvider {
  id = 'cartesia';
  name = 'Cartesia Sonic Ultra-Low Latency';

  isConfigured(): boolean {
    const key = localStorage.getItem('mery_key_cartesia') || '';
    return key.trim().length > 0;
  }

  async synthesize(text: string, options?: TTSOptions): Promise<TTSResult> {
    const apiKey = options?.apiKey || localStorage.getItem('mery_key_cartesia') || '';
    const voiceId = options?.voiceId || 'a0e998e3-18a4-4bd6-8347-cc3907f3213c';

    const mod = options?.voiceModulation;
    const speed = mod ? mod.rate : (options?.speed ?? 1.0);
    const deliveryTone = mod?.deliveryTone || 'neutral';

    const res = await fetch('/api/tts/cartesia', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        voiceId,
        apiKey,
        speed,
        deliveryTone,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.message || 'Cartesia synthesis failed');
    }

    return {
      audioBase64: data.audioBase64,
    };
  }
}

export class LocalTTSProvider implements ITTSProvider {
  id = 'local_tts';
  name = 'Browser Native Humanoid Voice';

  isConfigured(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
  }

  async synthesize(text: string, options?: TTSOptions): Promise<TTSResult> {
    if (!('speechSynthesis' in window)) {
      throw new Error('Web Speech API not available');
    }

    const mod = options?.voiceModulation;
    const pitch = mod ? mod.pitch : (options?.pitch ?? 1.04);
    const rate = mod ? mod.rate : (options?.speed ?? 0.98);
    const volume = mod ? mod.volume : 1.0;

    return new Promise((resolve, reject) => {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.pitch = pitch;
      utterance.rate = rate;
      utterance.volume = volume;

      const voices = window.speechSynthesis.getVoices();
      const activeLang = stateManager.getLanguage() || 'gu-IN';
      let targetLang = activeLang;
      if (/[\u0A80-\u0AFF]/.test(text)) {
        targetLang = 'gu-IN';
      } else if (/[\u0900-\u097F]/.test(text)) {
        targetLang = 'hi-IN';
      }

      console.log('[VOICE] requested (TTSProvider):', targetLang);

      if (targetLang === 'gu-IN' || targetLang.startsWith('gu')) {
        utterance.lang = 'gu-IN';
        const gujaratiVoice = voices.find(
          (v) =>
            v.lang.toLowerCase().startsWith('gu') ||
            v.lang.toLowerCase().includes('gujarat') ||
            v.name.toLowerCase().includes('gujarat')
        ) || null;

        if (gujaratiVoice) {
          utterance.voice = gujaratiVoice;
          utterance.lang = gujaratiVoice.lang || 'gu-IN';
        } else {
          utterance.voice = null;
          utterance.lang = 'gu-IN';
          console.warn('[VOICE] No Gujarati voice found. Using browser default gu-IN synthesis without foreign fallback.');
        }
      } else if (targetLang === 'hi-IN' || targetLang.startsWith('hi')) {
        utterance.lang = 'hi-IN';
        const hindiVoice = voices.find(
          (v) =>
            v.lang.toLowerCase().startsWith('hi') ||
            v.lang.toLowerCase().includes('hindi') ||
            v.name.toLowerCase().includes('hindi')
        ) || null;

        if (hindiVoice) {
          utterance.voice = hindiVoice;
          utterance.lang = hindiVoice.lang || 'hi-IN';
        } else {
          utterance.voice = null;
          utterance.lang = 'hi-IN';
          console.warn('[VOICE] No Hindi voice found. Using browser default hi-IN synthesis without foreign fallback.');
        }
      } else {
        const enLocale = targetLang.startsWith('en') ? targetLang : 'en-IN';
        utterance.lang = enLocale;
        const preferred =
          voices.find(
            (v) =>
              v.lang.toLowerCase().startsWith('en-in') ||
              (v.lang.toLowerCase().startsWith('en') && v.name.toLowerCase().includes('india'))
          ) ||
          voices.find(
            (v) =>
              (v.name.includes('Samantha') ||
                v.name.includes('Zira') ||
                v.name.includes('Victoria') ||
                v.name.includes('Natural') ||
                v.name.includes('Female')) &&
              v.lang.toLowerCase().startsWith('en')
          ) ||
          voices.find((v) => v.lang.toLowerCase().startsWith('en')) ||
          null;

        if (preferred) {
          utterance.voice = preferred;
          utterance.lang = preferred.lang || enLocale;
        } else {
          utterance.voice = null;
          utterance.lang = enLocale;
        }
      }

      utterance.onend = () => {
        resolve({ isDirectAudio: true });
      };

      utterance.onerror = (e) => {
        reject(e);
      };

      window.speechSynthesis.speak(utterance);
    });
  }
}

export class TTSProviderRegistry {
  private providers: Map<string, ITTSProvider> = new Map();
  private activeProviderId: string = 'gemini_live'; // default to audio-to-audio Gemini Live!

  constructor() {
    this.register(new ElevenLabsProvider());
    this.register(new CartesiaProvider());
    this.register(new LocalTTSProvider());
  }

  register(provider: ITTSProvider) {
    this.providers.set(provider.id, provider);
  }

  getProvider(id: string): ITTSProvider | undefined {
    return this.providers.get(id);
  }

  getAllProviders(): ITTSProvider[] {
    return Array.from(this.providers.values());
  }

  setActiveProvider(id: string) {
    this.activeProviderId = id;
  }

  getActiveProvider(): ITTSProvider | undefined {
    return this.providers.get(this.activeProviderId);
  }
}

export const ttsRegistry = new TTSProviderRegistry();
