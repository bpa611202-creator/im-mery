import React, { useState, useEffect } from 'react';
import {
  X,
  Camera,
  CameraOff,
  Monitor,
  Languages,
  Volume2,
  VolumeX,
  MessageSquare,
  Zap,
  SlidersHorizontal,
  Cpu,
  Sparkles,
  Settings,
  Activity,
  Check,
} from 'lucide-react';
import { cameraService } from '../modules/CameraService';
import { screenShareService } from '../modules/ScreenShareService';
import { stateManager, SpokenLanguage } from '../modules/StateManager';

interface ToolsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSettings: () => void;
  onOpenTools: () => void;
  onOpenTranscript?: () => void;
  onOpenAgentDev?: () => void;
  onOpenSystemControl?: () => void;
  onOpenActivity?: () => void;
  onOpenEmotion?: () => void;
  voiceEnabled?: boolean;
  onToggleVoice?: () => void;
  messageCount?: number;
}

export const ToolsSheet: React.FC<ToolsSheetProps> = ({
  isOpen,
  onClose,
  onOpenSettings,
  onOpenTools,
  onOpenTranscript,
  onOpenAgentDev,
  onOpenSystemControl,
  onOpenActivity,
  onOpenEmotion,
  voiceEnabled = true,
  onToggleVoice,
  messageCount = 0,
}) => {
  const [isCameraActive, setIsCameraActive] = useState(cameraService.isCameraActive());
  const [isSharingScreen, setIsSharingScreen] = useState(screenShareService.isSharing());
  const [language, setLanguage] = useState<SpokenLanguage>(stateManager.getLanguage());

  useEffect(() => {
    const unsubCam = cameraService.subscribe((active) => setIsCameraActive(active));
    const unsubScreen = screenShareService.subscribe(() => setIsSharingScreen(screenShareService.isSharing()));
    const unsubLang = stateManager.onLanguageChange((lang) => setLanguage(lang));
    return () => {
      unsubCam();
      unsubScreen();
      unsubLang();
    };
  }, []);

  if (!isOpen) return null;

  const handleToggleCamera = async () => {
    if (isCameraActive) {
      cameraService.stopCamera();
    } else {
      await cameraService.startCamera('user');
    }
  };

  const handleToggleScreen = async () => {
    if (isSharingScreen) {
      screenShareService.stopScreenShare();
    } else {
      const ok = await screenShareService.startScreenShare();
      if (!ok && screenShareService.isInIframe()) {
        screenShareService.requestAllowModal();
      }
    }
  };

  const handleSetLanguage = (lang: SpokenLanguage) => {
    stateManager.setLanguage(lang);
    setLanguage(lang);
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      {/* Backdrop */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Sheet Modal Card */}
      <div
        className="relative w-full sm:max-w-lg bg-[#0c0e12] border-t sm:border border-white/15 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[88dvh] flex flex-col z-10 pb-[max(1rem,env(safe-area-inset-bottom))] animate-slideUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Swipe Handle */}
        <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mt-3 mb-1 sm:hidden" />

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-[#00ff66]/15 border border-[#00ff66]/30 flex items-center justify-center">
              <Zap className="w-4 h-4 text-[#00ff66]" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white tracking-wide">Companion Tools & Controls</h3>
              <p className="text-[10px] text-white/50 font-telemetry">Sensors, Language & System Modules</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-white/60 hover:text-white transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Grid */}
        <div className="overflow-y-auto px-5 py-4 space-y-5 text-xs">
          {/* Group 1: Live Sensors & Vision */}
          <div>
            <label className="text-[10px] font-telemetry uppercase tracking-wider text-[#00ff66]/80 block mb-2 font-semibold">
              Live Vision & Input Sensors
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              {/* Camera Toggle */}
              <button
                type="button"
                onClick={handleToggleCamera}
                className={`p-3 rounded-2xl border flex items-center gap-3 transition-all cursor-pointer ${
                  isCameraActive
                    ? 'bg-[#00ff66]/15 border-[#00ff66] text-white shadow-[0_0_15px_rgba(0,255,102,0.2)]'
                    : 'bg-white/[0.03] border-white/10 text-white/70 hover:bg-white/[0.08] hover:text-white'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                    isCameraActive ? 'bg-[#00ff66] text-black' : 'bg-white/5 text-white/60'
                  }`}
                >
                  {isCameraActive ? <Camera className="w-5 h-5" /> : <CameraOff className="w-5 h-5" />}
                </div>
                <div className="text-left">
                  <div className="font-semibold text-xs">Face Camera</div>
                  <div className="text-[10px] text-white/40">{isCameraActive ? 'Active (Front)' : 'Off'}</div>
                </div>
              </button>

              {/* Screen Vision Toggle */}
              <button
                type="button"
                onClick={handleToggleScreen}
                className={`p-3 rounded-2xl border flex items-center gap-3 transition-all cursor-pointer ${
                  isSharingScreen
                    ? 'bg-[#00ff66]/15 border-[#00ff66] text-white shadow-[0_0_15px_rgba(0,255,102,0.2)]'
                    : 'bg-white/[0.03] border-white/10 text-white/70 hover:bg-white/[0.08] hover:text-white'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                    isSharingScreen ? 'bg-[#00ff66] text-black' : 'bg-white/5 text-white/60'
                  }`}
                >
                  <Monitor className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <div className="font-semibold text-xs">Screen Vision</div>
                  <div className="text-[10px] text-white/40">{isSharingScreen ? 'Active' : 'Off'}</div>
                </div>
              </button>
            </div>
          </div>

          {/* Group 2: Spoken Language & Voice Audio */}
          <div>
            <label className="text-[10px] font-telemetry uppercase tracking-wider text-white/50 block mb-2 font-semibold">
              Language & Voice Delivery
            </label>
            <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
              {/* Language Selector */}
              <div>
                <div className="flex items-center gap-1.5 text-white/70 mb-2">
                  <Languages className="w-3.5 h-3.5 text-[#00ff66]" />
                  <span className="text-[11px] font-medium">Spoken Dialect</span>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleSetLanguage('gu-IN')}
                    className={`py-2 px-2 rounded-xl text-center border text-[11px] font-medium transition-all cursor-pointer ${
                      language === 'gu-IN'
                        ? 'bg-[#00ff66]/20 border-[#00ff66] text-[#00ff66] font-semibold shadow'
                        : 'bg-white/5 border-white/10 text-white/60 hover:text-white'
                    }`}
                  >
                    ગુજરાતી
                    <span className="block text-[8px] opacity-70">Kathiyawadi</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSetLanguage('hi-IN')}
                    className={`py-2 px-2 rounded-xl text-center border text-[11px] font-medium transition-all cursor-pointer ${
                      language === 'hi-IN'
                        ? 'bg-[#00ff66]/20 border-[#00ff66] text-[#00ff66] font-semibold shadow'
                        : 'bg-white/5 border-white/10 text-white/60 hover:text-white'
                    }`}
                  >
                    हिंदी
                    <span className="block text-[8px] opacity-70">Hindi</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSetLanguage('en-US')}
                    className={`py-2 px-2 rounded-xl text-center border text-[11px] font-medium transition-all cursor-pointer ${
                      language === 'en-US'
                        ? 'bg-[#00ff66]/20 border-[#00ff66] text-[#00ff66] font-semibold shadow'
                        : 'bg-white/5 border-white/10 text-white/60 hover:text-white'
                    }`}
                  >
                    English
                    <span className="block text-[8px] opacity-70">Global</span>
                  </button>
                </div>
              </div>

              {/* Audio Mute & Chat Log buttons */}
              <div className="flex items-center justify-between pt-2 border-t border-white/5">
                {onToggleVoice && (
                  <button
                    type="button"
                    onClick={onToggleVoice}
                    className="flex items-center gap-2 text-white/70 hover:text-white transition-colors cursor-pointer py-1"
                  >
                    {voiceEnabled ? (
                      <Volume2 className="w-4 h-4 text-[#00ff66]" />
                    ) : (
                      <VolumeX className="w-4 h-4 text-rose-400" />
                    )}
                    <span className="text-xs">{voiceEnabled ? 'Voice Output: On' : 'Voice Output: Muted'}</span>
                  </button>
                )}

                {onOpenTranscript && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenTranscript();
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white text-xs transition-colors cursor-pointer"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-[#00ff66]" />
                    <span>Full Chat Log [{messageCount}]</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Group 3: Advanced Intelligence Modules */}
          <div>
            <label className="text-[10px] font-telemetry uppercase tracking-wider text-white/50 block mb-2 font-semibold">
              Advanced System Modules
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenTools();
                }}
                className="p-3 rounded-2xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 flex items-center gap-2.5 text-left transition-all cursor-pointer"
              >
                <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0">
                  <Zap className="w-4 h-4 text-amber-400" />
                </div>
                <div>
                  <div className="font-semibold text-white text-xs">Tool Nexus</div>
                  <div className="text-[9px] text-white/40">Web & Integrations</div>
                </div>
              </button>

              {onOpenSystemControl && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenSystemControl();
                  }}
                  className="p-3 rounded-2xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 flex items-center gap-2.5 text-left transition-all cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center shrink-0">
                    <SlidersHorizontal className="w-4 h-4 text-blue-400" />
                  </div>
                  <div>
                    <div className="font-semibold text-white text-xs">System Control</div>
                    <div className="text-[9px] text-white/40">OS Capabilities</div>
                  </div>
                </button>
              )}

              {onOpenAgentDev && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenAgentDev();
                  }}
                  className="p-3 rounded-2xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 flex items-center gap-2.5 text-left transition-all cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0">
                    <Cpu className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div>
                    <div className="font-semibold text-white text-xs">Agent Studio</div>
                    <div className="text-[9px] text-white/40">Dev Workflows</div>
                  </div>
                </button>
              )}

              {onOpenEmotion && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenEmotion();
                  }}
                  className="p-3 rounded-2xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 flex items-center gap-2.5 text-left transition-all cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center shrink-0">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                  </div>
                  <div>
                    <div className="font-semibold text-white text-xs">Emotion Radar</div>
                    <div className="text-[9px] text-white/40">Neural Resonance</div>
                  </div>
                </button>
              )}

              {onOpenActivity && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenActivity();
                  }}
                  className="p-3 rounded-2xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 flex items-center gap-2.5 text-left transition-all cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center shrink-0">
                    <Activity className="w-4 h-4 text-cyan-400" />
                  </div>
                  <div>
                    <div className="font-semibold text-white text-xs">Activity Pulse</div>
                    <div className="text-[9px] text-white/40">Proactive Engine</div>
                  </div>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenSettings();
                }}
                className="p-3 rounded-2xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 flex items-center gap-2.5 text-left transition-all cursor-pointer"
              >
                <div className="w-8 h-8 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center shrink-0">
                  <Settings className="w-4 h-4 text-white/80" />
                </div>
                <div>
                  <div className="font-semibold text-white text-xs">Settings & API</div>
                  <div className="text-[9px] text-white/40">Keys & Providers</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
