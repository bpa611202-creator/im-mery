import React from 'react';
import {
  ShieldCheck,
  Volume2,
  VolumeX,
  BookHeart,
  Info,
  Cpu,
  Sparkles,
  Sliders,
  Activity,
  Heart,
  Key,
} from 'lucide-react';
import { EmotionType } from '../types';

interface MeryStatusBarProps {
  resonance: number;
  emotion: EmotionType;
  voiceEnabled: boolean;
  onToggleVoice: () => void;
  onOpenMemory: () => void;
  onOpenIdentity: () => void;
  onOpenSystemControl: () => void;
  onOpenActivity: () => void;
  onOpenEmotion: () => void;
  onOpenApiSettings: () => void;
}

export const MeryStatusBar: React.FC<MeryStatusBarProps> = ({
  resonance,
  emotion,
  voiceEnabled,
  onToggleVoice,
  onOpenMemory,
  onOpenIdentity,
  onOpenSystemControl,
  onOpenActivity,
  onOpenEmotion,
  onOpenApiSettings,
}) => {
  return (
    <header
      id="m4-status-bar"
      className="sticky top-0 z-30 w-full px-4 sm:px-6 py-3 border-b border-[#E7B7A5]/15 bg-[#08070E]/85 backdrop-blur-xl flex items-center justify-between transition-all"
    >
      {/* Left: M4 System & MERY Brand */}
      <div className="flex items-center gap-3">
        <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-[#9D7BFF]/30 via-[#C6A0FF]/20 to-[#E7B7A5]/30 border border-[#E7B7A5]/30 shadow-[0_0_12px_rgba(157,123,255,0.25)]">
          <Cpu className="w-4 h-4 text-[#E7B7A5]" />
          <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[#9D7BFF] animate-pulse" />
        </div>

        <div>
          <div className="flex items-center gap-2">
            <span className="font-display font-semibold text-sm tracking-wider text-[#F3EFFA]">
              M4 SYSTEM
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#9D7BFF]/20 text-[#C6A0FF] border border-[#9D7BFF]/30 font-telemetry font-medium">
              CORE v4.2
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-[#E7B7A5]">
            <Sparkles className="w-3 h-3 text-[#C6A0FF]" />
            <span className="font-medium tracking-wide">MERY</span>
            <span className="text-white/40">·</span>
            <span className="text-white/70 text-[11px]">Companion & Digital Presence</span>
          </div>
        </div>
      </div>

      {/* Center: Resonance & Telemetry */}
      <div className="hidden lg:flex items-center gap-4 px-3.5 py-1.5 rounded-full bg-[#140F22]/70 border border-[#E7B7A5]/20 text-xs">
        <div className="flex items-center gap-1.5 text-[#E7B7A5]">
          <ShieldCheck className="w-3.5 h-3.5 text-[#C6A0FF]" />
          <span className="font-telemetry text-[11px] tracking-wider text-white/80">
            NEURAL SYNC: <strong className="text-[#E7B7A5]">{resonance}%</strong>
          </span>
        </div>
        <div className="h-3 w-[1px] bg-white/15" />
        <button
          onClick={onOpenEmotion}
          className="flex items-center gap-1.5 hover:opacity-80 transition-opacity"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[#9D7BFF]" />
          <span className="text-[11px] font-telemetry text-[#C6A0FF] capitalize">
            Aura: {emotion}
          </span>
        </button>
      </div>

      {/* Right: Quick Controls */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* System Control Dashboard */}
        <button
          id="btn-open-system-control"
          onClick={onOpenSystemControl}
          className="p-2 rounded-full bg-[#161126] border border-[#9D7BFF]/25 text-[#E7B7A5] hover:border-[#E7B7A5]/50 hover:bg-[#201736] transition-all"
          title="System Controller: Apps, Files, Music, Smart Home"
        >
          <Sliders className="w-4 h-4" />
        </button>

        {/* Activity Awareness */}
        <button
          id="btn-open-activity"
          onClick={onOpenActivity}
          className="p-2 rounded-full bg-[#161126] border border-[#9D7BFF]/25 text-emerald-400 hover:border-emerald-400/50 hover:bg-[#201736] transition-all"
          title="Activity Awareness & Autonomous Triggers"
        >
          <Activity className="w-4 h-4" />
        </button>

        {/* Emotion Radar */}
        <button
          id="btn-open-emotion"
          onClick={onOpenEmotion}
          className="p-2 rounded-full bg-[#161126] border border-[#9D7BFF]/25 text-pink-300 hover:border-pink-300/50 hover:bg-[#201736] transition-all"
          title="MERY Emotional Resonance State"
        >
          <Heart className="w-4 h-4" />
        </button>

        {/* Memory & Resonance Drawer */}
        <button
          id="btn-open-memory"
          onClick={onOpenMemory}
          className="p-2 rounded-full bg-[#161126] border border-[#E7B7A5]/20 text-[#C6A0FF] hover:border-[#E7B7A5]/50 hover:bg-[#201736] transition-all"
          title="MERY's Long-Term Memory"
        >
          <BookHeart className="w-4 h-4" />
        </button>

        {/* Identity & Mission Modal */}
        <button
          id="btn-open-identity"
          onClick={onOpenIdentity}
          className="p-2 rounded-full bg-[#161126] border border-[#9D7BFF]/25 text-white/60 hover:text-white hover:border-[#9D7BFF]/60 hover:bg-[#201736] transition-all"
          title="M4 // MERY Architecture Spec"
        >
          <Info className="w-4 h-4" />
        </button>

        {/* API & Provider Settings */}
        <button
          id="btn-open-api-management"
          onClick={onOpenApiSettings}
          className="p-2 rounded-full bg-[#161126] border border-[#9D7BFF]/30 text-[#C6A0FF] hover:border-[#9D7BFF]/80 hover:bg-[#201736] transition-all relative"
          title="API Providers & Integrations (ElevenLabs, Cartesia, Gemini, Search)"
        >
          <Key className="w-4 h-4" />
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400" />
        </button>

        {/* Voice Toggle */}
        <button
          id="btn-toggle-voice"
          onClick={onToggleVoice}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
            voiceEnabled
              ? 'bg-gradient-to-r from-[#9D7BFF]/30 to-[#E7B7A5]/30 text-[#F3EFFA] border border-[#E7B7A5]/40 shadow-[0_0_15px_rgba(231,183,165,0.2)]'
              : 'bg-white/5 text-white/50 border border-white/10 hover:text-white/80'
          }`}
          title={voiceEnabled ? 'Voice output active (MERY Voice)' : 'Voice output muted'}
        >
          {voiceEnabled ? (
            <>
              <Volume2 className="w-3.5 h-3.5 text-[#E7B7A5] animate-pulse" />
              <span className="hidden sm:inline">Voice Active</span>
            </>
          ) : (
            <>
              <VolumeX className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Voice Off</span>
            </>
          )}
        </button>
      </div>
    </header>
  );
};
