import React, { useState, useEffect } from 'react';
import {
  X,
  Key,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  Volume2,
  Search,
  ExternalLink,
  ShieldCheck,
  Eye,
  EyeOff,
  Radio,
  Sliders,
  Terminal,
  RefreshCw,
  Zap,
  Languages,
  Monitor,
  Camera,
  Video,
  Play,
  Square,
  Settings2,
  HelpCircle,
  Box,
  Upload,
} from 'lucide-react';
import { ProviderConfig, ProviderCategory, VoiceSettings, StructuredLog, LogLevel, ScreenShareSettings, ScreenResolution } from '../types';
import { providerManager } from '../utils/providerManager';
import { logger } from '../utils/logger';
import { voiceService } from '../utils/audio';
import { stateManager, SpokenLanguage } from '../modules/StateManager';
import { screenShareService } from '../modules/ScreenShareService';

interface ApiManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ApiManagementModal: React.FC<ApiManagementModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'providers' | 'voice' | 'screen' | 'logs'>('providers');
  const [providers, setProviders] = useState<ProviderConfig[]>([]);
  const [voiceSettings, setVoiceSettings] = useState<VoiceSettings>(providerManager.getVoiceSettings());
  const [screenSettings, setScreenSettings] = useState<ScreenShareSettings>(screenShareService.getSettings());
  const [screenStats, setScreenStats] = useState(screenShareService.getStats());
  const [snapshotPreview, setSnapshotPreview] = useState<string | null>(screenShareService.getLatestSnapshot());
  const [isCapturingSnapshot, setIsCapturingSnapshot] = useState(false);
  const [editingKeys, setEditingKeys] = useState<Record<string, string>>({});
  const [revealedKeys, setRevealedKeys] = useState<Record<string, boolean>>({});
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; latencyMs: number; message?: string }>>({});
  const [logs, setLogs] = useState<StructuredLog[]>([]);
  const [logFilter, setLogFilter] = useState<LogLevel | 'ALL'>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<ProviderCategory | 'all'>('all');
  const [currentLanguage, setCurrentLanguage] = useState<SpokenLanguage>(stateManager.getLanguage());

  useEffect(() => {
    setProviders(providerManager.getProviders());
    setVoiceSettings(providerManager.getVoiceSettings());
    setLogs(logger.getLogs());
    setCurrentLanguage(stateManager.getLanguage());

    const unsubProv = providerManager.subscribe(() => {
      setProviders(providerManager.getProviders());
      setVoiceSettings(providerManager.getVoiceSettings());
    });

    const unsubLog = logger.subscribe((newLogs) => {
      setLogs(newLogs);
    });

    const unsubLang = stateManager.onLanguageChange((lang) => {
      setCurrentLanguage(lang);
    });

    const unsubScreen = screenShareService.subscribe(() => {
      setScreenSettings(screenShareService.getSettings());
      setScreenStats(screenShareService.getStats());
      setSnapshotPreview(screenShareService.getLatestSnapshot());
    });

    return () => {
      unsubProv();
      unsubLog();
      unsubLang();
      unsubScreen();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleLanguageSelect = (lang: SpokenLanguage) => {
    stateManager.setLanguage(lang);
    setCurrentLanguage(lang);
    logger.log('INFO', 'system', `Updated spoken language to ${lang}`);
  };

  const handleKeyChange = (id: string, val: string) => {
    setEditingKeys((prev) => ({ ...prev, [id]: val }));
  };

  const handleSaveKey = (id: string) => {
    const key = editingKeys[id];
    if (key !== undefined) {
      providerManager.updateProvider(id, { apiKey: key.trim() });
      logger.log('INFO', 'system', `Updated credential key for provider ${id}`);
    }
  };

  const handleToggleReveal = (id: string) => {
    setRevealedKeys((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleTestConnection = async (id: string) => {
    setTestingId(id);
    const result = await providerManager.testProvider(id);
    setTestResults((prev) => ({
      ...prev,
      [id]: {
        success: result.success,
        latencyMs: result.latencyMs,
        message: result.error || (result.success ? `Connected (${result.latencyMs}ms)` : 'Failed'),
      },
    }));
    setTestingId(null);
  };

  const handleSetPrimary = (id: string) => {
    providerManager.updateProvider(id, { isPrimary: true, enabled: true });
  };

  const handleToggleEnable = (id: string, current: boolean) => {
    providerManager.updateProvider(id, { enabled: !current });
  };

  const handleTestVoiceSpeech = () => {
    logger.log('INFO', 'tts', 'Testing active voice settings...');
    const testText =
      currentLanguage === 'gu-IN'
        ? 'નમસ્તે, હું મેરી છું! તમારી ગુજરાતી વોઇસ સિસ્ટમ સંપૂર્ણપણે સક્રિય છે.'
        : 'MERY voice synthesis test verified. How is my pitch and cadence?';
    voiceService.speakBrowserVoice(
      testText,
      undefined,
      undefined,
      { pitch: voiceSettings.pitch, rate: voiceSettings.speed }
    );
  };

  const filteredProviders = selectedCategory === 'all'
    ? providers
    : providers.filter((p) => p.category === selectedCategory);

  const filteredLogs = logFilter === 'ALL'
    ? logs
    : logs.filter((l) => l.level === logFilter);

  return (
    <div
      id="modal-api-management"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
    >
      <div
        className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-3xl bg-[#0D0818]/95 border border-[#9D7BFF]/30 shadow-2xl shadow-[#9D7BFF]/10 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#140F24]/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-[#9D7BFF]/20 border border-[#9D7BFF]/30 text-[#C6A0FF]">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white tracking-wide flex items-center gap-2">
                External AI & Provider Integrations
                <span className="text-[10px] uppercase font-telemetry tracking-widest px-2 py-0.5 rounded-full bg-[#E7B7A5]/20 text-[#E7B7A5]">
                  Modular Architecture
                </span>
              </h2>
              <p className="text-xs text-white/50">
                Configure primary AI reasoning, speech providers (ElevenLabs / Cartesia), and search grounding.
              </p>
            </div>
          </div>
          <button
            id="btn-close-api-modal"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10 text-white/60 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center justify-between px-6 border-b border-white/10 bg-[#0E091B]">
          <div className="flex items-center gap-2 py-2.5">
            <button
              id="tab-providers"
              onClick={() => setActiveTab('providers')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
                activeTab === 'providers'
                  ? 'bg-[#9D7BFF]/20 text-[#E7B7A5] border border-[#9D7BFF]/40'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              API Providers
            </button>
            <button
              id="tab-voice-settings"
              onClick={() => setActiveTab('voice')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
                activeTab === 'voice'
                  ? 'bg-[#9D7BFF]/20 text-[#E7B7A5] border border-[#9D7BFF]/40'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <Volume2 className="w-3.5 h-3.5" />
              Voice Settings
            </button>
            <button
              id="tab-screen-sharing"
              onClick={() => setActiveTab('screen')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
                activeTab === 'screen'
                  ? 'bg-[#9D7BFF]/20 text-[#E7B7A5] border border-[#9D7BFF]/40'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <Monitor className={`w-3.5 h-3.5 ${screenStats.isSharing ? 'text-emerald-400 animate-pulse' : ''}`} />
              Screen Sharing
              {screenStats.isSharing && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              )}
            </button>
            <button
              id="tab-system-logs"
              onClick={() => setActiveTab('logs')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
                activeTab === 'logs'
                  ? 'bg-[#9D7BFF]/20 text-[#E7B7A5] border border-[#9D7BFF]/40'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              Structured Logs
            </button>
          </div>

          {activeTab === 'providers' && (
            <div className="flex items-center gap-1.5 text-xs text-white/50">
              <span>Category:</span>
              {(['all', 'ai', 'tts', 'search'] as const).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2 py-0.5 rounded-md uppercase text-[10px] font-telemetry tracking-wider ${
                    selectedCategory === cat
                      ? 'bg-[#9D7BFF]/30 text-white font-semibold'
                      : 'text-white/40 hover:text-white/80'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {activeTab === 'providers' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-[#140F26] border border-white/10 text-xs text-white/70 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-semibold text-white">Privacy & Credential Isolation:</span> Keys are stored in secure local configuration, masked in all views, and never transmitted to unauthorized services. If a feature key is missing, MERY clearly explains where to acquire free-tier access.
                </div>
              </div>

              {filteredProviders.map((prov) => {
                const isEditing = editingKeys[prov.id] !== undefined;
                const displayKey = isEditing
                  ? editingKeys[prov.id]
                  : prov.apiKey || '';
                const isRevealed = revealedKeys[prov.id] || false;
                const result = testResults[prov.id];

                return (
                  <div
                    key={prov.id}
                    className={`p-5 rounded-2xl border transition-all ${
                      prov.enabled
                        ? 'bg-[#150F28] border-white/10 hover:border-[#9D7BFF]/40'
                        : 'bg-[#100B20]/60 border-white/5 opacity-70'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-[#9D7BFF]/15 border border-[#9D7BFF]/25 text-[#E7B7A5]">
                          {prov.category === 'ai' && <Sparkles className="w-4 h-4" />}
                          {prov.category === 'tts' && <Volume2 className="w-4 h-4" />}
                          {prov.category === 'search' && <Search className="w-4 h-4" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium text-white text-sm">{prov.name}</h3>
                            {prov.isPrimary && (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-telemetry tracking-wider uppercase bg-[#9D7BFF]/30 text-[#C6A0FF] border border-[#9D7BFF]/40">
                                Primary
                              </span>
                            )}
                            {prov.isFallback && (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-telemetry tracking-wider uppercase bg-white/10 text-white/60">
                                Fallback
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-white/40 font-telemetry capitalize">
                            {prov.category} Provider • Model: {prov.model || prov.voiceId || 'Default'}
                          </span>
                        </div>
                      </div>

                      {/* Status Badge & Controls */}
                      <div className="flex items-center gap-2">
                        <span
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-telemetry capitalize border ${
                            prov.status === 'connected'
                              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                              : prov.status === 'not_configured'
                              ? 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                              : 'bg-rose-500/15 border-rose-500/30 text-rose-300'
                          }`}
                        >
                          {prov.status === 'connected' ? (
                            <CheckCircle2 className="w-3 h-3" />
                          ) : (
                            <AlertCircle className="w-3 h-3" />
                          )}
                          {prov.status.replace('_', ' ')}
                        </span>

                        <button
                          onClick={() => handleToggleEnable(prov.id, prov.enabled)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-telemetry transition-colors ${
                            prov.enabled
                              ? 'bg-white/10 text-white/80 hover:bg-white/20'
                              : 'bg-white/5 text-white/40 hover:bg-white/10'
                          }`}
                        >
                          {prov.enabled ? 'Enabled' : 'Disabled'}
                        </button>
                      </div>
                    </div>

                    {/* Free Tier Details */}
                    {prov.freeTierAvailable && (
                      <div className="mb-3 px-3 py-1.5 rounded-lg bg-white/5 border border-white/5 text-[11px] text-white/60 flex items-center justify-between">
                        <span>{prov.freeTierAvailable}</span>
                        {prov.getKeyUrl && (
                          <a
                            href={prov.getKeyUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[#C6A0FF] hover:underline flex items-center gap-1 shrink-0 ml-2"
                          >
                            Get Key <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    )}

                    {/* API Key Input Row */}
                    {prov.apiKey !== 'NATIVE_DEVICE' && prov.apiKey !== 'FREE_PUBLIC' && (
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
                        <div className="relative flex-1">
                          <input
                            type={isRevealed ? 'text' : 'password'}
                            value={displayKey}
                            placeholder={prov.apiKey ? '••••••••••••••••' : 'Enter API Key...'}
                            onChange={(e) => handleKeyChange(prov.id, e.target.value)}
                            className="w-full px-3.5 py-2 rounded-xl bg-[#0F0A1E] border border-white/15 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#9D7BFF] font-telemetry"
                          />
                          <button
                            type="button"
                            onClick={() => handleToggleReveal(prov.id)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
                          >
                            {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleSaveKey(prov.id)}
                            disabled={!isEditing}
                            className="px-3.5 py-2 rounded-xl bg-[#9D7BFF]/20 border border-[#9D7BFF]/40 text-xs text-[#E7B7A5] hover:bg-[#9D7BFF]/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                          >
                            Save
                          </button>

                          <button
                            onClick={() => handleTestConnection(prov.id)}
                            disabled={testingId === prov.id}
                            className="px-3.5 py-2 rounded-xl bg-white/10 border border-white/15 text-xs text-white/80 hover:bg-white/15 flex items-center gap-1.5 transition-all"
                          >
                            {testingId === prov.id ? (
                              <RefreshCw className="w-3 h-3 animate-spin" />
                            ) : (
                              <Radio className="w-3 h-3 text-[#C6A0FF]" />
                            )}
                            Test
                          </button>

                          {!prov.isPrimary && (
                            <button
                              onClick={() => handleSetPrimary(prov.id)}
                              className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-white/60 transition-colors"
                              title="Set as primary provider for this category"
                            >
                              Make Primary
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Test result status output */}
                    {result && (
                      <div
                        className={`mt-2.5 text-[11px] font-telemetry px-3 py-1 rounded-lg ${
                          result.success
                            ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-300 border border-rose-500/20'
                        }`}
                      >
                        Result: {result.message}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === 'voice' && (
            <div className="space-y-6">
              <div className="p-5 rounded-2xl bg-[#150F28] border border-white/10 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <Volume2 className="w-4 h-4 text-[#C6A0FF]" />
                    Active Speech Synthesis Engine
                  </h3>
                  <button
                    onClick={handleTestVoiceSpeech}
                    className="px-3 py-1.5 rounded-xl bg-[#9D7BFF]/20 border border-[#9D7BFF]/40 text-xs text-[#E7B7A5] hover:bg-[#9D7BFF]/30 flex items-center gap-1.5 transition-all"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    Test Voice Output
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { id: 'local_tts', name: 'Browser Natural Speech', desc: 'Zero-latency, local humanoid prosody engine' },
                    { id: 'elevenlabs', name: 'ElevenLabs Conversational', desc: 'Ultra-expressive neural voice synthesis' },
                    { id: 'cartesia', name: 'Cartesia Sonic Engine', desc: 'Sub-150ms ultra-low latency voice' },
                  ].map((engine) => (
                    <button
                      key={engine.id}
                      onClick={() => providerManager.updateVoiceSettings({ provider: engine.id as any })}
                      className={`p-3.5 rounded-xl border text-left transition-all ${
                        voiceSettings.provider === engine.id
                          ? 'bg-[#9D7BFF]/25 border-[#9D7BFF] text-white shadow-lg shadow-[#9D7BFF]/10'
                          : 'bg-[#100B20] border-white/10 text-white/70 hover:border-white/20'
                      }`}
                    >
                      <div className="text-xs font-semibold text-white mb-1">{engine.name}</div>
                      <div className="text-[11px] text-white/50">{engine.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Sliders for Prosody & Style */}
              <div className="p-5 rounded-2xl bg-[#150F28] border border-white/10 space-y-5">
                <h4 className="text-xs font-telemetry uppercase tracking-wider text-white/70">
                  Prosody & Vocal Cadence Controls
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-white/80">Speech Cadence (Speed)</span>
                      <span className="font-telemetry text-[#E7B7A5]">{(voiceSettings.speed || 1.0).toFixed(2)}x</span>
                    </div>
                    <input
                      type="range"
                      min="0.85"
                      max="1.15"
                      step="0.01"
                      value={voiceSettings.speed}
                      onChange={(e) =>
                        providerManager.updateVoiceSettings({ speed: parseFloat(e.target.value) })
                      }
                      className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#9D7BFF]"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-white/80">Vocal Pitch (1.0 = Natural Human)</span>
                      <span className="font-telemetry text-[#E7B7A5]">{(voiceSettings.pitch || 1.0).toFixed(2)}x</span>
                    </div>
                    <input
                      type="range"
                      min="0.95"
                      max="1.05"
                      step="0.01"
                      value={voiceSettings.pitch}
                      onChange={(e) =>
                        providerManager.updateVoiceSettings({ pitch: parseFloat(e.target.value) })
                      }
                      className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#9D7BFF]"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-white/80">ElevenLabs Stability</span>
                      <span className="font-telemetry text-[#E7B7A5]">
                        {Math.round(voiceSettings.stability * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.1"
                      max="1.0"
                      step="0.05"
                      value={voiceSettings.stability}
                      onChange={(e) =>
                        providerManager.updateVoiceSettings({ stability: parseFloat(e.target.value) })
                      }
                      className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#9D7BFF]"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-white/80">Clarity / Similarity Boost</span>
                      <span className="font-telemetry text-[#E7B7A5]">
                        {Math.round(voiceSettings.similarityBoost * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.1"
                      max="1.0"
                      step="0.05"
                      value={voiceSettings.similarityBoost}
                      onChange={(e) =>
                        providerManager.updateVoiceSettings({ similarityBoost: parseFloat(e.target.value) })
                      }
                      className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#9D7BFF]"
                    />
                  </div>
                </div>
              </div>

              {/* Spoken Language & Multi-Lingual Settings */}
              <div className="p-5 rounded-2xl bg-[#150F28] border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-telemetry uppercase tracking-wider text-white/70 flex items-center gap-2">
                    <Languages className="w-3.5 h-3.5 text-amber-400" />
                    Live Spoken Language / ભાષા
                  </h4>
                  <span className="text-[11px] text-[#E7B7A5] font-mono">
                    Active:{' '}
                    {currentLanguage === 'gu-IN'
                      ? 'ગુજરાતી (Gujarati)'
                      : currentLanguage === 'en-US'
                      ? 'English (US)'
                      : 'Auto Detect'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    {
                      id: 'gu-IN' as SpokenLanguage,
                      label: 'ગુજરાતી (Gujarati)',
                      desc: 'ગુજરાતી વાર્તાલાપ અને નેચરલ સ્પીચ (Aoede voice / gu-IN speech input)',
                    },
                    {
                      id: 'en-US' as SpokenLanguage,
                      label: 'English (US)',
                      desc: 'Fluent conversational English with MERY warm prosody',
                    },
                    {
                      id: 'auto' as SpokenLanguage,
                      label: 'Auto Detect (સ્વતઃ)',
                      desc: 'Dynamically adapts between Gujarati and English',
                    },
                  ].map((lang) => (
                    <button
                      key={lang.id}
                      onClick={() => handleLanguageSelect(lang.id)}
                      className={`p-3.5 rounded-xl border text-left transition-all ${
                        currentLanguage === lang.id
                          ? 'bg-gradient-to-br from-amber-500/20 to-purple-600/20 border-amber-400 text-white shadow-lg shadow-amber-500/10'
                          : 'bg-[#100B20] border-white/10 text-white/70 hover:border-white/20'
                      }`}
                    >
                      <div className="text-xs font-semibold text-white mb-1 flex items-center justify-between">
                        <span>{lang.label}</span>
                        {currentLanguage === lang.id && (
                          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                        )}
                      </div>
                      <div className="text-[11px] text-white/50">{lang.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* 3D Avatar Model & VRM Integration */}
              <div className="p-5 rounded-2xl bg-[#150F28] border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Box className="w-4 h-4 text-[#F5B2C3]" />
                    <h3 className="text-sm font-semibold text-white">3D Avatar Model (.VRM)</h3>
                  </div>
                  <button
                    onClick={() => {
                      onClose();
                      window.dispatchEvent(new CustomEvent('open-vrm-upload'));
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-[#F5B2C3]/20 border border-[#F5B2C3]/40 text-xs text-[#F5B2C3] hover:bg-[#F5B2C3]/30 flex items-center gap-1.5 transition-all cursor-pointer font-medium"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Upload / Switch VRM Model
                  </button>
                </div>
                <p className="text-xs text-white/60">
                  Upload your custom 3D anime model (.vrm) created with VRoid Studio, Booth, or Blender. Supports automated lip-sync, autonomous blinking, looking around, and spring bone physics.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'screen' && (
            <div className="space-y-6">
              {/* Screen Sharing Master Status Card */}
              <div className="p-5 rounded-2xl bg-[#150F28] border border-white/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center border transition-all ${
                      screenStats.isSharing
                        ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.2)]'
                        : 'bg-white/5 border-white/10 text-white/50'
                    }`}
                  >
                    <Monitor className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-white">MERY Screen Vision & Display Stream</h3>
                      <span
                        className={`text-[10px] font-telemetry px-2 py-0.5 rounded-full uppercase tracking-wider ${
                          screenStats.isSharing
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold'
                            : 'bg-white/10 text-white/50'
                        }`}
                      >
                        {screenStats.isSharing ? 'Live Streaming' : 'Inactive'}
                      </span>
                    </div>
                    <p className="text-xs text-white/50 mt-0.5">
                      Stream your active display or application window so MERY can visually analyze code, designs, and content in real-time.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto">
                  {screenStats.isSharing ? (
                    <>
                      <button
                        id="btn-take-snapshot"
                        onClick={() => {
                          setIsCapturingSnapshot(true);
                          const snap = screenShareService.captureSingleFrame();
                          if (snap) setSnapshotPreview(snap);
                          setTimeout(() => setIsCapturingSnapshot(false), 300);
                        }}
                        disabled={isCapturingSnapshot}
                        className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white/80 text-xs font-medium transition-all flex items-center gap-1.5 border border-white/10"
                        title="Capture fresh screen snapshot"
                      >
                        <Camera className={`w-3.5 h-3.5 ${isCapturingSnapshot ? 'animate-spin' : ''}`} />
                        <span>Snapshot</span>
                      </button>
                      <button
                        id="btn-stop-screen-share"
                        onClick={() => screenShareService.stopScreenShare()}
                        className="flex-1 md:flex-initial px-4 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-semibold transition-all flex items-center justify-center gap-2 shadow-lg shadow-rose-950/20"
                      >
                        <Square className="w-3.5 h-3.5 fill-rose-300" />
                        Stop Sharing
                      </button>
                    </>
                  ) : (
                    <button
                      id="btn-start-screen-share"
                      onClick={() => screenShareService.startScreenShare()}
                      className="flex-1 md:flex-initial px-4 py-2 rounded-xl bg-gradient-to-r from-[#9D7BFF] to-[#E7B7A5] hover:opacity-95 text-[#0A0614] text-xs font-semibold transition-all flex items-center justify-center gap-2 shadow-lg shadow-purple-500/20"
                    >
                      <Play className="w-3.5 h-3.5 fill-[#0A0614]" />
                      Start Screen Sharing
                    </button>
                  )}
                </div>
              </div>

              {/* Error Notice if any */}
              {screenStats.lastError && (
                <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-200 text-xs flex items-start gap-3">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <div className="font-semibold text-rose-300">Display Capture Notice</div>
                    <div className="text-white/70">{screenStats.lastError}</div>
                  </div>
                </div>
              )}

              {/* Live Preview Display Box */}
              <div className="p-5 rounded-2xl bg-[#0F0A1F] border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-telemetry uppercase tracking-wider text-white/70 flex items-center gap-2">
                    <Video className="w-3.5 h-3.5 text-[#9D7BFF]" />
                    Visual Stream Monitor
                  </h4>
                  {screenStats.isSharing && (
                    <div className="flex items-center gap-3 text-[11px] font-mono text-white/60">
                      <span>Res: <strong className="text-emerald-400">{screenStats.activeResolution}</strong></span>
                      <span>FPS: <strong className="text-cyan-400">{screenSettings.frameRate}</strong></span>
                      <span>Frames: <strong className="text-purple-300">{screenStats.framesSent}</strong></span>
                    </div>
                  )}
                </div>

                <div className="relative w-full h-56 rounded-xl bg-[#07040D] border border-white/10 flex items-center justify-center overflow-hidden">
                  {screenStats.isSharing && snapshotPreview ? (
                    <div className="relative w-full h-full flex items-center justify-center">
                      <img
                        src={`data:image/jpeg;base64,${snapshotPreview}`}
                        alt="Active Screen Feed"
                        className="w-full h-full object-contain"
                      />
                      <div className="absolute top-2.5 left-2.5 px-2 py-1 rounded-md bg-black/70 backdrop-blur-md border border-white/10 text-[10px] font-telemetry text-emerald-400 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        FEED TRANSMITTING TO MERY
                      </div>
                      <div className="absolute bottom-2.5 right-2.5 px-2 py-1 rounded-md bg-black/70 backdrop-blur-md border border-white/10 text-[10px] font-mono text-white/70">
                        {screenStats.activeResolution} @ {screenSettings.frameRate} FPS
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-center p-6 space-y-2">
                      <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/30 mb-1">
                        <Monitor className="w-6 h-6" />
                      </div>
                      <div className="text-xs font-medium text-white/70">No Screen Feed Active</div>
                      <p className="text-[11px] text-white/40 max-w-sm">
                        Click "Start Screen Sharing" above or in the main companion view to grant screen capture and share visual context with MERY.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Configuration Settings Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Resolution Setting */}
                <div className="p-4 rounded-2xl bg-[#150F28] border border-white/10 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-white/80">Stream Resolution</span>
                    <span className="text-[10px] font-telemetry uppercase text-[#E7B7A5]">
                      {screenSettings.resolution}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {(
                      [
                        { id: '480p' as ScreenResolution, label: '480p', desc: 'Fast / Light' },
                        { id: '720p' as ScreenResolution, label: '720p', desc: 'Recommended' },
                        { id: '1080p' as ScreenResolution, label: '1080p', desc: 'High Detail' },
                      ] as const
                    ).map((r) => (
                      <button
                        key={r.id}
                        onClick={() => screenShareService.saveSettings({ resolution: r.id })}
                        className={`p-2 rounded-xl text-center border transition-all ${
                          screenSettings.resolution === r.id
                            ? 'bg-[#9D7BFF]/20 border-[#9D7BFF] text-white shadow-sm'
                            : 'bg-white/5 border-white/5 text-white/60 hover:text-white hover:bg-white/10'
                        }`}
                      >
                        <div className="text-xs font-bold">{r.label}</div>
                        <div className="text-[10px] text-white/40">{r.desc}</div>
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] text-white/40">
                    Higher resolutions provide sharper clarity for code and terminal text; 720p is optimized for instant AI turnarounds.
                  </p>
                </div>

                {/* Frame Rate Setting */}
                <div className="p-4 rounded-2xl bg-[#150F28] border border-white/10 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-white/80">Transmission Rate</span>
                    <span className="text-[10px] font-telemetry uppercase text-cyan-400">
                      {screenSettings.frameRate} FPS
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { val: 0.5, label: '0.5 FPS', desc: 'Every 2s' },
                      { val: 1.0, label: '1.0 FPS', desc: 'Recommended' },
                      { val: 2.0, label: '2.0 FPS', desc: 'Smooth' },
                    ].map((fps) => (
                      <button
                        key={fps.val}
                        onClick={() => screenShareService.saveSettings({ frameRate: fps.val })}
                        className={`p-2 rounded-xl text-center border transition-all ${
                          screenSettings.frameRate === fps.val
                            ? 'bg-cyan-500/20 border-cyan-400 text-white shadow-sm'
                            : 'bg-white/5 border-white/5 text-white/60 hover:text-white hover:bg-white/10'
                        }`}
                      >
                        <div className="text-xs font-bold">{fps.label}</div>
                        <div className="text-[10px] text-white/40">{fps.desc}</div>
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] text-white/40">
                    Controls how frequently visual frames are delivered into MERY's neural context during voice sessions.
                  </p>
                </div>

                {/* Image Quality Slider */}
                <div className="p-4 rounded-2xl bg-[#150F28] border border-white/10 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-white/80">JPEG Compression Quality</span>
                    <span className="text-[10px] font-telemetry uppercase text-purple-300 font-mono">
                      {Math.round(screenSettings.jpegQuality * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="0.9"
                    step="0.05"
                    value={screenSettings.jpegQuality}
                    onChange={(e) =>
                      screenShareService.saveSettings({ jpegQuality: parseFloat(e.target.value) })
                    }
                    className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#9D7BFF]"
                  />
                  <div className="flex justify-between text-[10px] text-white/40 font-mono">
                    <span>50% (Compact)</span>
                    <span>70% (Standard)</span>
                    <span>90% (Lossless-like)</span>
                  </div>
                </div>

                {/* Toggles */}
                <div className="p-4 rounded-2xl bg-[#150F28] border border-white/10 space-y-3 flex flex-col justify-center">
                  <label className="flex items-center justify-between cursor-pointer group">
                    <div className="space-y-0.5 pr-2">
                      <div className="text-xs font-medium text-white/80 group-hover:text-white">
                        Auto-Prompt on Live Voice Start
                      </div>
                      <div className="text-[10px] text-white/40">
                        Automatically request screen sharing when establishing Gemini Live link
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={screenSettings.autoShareOnLiveStart}
                      onChange={(e) =>
                        screenShareService.saveSettings({ autoShareOnLiveStart: e.target.checked })
                      }
                      className="w-4 h-4 rounded border-white/20 bg-white/5 text-[#9D7BFF] focus:ring-[#9D7BFF]/40 cursor-pointer"
                    />
                  </label>

                  <div className="border-t border-white/5 pt-2">
                    <label className="flex items-center justify-between cursor-pointer group">
                      <div className="space-y-0.5 pr-2">
                        <div className="text-xs font-medium text-white/80 group-hover:text-white">
                          Capture System Tab Audio
                        </div>
                        <div className="text-[10px] text-white/40">
                          Include tab audio stream with display when sharing media
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={screenSettings.sendAudioWithScreen}
                        onChange={(e) =>
                          screenShareService.saveSettings({ sendAudioWithScreen: e.target.checked })
                        }
                        className="w-4 h-4 rounded border-white/20 bg-white/5 text-[#9D7BFF] focus:ring-[#9D7BFF]/40 cursor-pointer"
                      />
                    </label>
                  </div>
                </div>
              </div>

              {/* Desktop Iframe & Browser Permission Helper Card */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-950/30 to-[#120D24] border border-purple-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="text-xs font-semibold text-white/90 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    Embedded Preview & Browser Permissions
                  </div>
                  <p className="text-[11px] text-white/50 max-w-xl">
                    Browser security requires direct user interaction to grant display capture. If your browser restricts screen capture in the embedded preview iframe, launch MERY in a standalone tab with full desktop privileges.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    id="btn-open-allow-guide-from-settings"
                    onClick={() => screenShareService.requestAllowModal()}
                    className="px-3 py-1.5 rounded-xl bg-[#9D7BFF]/20 hover:bg-[#9D7BFF]/30 text-[#E7B7A5] text-xs font-medium transition-all flex items-center gap-1.5 border border-[#9D7BFF]/40 whitespace-nowrap shrink-0"
                  >
                    <HelpCircle className="w-3.5 h-3.5 text-[#E7B7A5]" />
                    Permissions Guide
                  </button>
                  <button
                    id="btn-open-tab-for-screen"
                    onClick={() => {
                      const url = new URL(window.location.href);
                      url.searchParams.set('autoshare', '1');
                      window.open(url.toString(), '_blank');
                    }}
                    className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white/90 text-xs font-medium transition-all flex items-center gap-1.5 border border-white/10 whitespace-nowrap shrink-0"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-cyan-300" />
                    Open in New Tab
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'logs' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-white/60">Filter Level:</span>
                  {(['ALL', 'INFO', 'WARNING', 'ERROR', 'CRITICAL'] as const).map((lvl) => (
                    <button
                      key={lvl}
                      onClick={() => setLogFilter(lvl)}
                      className={`px-2 py-0.5 rounded-md uppercase text-[10px] font-telemetry ${
                        logFilter === lvl
                          ? 'bg-[#9D7BFF]/30 text-white font-semibold'
                          : 'text-white/40 hover:text-white'
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => logger.clear()}
                  className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 hover:text-white text-[11px] font-telemetry"
                >
                  Clear Logs
                </button>
              </div>

              <div className="p-4 rounded-2xl bg-[#0A0614] border border-white/10 font-mono text-xs max-h-[400px] overflow-y-auto space-y-2">
                {filteredLogs.length === 0 ? (
                  <div className="text-white/40 text-center py-6">No logs match this filter.</div>
                ) : (
                  filteredLogs.map((entry) => (
                    <div
                      key={entry.id}
                      className="p-2 rounded-lg bg-white/[0.02] border border-white/5 hover:border-white/10 flex items-start gap-2.5"
                    >
                      <span className="text-white/30 text-[10px] whitespace-nowrap">{entry.timestamp}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded font-bold uppercase ${
                          entry.level === 'INFO'
                            ? 'bg-sky-500/20 text-sky-300'
                            : entry.level === 'WARNING'
                            ? 'bg-amber-500/20 text-amber-300'
                            : 'bg-rose-500/20 text-rose-300'
                        }`}
                      >
                        {entry.level}
                      </span>
                      <span className="text-[10px] uppercase text-[#E7B7A5] font-telemetry">
                        [{entry.category}]
                      </span>
                      <span className="text-white/80 flex-1">{entry.message}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-white/10 bg-[#120D22]">
          <div className="flex items-center gap-2 text-xs text-white/50">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Telemetry online • Section 6, 7 & 21 Compliance</span>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[#9D7BFF]/20 border border-[#9D7BFF]/40 text-xs font-medium text-[#E7B7A5] hover:bg-[#9D7BFF]/30 transition-all"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
