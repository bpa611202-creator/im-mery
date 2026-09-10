import React from 'react';
import {
  X,
  Smile,
  User,
  Maximize2,
  Hand,
  Upload,
  RotateCcw,
  Sparkles,
  Heart,
  Brain,
  Compass,
} from 'lucide-react';
import { CameraFramingMode } from './AnimeAvatar3D';
import { EmotionType } from '../types';

interface AvatarControlsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentFraming: CameraFramingMode;
  onSelectFraming: (mode: CameraFramingMode) => void;
  onTriggerWave: () => void;
  onOpenVRMUpload: () => void;
  onResetVRM?: () => void;
  usingCustomVRM?: boolean;
  customVRMTitle?: string;
  currentEmotion?: EmotionType;
  onSelectEmotion?: (emotion: EmotionType) => void;
}

export const AvatarControlsModal: React.FC<AvatarControlsModalProps> = ({
  isOpen,
  onClose,
  currentFraming,
  onSelectFraming,
  onTriggerWave,
  onOpenVRMUpload,
  onResetVRM,
  usingCustomVRM = false,
  customVRMTitle,
  currentEmotion = 'warm',
  onSelectEmotion,
}) => {
  if (!isOpen) return null;

  const emotions: { id: EmotionType; label: string; icon: any; desc: string }[] = [
    { id: 'warm', label: 'Warm & Caring', icon: Heart, desc: 'Friendly, empathetic & close' },
    { id: 'playful', label: 'Playful & Witty', icon: Sparkles, desc: 'Fun Kathiyawadi energy' },
    { id: 'curious', label: 'Curious & Inquisitive', icon: Compass, desc: 'Eager to discover & learn' },
    { id: 'thoughtful', label: 'Focused & Analytical', icon: Brain, desc: 'Deep reasoning & cybersecurity' },
  ];

  return (
    <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      {/* Backdrop click to close */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Modal / Bottom Sheet Card */}
      <div
        className="relative w-full sm:max-w-md bg-[#0e1014] border-t sm:border border-white/15 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[88dvh] flex flex-col z-10 pb-[max(1rem,env(safe-area-inset-bottom))] animate-slideUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Swipe Handle */}
        <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mt-3 mb-1 sm:hidden" />

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-[#00ff66]/15 border border-[#00ff66]/30 flex items-center justify-center">
              <User className="w-4 h-4 text-[#00ff66]" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white tracking-wide">Avatar & Appearance</h3>
              <p className="text-[10px] text-white/50 font-telemetry">Camera Framing & 3D Rig Controls</p>
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

        {/* Body Content */}
        <div className="overflow-y-auto px-5 py-4 space-y-5 text-xs">
          {/* Section 1: Camera Framing */}
          <div>
            <label className="text-[10px] font-telemetry uppercase tracking-wider text-[#00ff66]/80 block mb-2 font-semibold">
              Camera Framing View
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  onSelectFraming('face');
                }}
                className={`p-3 rounded-2xl border flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                  currentFraming === 'face'
                    ? 'bg-[#00ff66]/15 border-[#00ff66] text-white shadow-[0_0_15px_rgba(0,255,102,0.2)]'
                    : 'bg-white/[0.03] border-white/10 text-white/70 hover:bg-white/[0.08] hover:text-white'
                }`}
              >
                <Smile className="w-5 h-5 text-[#00ff66]" />
                <span className="font-semibold text-[11px]">Face Focus</span>
                <span className="text-[9px] text-white/40">Lips & Eyes</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onSelectFraming('portrait');
                }}
                className={`p-3 rounded-2xl border flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                  currentFraming === 'portrait'
                    ? 'bg-[#00ff66]/15 border-[#00ff66] text-white shadow-[0_0_15px_rgba(0,255,102,0.2)]'
                    : 'bg-white/[0.03] border-white/10 text-white/70 hover:bg-white/[0.08] hover:text-white'
                }`}
              >
                <User className="w-5 h-5 text-[#00ff66]" />
                <span className="font-semibold text-[11px]">Half Body</span>
                <span className="text-[9px] text-white/40">Torso & Hair</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onSelectFraming('full_body');
                }}
                className={`p-3 rounded-2xl border flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                  currentFraming === 'full_body'
                    ? 'bg-[#00ff66]/15 border-[#00ff66] text-white shadow-[0_0_15px_rgba(0,255,102,0.2)]'
                    : 'bg-white/[0.03] border-white/10 text-white/70 hover:bg-white/[0.08] hover:text-white'
                }`}
              >
                <Maximize2 className="w-5 h-5 text-[#00ff66]" />
                <span className="font-semibold text-[11px]">Full Body</span>
                <span className="text-[9px] text-white/40">Head to Feet</span>
              </button>
            </div>
          </div>

          {/* Section 2: Quick Gestures */}
          <div>
            <label className="text-[10px] font-telemetry uppercase tracking-wider text-white/50 block mb-2 font-semibold">
              Live Interaction
            </label>
            <button
              type="button"
              onClick={() => {
                onTriggerWave();
                onClose();
              }}
              className="w-full py-2.5 px-4 rounded-xl bg-white/[0.05] hover:bg-[#F5B2C3]/20 border border-white/10 hover:border-[#F5B2C3]/40 flex items-center justify-center gap-2 text-white/90 hover:text-[#F5B2C3] font-medium transition-all cursor-pointer"
            >
              <Hand className="w-4 h-4 text-[#F5B2C3]" />
              <span>Wave Hello to Mery</span>
            </button>
          </div>

          {/* Section 3: VRM 3D Model Switcher */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[10px] font-telemetry uppercase tracking-wider text-white/50 font-semibold">
                VRM 3D Model
              </label>
              <span className="text-[9px] font-telemetry text-[#00ff66]">
                {usingCustomVRM ? 'Custom VRM Active' : 'Default VRM Active'}
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white text-xs font-semibold">
                    {usingCustomVRM ? (customVRMTitle || 'Custom VRM Model') : 'Default VRM Humanoid Avatar'}
                  </p>
                  <p className="text-[10px] text-white/40">
                    {usingCustomVRM
                      ? 'Custom humanoid .VRM model active with full physics & lip-sync'
                      : 'Standard humanoid VRM 1.0 avatar with autonomous blinking & gestures'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenVRMUpload();
                  }}
                  className="flex-1 py-2 px-3 rounded-xl bg-[#00ff66]/15 hover:bg-[#00ff66]/25 border border-[#00ff66]/40 text-[#00ff66] font-medium text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload .VRM</span>
                </button>

                {usingCustomVRM && onResetVRM && (
                  <button
                    type="button"
                    onClick={() => {
                      onResetVRM();
                      onClose();
                    }}
                    className="py-2 px-3 rounded-xl bg-white/5 hover:bg-rose-500/20 border border-white/10 hover:border-rose-500/40 text-white/70 hover:text-rose-300 text-xs flex items-center justify-center gap-1 transition-all cursor-pointer"
                    title="Reset to default VRM model"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Section 4: Expression & Mood */}
          {onSelectEmotion && (
            <div>
              <label className="text-[10px] font-telemetry uppercase tracking-wider text-white/50 block mb-2 font-semibold">
                Companion Persona Mood
              </label>
              <div className="grid grid-cols-2 gap-2">
                {emotions.map((emo) => {
                  const Icon = emo.icon;
                  const isSel = currentEmotion === emo.id;
                  return (
                    <button
                      key={emo.id}
                      type="button"
                      onClick={() => onSelectEmotion(emo.id)}
                      className={`p-2.5 rounded-xl border text-left flex items-start gap-2 transition-all cursor-pointer ${
                        isSel
                          ? 'bg-[#00ff66]/10 border-[#00ff66]/50 text-white'
                          : 'bg-white/[0.02] border-white/5 text-white/70 hover:bg-white/[0.06] hover:text-white'
                      }`}
                    >
                      <Icon className={`w-4 h-4 shrink-0 mt-0.5 ${isSel ? 'text-[#00ff66]' : 'text-white/50'}`} />
                      <div>
                        <div className="text-[11px] font-medium leading-tight">{emo.label}</div>
                        <div className="text-[9px] text-white/40 mt-0.5">{emo.desc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
