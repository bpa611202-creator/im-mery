import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Mic, Volume2, Sparkles, Radio, Keyboard, VolumeX, Flame, Zap, Languages } from 'lucide-react';
import { EmotionType } from '../types';
import { stateManager, SpokenLanguage } from '../modules/StateManager';

interface VoiceActionNexusProps {
  state: 'idle' | 'listening' | 'thinking' | 'speaking';
  emotion: EmotionType;
  fullDuplexActive: boolean;
  onToggleFullDuplex: () => void;
  wakeWordMode: boolean;
  onToggleWakeWordMode: () => void;
  isWokenUp: boolean;
  onInterruptSpeech: () => void;
  onTriggerSpokenPrompt: (prompt: string) => void;
  onOpenTextInput: () => void;
  voiceMuted: boolean;
  onToggleVoiceMuted: () => void;
  onStartFullDuplex: () => void;
}

export const VoiceActionNexus: React.FC<VoiceActionNexusProps> = ({
  state,
  emotion,
  fullDuplexActive,
  onToggleFullDuplex,
  wakeWordMode,
  onToggleWakeWordMode,
  isWokenUp,
  onInterruptSpeech,
  onTriggerSpokenPrompt,
  onOpenTextInput,
  voiceMuted,
  onToggleVoiceMuted,
  onStartFullDuplex,
}) => {
  const [language, setLanguage] = useState<SpokenLanguage>(stateManager.getLanguage());

  useEffect(() => {
    const unsub = stateManager.onLanguageChange((lang) => {
      setLanguage(lang);
    });
    return unsub;
  }, []);

  const handleToggleLang = () => {
    const next = language === 'gu-IN' ? 'en-US' : 'gu-IN';
    stateManager.setLanguage(next);
  };

  const conversationalSparks = [
    "ગુજરાતીમાં બોલો",
    "કેમ છો, મેરી?",
    "Hey MERY.",
    "I'm working on a new TECH GPT video.",
    "What's on your mind right now?",
  ];

  return (
    <div id="voice-action-nexus" className="w-full max-w-3xl mx-auto px-4 sm:px-6 pb-6 pt-2">
      <div className="flex flex-col items-center justify-center">
        {/* Main Acoustic Presence Nexus (No button pressing required to chat) */}
        <div className="relative flex items-center justify-center">
          {/* Animated concentric acoustic rings representing always-ready presence */}
          {fullDuplexActive && state === 'listening' && (
            <>
              <motion.div
                animate={{ scale: [1, 1.5, 1.8], opacity: [0.7, 0.25, 0] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: 'easeOut' }}
                className="absolute w-28 h-28 rounded-full border-2 border-emerald-400/50 pointer-events-none"
              />
              <motion.div
                animate={{ scale: [1, 1.3, 1.5], opacity: [0.85, 0.35, 0] }}
                transition={{ duration: 1.6, repeat: Infinity, delay: 0.35, ease: 'easeOut' }}
                className="absolute w-28 h-28 rounded-full border border-[#9D7BFF]/60 pointer-events-none"
              />
            </>
          )}

          {state === 'speaking' && (
            <>
              <motion.div
                animate={{ scale: [1, 1.4, 1.65], opacity: [0.7, 0.2, 0] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut' }}
                className="absolute w-28 h-28 rounded-full border-2 border-[#E7B7A5]/60 pointer-events-none"
              />
              <motion.div
                animate={{ scale: [1, 1.2, 1.4], opacity: [0.5, 0.15, 0] }}
                transition={{ duration: 1.8, repeat: Infinity, delay: 0.45, ease: 'easeOut' }}
                className="absolute w-28 h-28 rounded-full border border-[#C6A0FF]/40 pointer-events-none"
              />
            </>
          )}

          {/* Presence Orb Button: Optional manual tap to interrupt or mute, but not needed to speak */}
          <button
            id="btn-voice-presence-orb"
            onClick={() => {
              if (!fullDuplexActive) {
                onStartFullDuplex();
              } else if (state === 'speaking') {
                onInterruptSpeech();
              } else {
                onToggleFullDuplex();
              }
            }}
            className={`relative z-10 w-20 h-20 sm:w-24 sm:h-24 rounded-full flex flex-col items-center justify-center shadow-2xl transition-all duration-300 transform active:scale-95 group ${
              !fullDuplexActive
                ? 'bg-[#150E28] text-white/50 border border-white/20 hover:border-emerald-400/60 shadow-[0_0_20px_rgba(0,0,0,0.5)]'
                : state === 'listening'
                ? 'bg-gradient-to-tr from-emerald-500 via-[#9D7BFF] to-[#E7B7A5] text-[#07060D] shadow-[0_0_45px_rgba(52,211,153,0.65)] border-2 border-white'
                : state === 'speaking'
                ? 'bg-gradient-to-tr from-[#9D7BFF] via-[#E7B7A5] to-[#C6A0FF] text-[#07060D] shadow-[0_0_45px_rgba(231,183,165,0.7)] border-2 border-[#E7B7A5]'
                : state === 'thinking'
                ? 'bg-[#1D1433] text-[#E7B7A5] border border-[#9D7BFF]/60 shadow-[0_0_25px_rgba(157,123,255,0.35)]'
                : 'bg-gradient-to-tr from-[#1D1436] via-[#2A1D4D] to-[#1F1738] text-[#E7B7A5] border border-[#E7B7A5]/40 shadow-[0_0_30px_rgba(157,123,255,0.25)]'
            }`}
            title={
              !fullDuplexActive
                ? 'Click to activate Always-Ready Voice'
                : state === 'speaking'
                ? 'MERY is speaking... Speak aloud or click to interrupt'
                : 'Full-duplex listening active. Speak freely!'
            }
          >
            {!fullDuplexActive ? (
              <>
                <Zap className="w-8 h-8 text-emerald-400 group-hover:scale-110 transition-transform" />
                <span className="text-[10px] font-telemetry font-bold text-emerald-300 uppercase mt-0.5">
                  Activate
                </span>
              </>
            ) : state === 'listening' ? (
              <>
                <Mic className="w-8 h-8 sm:w-9 sm:h-9 animate-bounce text-white" />
                <span className="text-[10px] font-telemetry font-bold text-white uppercase mt-0.5">
                  Listening
                </span>
              </>
            ) : state === 'speaking' ? (
              <>
                <Volume2 className="w-8 h-8 sm:w-9 sm:h-9 animate-pulse text-[#07060D]" />
                <span className="text-[10px] font-telemetry font-bold text-[#07060D] uppercase mt-0.5">
                  Speaking
                </span>
              </>
            ) : state === 'thinking' ? (
              <>
                <Sparkles className="w-7 h-7 sm:w-8 sm:h-8 animate-spin text-[#E7B7A5]" />
                <span className="text-[10px] font-telemetry text-[#E7B7A5] uppercase mt-0.5">
                  Reflecting
                </span>
              </>
            ) : (
              <>
                <Radio className="w-8 h-8 sm:w-9 sm:h-9 text-emerald-400 animate-pulse" />
                <span className="text-[10px] font-telemetry font-medium text-emerald-300 uppercase mt-0.5">
                  Ready
                </span>
              </>
            )}
          </button>
        </div>

        {/* Status Callout Badge */}
        <div className="mt-3.5 text-center">
          <p className="text-xs sm:text-sm font-medium text-[#F3EFFA] tracking-wide">
            {!fullDuplexActive ? (
              <span className="text-emerald-300 font-semibold cursor-pointer" onClick={onStartFullDuplex}>
                Tap anywhere or click "Activate" to begin Full-Duplex Voice
              </span>
            ) : state === 'listening' ? (
              'Hearing your voice... Just speak naturally without pressing any buttons'
            ) : state === 'speaking' ? (
              <span className="text-[#E7B7A5]">
                MERY is speaking aloud. <strong>Speak aloud anytime to interrupt</strong>
              </span>
            ) : state === 'thinking' ? (
              'MERY is reflecting...'
            ) : wakeWordMode && !isWokenUp ? (
              <span className="text-[#C6A0FF]">
                Passive listening for wake word: Say <strong>"Hey MERY"</strong> or <strong>"MERY"</strong>
              </span>
            ) : (
              'Full-duplex mic open. Speak anytime — no button press needed'
            )}
          </p>
        </div>

        {/* Voice Control Modes (Always-Ready vs Wake Word) */}
        <div className="flex flex-wrap items-center justify-center gap-2.5 mt-4">
          {/* Always-Ready Full-Duplex Status */}
          <button
            id="btn-toggle-full-duplex"
            onClick={onToggleFullDuplex}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-telemetry font-medium transition-all ${
              fullDuplexActive
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 shadow-[0_0_15px_rgba(52,211,153,0.2)]'
                : 'bg-[#150F26] text-white/50 border border-white/10 hover:text-white/80'
            }`}
            title="Always-Ready mic: automatically hears and answers you"
          >
            <Radio className={`w-3.5 h-3.5 ${fullDuplexActive ? 'text-emerald-400 animate-pulse' : 'text-white/40'}`} />
            <span>Full-Duplex: <strong>{fullDuplexActive ? 'ALWAYS-READY' : 'PAUSED'}</strong></span>
          </button>

          {/* Spoken Language Mode */}
          <button
            id="btn-nexus-toggle-language"
            onClick={handleToggleLang}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-telemetry transition-all ${
              language === 'gu-IN'
                ? 'bg-gradient-to-r from-amber-500/20 to-purple-600/20 text-amber-200 border border-amber-400/40 shadow-[0_0_12px_rgba(251,191,36,0.15)]'
                : 'bg-[#150F26] text-white/60 border border-white/10 hover:text-white'
            }`}
            title="Toggle Live Language: ગુજરાતી (Gujarati) / English"
          >
            <Languages className="w-3.5 h-3.5 text-amber-400" />
            <span>ભાષા: <strong>{language === 'gu-IN' ? 'ગુજરાતી' : 'English'}</strong></span>
          </button>

          {/* Audio Output Mute */}
          <button
            id="btn-nexus-toggle-voice"
            onClick={onToggleVoiceMuted}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-telemetry transition-all ${
              !voiceMuted
                ? 'bg-[#1A1230] text-[#E7B7A5] border border-[#E7B7A5]/25'
                : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
            }`}
            title={voiceMuted ? 'Voice is muted' : 'Voice is active'}
          >
            {!voiceMuted ? (
              <>
                <Volume2 className="w-3.5 h-3.5 text-[#C6A0FF]" />
                <span>Voice Audio On</span>
              </>
            ) : (
              <>
                <VolumeX className="w-3.5 h-3.5" />
                <span>Voice Audio Muted</span>
              </>
            )}
          </button>

          {/* Text Input Fallback */}
          <button
            id="btn-open-text-input"
            onClick={onOpenTextInput}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#130E22] border border-white/10 text-white/50 hover:text-white hover:border-[#9D7BFF]/40 text-xs transition-all"
            title="Quiet mode: type a message instead"
          >
            <Keyboard className="w-3.5 h-3.5" />
            <span>Quiet Mode</span>
          </button>
        </div>

        {/* Quick Conversational Starters */}
        <div className="mt-5 w-full">
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-[#E7B7A5]/75 font-telemetry mb-2">
            <Sparkles className="w-3 h-3 text-[#C6A0FF]" />
            <span>SAY ALOUD (NO CLICKS NEEDED):</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {conversationalSparks.map((spark, idx) => (
              <button
                key={idx}
                id={`spoken-spark-${idx}`}
                onClick={() => onTriggerSpokenPrompt(spark)}
                className="text-xs px-3 py-1 rounded-full bg-[#150F28]/70 border border-[#E7B7A5]/20 text-[#F3EFFA]/80 hover:text-white hover:border-[#E7B7A5]/60 hover:bg-[#23173D] transition-all shadow-sm"
              >
                "{spark}"
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
