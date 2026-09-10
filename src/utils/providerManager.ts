import {
  ProviderConfig,
  TTSProviderId,
  VoiceSettings,
  MissingKeyProtocol,
} from '../types';
import { logger } from './logger';

export const DEFAULT_PROVIDERS: ProviderConfig[] = [
  {
    id: 'gemini',
    name: 'Google Gemini 3.8 Flash',
    category: 'ai',
    apiKey: '',
    model: 'gemini-3.8-flash',
    status: 'connected', // Handled via server environment
    isPrimary: true,
    isFallback: false,
    enabled: true,
    latencyMs: 140,
    lastChecked: 'Active',
    freeTierAvailable: 'Yes — Google AI Studio free tier available with 15 RPM / 1M TPM.',
    getKeyUrl: 'https://aistudio.google.com/app/apikey',
    docsUrl: 'https://ai.google.dev/gemini-api/docs',
  },
  {
    id: 'elevenlabs',
    name: 'ElevenLabs Conversational TTS',
    category: 'tts',
    apiKey: '',
    voiceId: '21m00Tcm4TlvDq8ikWAM', // Rachel
    status: 'not_configured',
    isPrimary: true,
    isFallback: false,
    enabled: false,
    freeTierAvailable: 'Yes — 10,000 characters/month free on ElevenLabs Free Tier.',
    getKeyUrl: 'https://elevenlabs.io/app/api-keys',
    docsUrl: 'https://elevenlabs.io/docs/api-reference',
  },
  {
    id: 'cartesia',
    name: 'Cartesia Sonic TTS',
    category: 'tts',
    apiKey: '',
    voiceId: 'a0e998e3-18a4-4bd6-8347-cc3907f3213c',
    status: 'not_configured',
    isPrimary: false,
    isFallback: true,
    enabled: false,
    freeTierAvailable: 'Yes — Free credit tier on sign up for ultra-low latency voice.',
    getKeyUrl: 'https://play.cartesia.ai/keys',
    docsUrl: 'https://docs.cartesia.ai',
  },
  {
    id: 'local_tts',
    name: 'Native Humanoid Browser Speech (Zero-Latency Fallback)',
    category: 'tts',
    apiKey: 'NATIVE_DEVICE',
    voiceId: 'Natural-Prosody-Engine',
    status: 'connected',
    isPrimary: false,
    isFallback: true,
    enabled: true,
    latencyMs: 5,
    lastChecked: 'Active',
    freeTierAvailable: '100% Free & Unlimited on device.',
    getKeyUrl: '',
    docsUrl: 'https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis',
  },
  {
    id: 'gemini_grounding',
    name: 'Google Web Search Grounding',
    category: 'search',
    apiKey: '',
    status: 'connected',
    isPrimary: true,
    isFallback: false,
    enabled: true,
    latencyMs: 280,
    lastChecked: 'Active',
    freeTierAvailable: 'Included with Gemini API in Google AI Studio.',
    getKeyUrl: 'https://aistudio.google.com/app/apikey',
    docsUrl: 'https://ai.google.dev/gemini-api/docs/grounding',
  },
  {
    id: 'duckduckgo',
    name: 'DuckDuckGo Instant Answer Search',
    category: 'search',
    apiKey: 'FREE_PUBLIC',
    status: 'connected',
    isPrimary: false,
    isFallback: true,
    enabled: true,
    latencyMs: 190,
    lastChecked: 'Active',
    freeTierAvailable: '100% Free, no API key required.',
    getKeyUrl: '',
    docsUrl: 'https://duckduckgo.com/api',
  },
];

export const DEFAULT_VOICE_SETTINGS: VoiceSettings = {
  provider: 'local_tts',
  voiceId: 'Kore',
  speed: 1.0,
  pitch: 1.0,
  stability: 0.65,
  similarityBoost: 0.75,
  style: 0.35,
  useStreaming: true,
};

class ProviderManager {
  private providers: ProviderConfig[] = [];
  private voiceSettings: VoiceSettings = { ...DEFAULT_VOICE_SETTINGS };
  private listeners: Array<() => void> = [];
  private missingKeyCallback: ((protocol: MissingKeyProtocol) => void) | null = null;

  constructor() {
    this.load();
  }

  private load(): void {
    try {
      const savedProviders = localStorage.getItem('mery_providers_v2');
      if (savedProviders) {
        const parsed = JSON.parse(savedProviders);
        this.providers = DEFAULT_PROVIDERS.map((def) => {
          const found = parsed.find((p: ProviderConfig) => p.id === def.id);
          return found ? { ...def, ...found } : def;
        });
      } else {
        this.providers = [...DEFAULT_PROVIDERS];
      }

      const savedVoice = localStorage.getItem('mery_voice_settings');
      if (savedVoice) {
        const parsed = JSON.parse(savedVoice);
        // Sanitize stale pitch/speed from previous sessions that caused robot voice
        if (typeof parsed.pitch === 'number' && (parsed.pitch > 1.08 || parsed.pitch < 0.92)) {
          parsed.pitch = 1.0;
        }
        if (typeof parsed.speed === 'number' && (parsed.speed > 1.2 || parsed.speed < 0.8)) {
          parsed.speed = 1.0;
        }
        this.voiceSettings = { ...DEFAULT_VOICE_SETTINGS, ...parsed };
      }
    } catch {
      this.providers = [...DEFAULT_PROVIDERS];
      this.voiceSettings = { ...DEFAULT_VOICE_SETTINGS };
    }
  }

  private save(): void {
    try {
      localStorage.setItem('mery_providers_v2', JSON.stringify(this.providers));
      localStorage.setItem('mery_voice_settings', JSON.stringify(this.voiceSettings));
    } catch {}
    this.notify();
  }

  public getProviders(): ProviderConfig[] {
    return [...this.providers];
  }

  public getProvidersByCategory(category: ProviderConfig['category']): ProviderConfig[] {
    return this.providers.filter((p) => p.category === category);
  }

  public getVoiceSettings(): VoiceSettings {
    return { ...this.voiceSettings };
  }

  public updateVoiceSettings(partial: Partial<VoiceSettings>): void {
    this.voiceSettings = { ...this.voiceSettings, ...partial };
    logger.log('INFO', 'tts', `Voice settings updated: provider=${this.voiceSettings.provider}, speed=${this.voiceSettings.speed}`);
    this.save();
  }

  public updateProvider(id: string, updates: Partial<ProviderConfig>): void {
    this.providers = this.providers.map((p) => {
      if (p.id === id) {
        const updated = { ...p, ...updates };
        if (updates.apiKey !== undefined) {
          if (updates.apiKey && updates.apiKey.trim().length > 4) {
            updated.status = 'connected';
            updated.enabled = true;
          } else if (!updates.apiKey) {
            updated.status = 'not_configured';
          }
        }
        return updated;
      }
      // If setting primary, unset other primaries in same category
      if (updates.isPrimary && p.category === this.providers.find((x) => x.id === id)?.category && p.id !== id) {
        return { ...p, isPrimary: false };
      }
      return p;
    });

    logger.log('INFO', 'system', `Provider ${id} updated.`);
    this.save();
  }

  public async testProvider(id: string): Promise<{ success: boolean; latencyMs: number; error?: string }> {
    const provider = this.providers.find((p) => p.id === id);
    if (!provider) return { success: false, latencyMs: 0, error: 'Provider not found' };

    logger.log('INFO', 'system', `Initiating live connection test for ${provider.name}...`);
    const startTime = performance.now();

    try {
      const res = await fetch('/api/providers/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          providerId: provider.id,
          apiKey: provider.apiKey,
          model: provider.model,
          voiceId: provider.voiceId,
        }),
      });

      const data = await res.json();
      const latencyMs = Math.round(performance.now() - startTime);

      if (data.status === 'connected' || res.ok) {
        this.updateProvider(id, {
          status: 'connected',
          latencyMs,
          lastChecked: 'Just now (Passed)',
        });
        logger.log('INFO', 'system', `Test connection to ${provider.name} succeeded in ${latencyMs}ms.`);
        return { success: true, latencyMs };
      } else {
        const statusMap = data.status || 'invalid_key';
        this.updateProvider(id, {
          status: statusMap,
          latencyMs,
          lastChecked: 'Failed test',
        });
        logger.log('WARNING', 'system', `Test connection to ${provider.name} failed: ${data.message || 'Verification rejected'}`);
        return { success: false, latencyMs, error: data.message || 'Failed connection test' };
      }
    } catch (err: any) {
      const latencyMs = Math.round(performance.now() - startTime);
      this.updateProvider(id, {
        status: 'service_unavailable',
        latencyMs,
        lastChecked: 'Connection timeout',
      });
      logger.log('ERROR', 'system', `Network test error for ${provider.name}: ${err?.message}`);
      return { success: false, latencyMs, error: err?.message || 'Network error' };
    }
  }

  public setMissingKeyHandler(handler: (protocol: MissingKeyProtocol) => void): void {
    this.missingKeyCallback = handler;
  }

  public triggerMissingKeyProtocol(protocol: MissingKeyProtocol): void {
    logger.log('WARNING', 'safety', `Feature [${protocol.feature}] requires unconfigured API: ${protocol.api}`);
    if (this.missingKeyCallback) {
      this.missingKeyCallback(protocol);
    }
  }

  public maskKey(key: string): string {
    if (!key || key === 'NATIVE_DEVICE' || key === 'FREE_PUBLIC') return key;
    if (key.length <= 8) return '••••••••';
    return `${key.slice(0, 3)}••••••••••••${key.slice(-4)}`;
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify(): void {
    this.listeners.forEach((l) => l());
  }
}

export const providerManager = new ProviderManager();
