import React, { useState, useRef } from 'react';
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
import { motion, AnimatePresence } from 'motion/react';
import { EmotionType } from '../types';
import { getEmotionMeta, emotionEngine } from '../utils/emotionEngine';

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
  emotion: propEmotion,
  state = 'disconnected',
}) => {
  const [isTooltipOpen, setIsTooltipOpen] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const activeEmotion = propEmotion || emotionEngine.getState().dominant || 'warm';
  const emotionMeta = getEmotionMeta(activeEmotion);

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsTooltipOpen(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setIsTooltipOpen(false);
    }, 120);
  };

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
      id="mery-status-bar"
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

        {/* Status Telemetry Badge / Current State Badge */}
        <div
          id="mery-status-badge"
          tabIndex={0}
          role="status"
          aria-label={`Current State: ${statusLabel}. Current Emotion: ${emotionMeta.fullName}`}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onFocus={() => setIsTooltipOpen(true)}
          onBlur={() => setIsTooltipOpen(false)}
          onClick={() => setIsTooltipOpen((prev) => !prev)}
          className="stat-group relative flex flex-col items-end gap-0.5 cursor-pointer select-none group"
        >
          <span className="label font-telemetry text-[9px] tracking-[0.4em] uppercase text-[#00A3FF] flex items-center gap-1">
            <Activity className="w-2.5 h-2.5" />
            Status
          </span>
          <span className="font-telemetry text-xs text-white/90 tracking-wider group-hover:text-white transition-colors">
            {statusLabel}
          </span>

          {/* Subtle pop-up tooltip displaying the full name of the current emotion */}
          <AnimatePresence>
            {isTooltipOpen && (
              <motion.div
                role="tooltip"
                initial={{ opacity: 0, y: -4, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.96 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                className="absolute top-full right-0 mt-2 px-3 py-2 rounded-xl bg-[#0b0d12]/95 backdrop-blur-xl border border-white/[0.12] shadow-[0_12px_32px_rgba(0,0,0,0.65)] z-50 whitespace-nowrap pointer-events-none flex flex-col items-end gap-0.5 min-w-[150px]"
              >
                <div className="flex items-center gap-1.5 text-[9px] font-telemetry uppercase tracking-wider text-white/45">
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: emotionMeta.color }}
                  />
                  <span>CURRENT EMOTION</span>
                </div>
                <div className="text-xs font-semibold text-white tracking-wide">
                  {emotionMeta.fullName}
                </div>
                <div className="text-[9px] text-white/50 font-normal">
                  {emotionMeta.description}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
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

