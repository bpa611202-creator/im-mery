import React from 'react';
import {
  Activity,
  Cpu,
  Sparkles,
  SlidersHorizontal,
  Volume2,
  VolumeX,
  Database,
  Smile,
  Code2,
} from 'lucide-react';
import { EmotionType } from '../types';

interface MeryStatusBarProps {
  resonance?: number;
  emotion?: EmotionType;
  voiceEnabled: boolean;
  onToggleVoice: () => void;
  onOpenMemory?: () => void;
  onOpenIdentity?: () => void;
  onOpenSystemControl?: () => void;
  onOpenActivity?: () => void;
  onOpenEmotion?: () => void;
  onOpenApiSettings: () => void;
  onOpenAgentDev?: () => void;
  state?: string;
}

export const MeryStatusBar: React.FC<MeryStatusBarProps> = ({
  voiceEnabled,
  onToggleVoice,
  onOpenMemory,
  onOpenEmotion,
  onOpenApiSettings,
  onOpenAgentDev,
  state = 'disconnected',
}) => {
  const statusLabel =
    state === 'speaking'
      ? 'AUDIO_STREAM'
      : state === 'listening'
      ? 'MIC_LISTEN'
      : state === 'thinking'
      ? 'NEURAL_THINK'
      : state === 'connecting'
      ? 'SYNCING...'
      : 'READY_STATE';

  return (
    <header
      id="m4-status-bar"
      className="w-full px-6 sm:px-12 pt-5 sm:pt-7 pb-3 sm:pb-4 flex items-center justify-between z-30 select-none pointer-events-auto border-b border-white/[0.03]"
    >
      {/* Architecture & Title */}
      <div className="stat-group flex items-center gap-3">
        <div className="w-9 h-9 bg-white/[0.03] border border-[#00A3FF]/40 flex items-center justify-center text-[#00A3FF] shadow-[0_0_15px_rgba(0,163,255,0.25)]">
          <Sparkles className="w-4 h-4 animate-pulse" />
        </div>
        <div className="flex flex-col items-start">
          <span className="label font-telemetry text-[9px] tracking-[0.4em] uppercase text-[#00A3FF]">
            Architecture
          </span>
          <h1 className="font-brand font-extrabold text-lg sm:text-xl tracking-[0.2em] text-white flex items-center gap-2">
            I'M MERY
            <span className="w-1.5 h-1.5 rounded-full bg-[#00A3FF] inline-block animate-ping" />
          </h1>
        </div>
      </div>

      {/* Header Quick Icon Controls & System Status */}
      <div className="sys-status flex items-center gap-4 sm:gap-7">
        {/* Quick Icon Control Strip */}
        <div className="hidden md:flex items-center gap-1.5 p-1 bg-white/[0.02] border border-white/[0.06]">
          <button
            id="hdr-btn-voice"
            onClick={onToggleVoice}
            className="p-1.5 text-white/60 hover:text-white hover:bg-white/[0.06] transition-colors"
            title={voiceEnabled ? 'Mute Voice Output' : 'Enable Voice Output'}
          >
            {voiceEnabled ? (
              <Volume2 className="w-3.5 h-3.5 text-[#00A3FF]" />
            ) : (
              <VolumeX className="w-3.5 h-3.5 text-white/30" />
            )}
          </button>
          {onOpenMemory && (
            <button
              id="hdr-btn-memory"
              onClick={onOpenMemory}
              className="p-1.5 text-white/60 hover:text-white hover:bg-white/[0.06] transition-colors"
              title="Open Memory Vault"
            >
              <Database className="w-3.5 h-3.5" />
            </button>
          )}
          {onOpenEmotion && (
            <button
              id="hdr-btn-emotion"
              onClick={onOpenEmotion}
              className="p-1.5 text-white/60 hover:text-white hover:bg-white/[0.06] transition-colors"
              title="Emotion Radar"
            >
              <Smile className="w-3.5 h-3.5" />
            </button>
          )}
          {onOpenAgentDev && (
            <button
              id="hdr-btn-agentdev"
              onClick={onOpenAgentDev}
              className="p-1.5 text-white/60 hover:text-white hover:bg-white/[0.06] transition-colors"
              title="Agent Dev Studio"
            >
              <Code2 className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            id="hdr-btn-settings"
            onClick={onOpenApiSettings}
            className="p-1.5 text-white/60 hover:text-white hover:bg-white/[0.06] transition-colors"
            title="System Configuration & API Keys"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Status Telemetry Badge */}
        <div className="stat-group flex flex-col items-end gap-0.5">
          <span className="label font-telemetry text-[9px] tracking-[0.4em] uppercase text-[#00A3FF] flex items-center gap-1">
            <Activity className="w-2.5 h-2.5" />
            Status
          </span>
          <span className="font-telemetry text-xs text-white/90 tracking-wider">
            {statusLabel}
          </span>
        </div>

        {/* Core Telemetry Badge */}
        <div className="stat-group hidden sm:flex flex-col items-end gap-0.5">
          <span className="label font-telemetry text-[9px] tracking-[0.4em] uppercase text-[#00A3FF] flex items-center gap-1">
            <Cpu className="w-2.5 h-2.5" />
            Core
          </span>
          <span className="font-telemetry text-xs text-[#00A3FF] font-semibold tracking-wider">
            ACTIVE_NEURAL
          </span>
        </div>
      </div>
    </header>
  );
};

