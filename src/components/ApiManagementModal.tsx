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
} from 'lucide-react';
import { ProviderConfig, ProviderCategory, VoiceSettings, StructuredLog, LogLevel } from '../types';
import { providerManager } from '../utils/providerManager';
import { logger } from '../utils/logger';
import { voiceService } from '../utils/audio';
import { stateManager, SpokenLanguage } from '../modules/StateManager';

interface ApiManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ApiManagementModal: React.FC<ApiManagementModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'providers' | 'voice' | 'logs'>('providers');
  const [providers, setProviders] = useState<ProviderConfig[]>([]);
  const [voiceSettings, setVoiceSettings] = useState<VoiceSettings>(providerManager.getVoiceSettings());
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

    return () => {
      unsubProv();
      unsubLog();
      unsubLang();
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
                      <span className="font-telemetry text-[#E7B7A5]">{voiceSettings.speed}x</span>
                    </div>
                    <input
                      type="range"
                      min="0.75"
                      max="1.3"
                      step="0.05"
                      value={voiceSettings.speed}
                      onChange={(e) =>
                        providerManager.updateVoiceSettings({ speed: parseFloat(e.target.value) })
                      }
                      className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#9D7BFF]"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-white/80">Vocal Pitch Register</span>
                      <span className="font-telemetry text-[#E7B7A5]">{voiceSettings.pitch}x</span>
                    </div>
                    <input
                      type="range"
                      min="0.8"
                      max="1.3"
                      step="0.05"
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
