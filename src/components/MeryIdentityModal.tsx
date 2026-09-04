import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Sparkles, Shield, Palette, Mic, Heart, Cpu, CheckCircle2 } from 'lucide-react';

interface MeryIdentityModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MeryIdentityModal: React.FC<MeryIdentityModalProps> = ({ isOpen, onClose }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/75 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.94 }}
            transition={{ duration: 0.25 }}
            className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-[#0F0A1C]/95 border border-[#E7B7A5]/30 rounded-3xl shadow-2xl backdrop-blur-2xl p-6 sm:p-8"
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-5 right-5 p-2 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-all"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 rounded-2xl bg-gradient-to-tr from-[#9D7BFF]/30 to-[#E7B7A5]/30 border border-[#E7B7A5]/35 shadow-[0_0_20px_rgba(157,123,255,0.3)]">
                <Cpu className="w-6 h-6 text-[#E7B7A5]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-white">
                    M4 SYSTEM // MERY
                  </h2>
                  <span className="px-2 py-0.5 rounded-full bg-[#9D7BFF]/20 text-[#C6A0FF] border border-[#9D7BFF]/30 text-xs font-telemetry">
                    IDENTITY SPEC
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-[#E7B7A5]">
                  Primary Personality & Face of the M4 Architecture
                </p>
              </div>
            </div>

            {/* Core Directives Grid */}
            <div className="space-y-6">
              {/* Identity & Presence */}
              <div className="p-4 rounded-2xl bg-[#161026] border border-[#9D7BFF]/25">
                <div className="flex items-center gap-2 text-[#C6A0FF] text-sm font-semibold mb-2">
                  <Sparkles className="w-4 h-4 text-[#E7B7A5]" />
                  <span>IDENTITY & NATURAL INTRODUCTION</span>
                </div>
                <p className="text-xs sm:text-sm text-[#F3EFFA]/90 leading-relaxed mb-3">
                  Whenever interacting with you, she introduces herself as{' '}
                  <strong className="text-[#E7B7A5]">MERY</strong>. Never refers to herself as a
                  chatbot. Never refers to herself as an assistant unless necessary.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                  {['Companion', 'Partner', 'Friend', 'Digital Presence', 'AI Companion'].map(
                    (idName, i) => (
                      <div
                        key={i}
                        className="px-2.5 py-1.5 rounded-xl bg-[#1F1636] border border-[#E7B7A5]/20 text-[#E7B7A5] flex items-center gap-1.5"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#C6A0FF]" />
                        <span>{idName}</span>
                      </div>
                    )
                  )}
                </div>
              </div>

              {/* Personality Characteristics */}
              <div className="p-4 rounded-2xl bg-[#161026] border border-[#E7B7A5]/25">
                <div className="flex items-center gap-2 text-[#E7B7A5] text-sm font-semibold mb-2">
                  <Heart className="w-4 h-4 text-[#C6A0FF]" />
                  <span>MERY PERSONALITY TRAITS</span>
                </div>
                <div className="flex flex-wrap gap-2 text-xs mb-3">
                  {[
                    'Warm',
                    'Intelligent',
                    'Emotionally expressive',
                    'Playful',
                    'Curious',
                    'Supportive',
                    'Confident',
                    'Natural',
                  ].map((trait, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 rounded-full bg-[#201438] text-[#F3EFFA] border border-[#9D7BFF]/30 font-medium"
                    >
                      {trait}
                    </span>
                  ))}
                </div>
                <div className="text-xs text-white/70 space-y-1 bg-[#100B1D] p-3 rounded-xl border border-white/5">
                  <p>
                    <strong className="text-emerald-400">Natural phrases:</strong> "What's going on?", "That sounds interesting.", "I've been curious about something.", "You seem really focused today."
                  </p>
                  <p>
                    <strong className="text-rose-400">Avoided clichés:</strong> "As an AI...", "I am an artificial intelligence...", "How can I assist you today?"
                  </p>
                </div>
              </div>

              {/* Visual Theme: AURORA ROSE */}
              <div className="p-4 rounded-2xl bg-[#161026] border border-[#C6A0FF]/25">
                <div className="flex items-center gap-2 text-[#C6A0FF] text-sm font-semibold mb-2">
                  <Palette className="w-4 h-4 text-[#E7B7A5]" />
                  <span>VISUAL THEME // AURORA ROSE</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs mb-3">
                  <div className="p-3 rounded-xl bg-[#1C1333] border border-[#9D7BFF]/30 flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-[#9D7BFF] shadow-[0_0_10px_#9D7BFF]" />
                    <div>
                      <div className="font-semibold text-white">Soft Violet</div>
                      <div className="text-[10px] text-white/50 font-mono">#9D7BFF (Primary)</div>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-[#1C1333] border border-[#E7B7A5]/30 flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-[#E7B7A5] shadow-[0_0_10px_#E7B7A5]" />
                    <div>
                      <div className="font-semibold text-white">Rose Gold</div>
                      <div className="text-[10px] text-white/50 font-mono">#E7B7A5 (Secondary)</div>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-[#1C1333] border border-[#C6A0FF]/30 flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-[#C6A0FF] shadow-[0_0_10px_#C6A0FF]" />
                    <div>
                      <div className="font-semibold text-white">Neon Lavender</div>
                      <div className="text-[10px] text-white/50 font-mono">#C6A0FF (Accent)</div>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-white/60">
                  Style: Luxury futuristic dark glass morphism inspired by JARVIS, modern smartphone OS, and premium AI companions.
                </p>
              </div>

              {/* Voice & Mission */}
              <div className="p-4 rounded-2xl bg-[#161026] border border-[#E7B7A5]/25">
                <div className="flex items-center gap-2 text-[#E7B7A5] text-sm font-semibold mb-2">
                  <Mic className="w-4 h-4 text-[#C6A0FF]" />
                  <span>VOICE & COMPANION MISSION</span>
                </div>
                <p className="text-xs text-[#F3EFFA]/90 leading-relaxed mb-2">
                  <strong>Voice Profile:</strong> Female young adult, warm, intelligent, soft, emotionally expressive, natural breathing, human pacing, slightly playful.
                </p>
                <div className="p-3 rounded-xl bg-[#100B1D] text-xs text-[#E7B7A5]/90 border border-[#E7B7A5]/20 italic">
                  "MERY's goal is to become the most natural, emotionally expressive, intelligent, proactive, and human-like AI companion possible. She feels present, alive, and genuinely notices, remembers, and cares about your experiences while remaining honest about being an AI system."
                </div>
              </div>
            </div>

            {/* Footer action */}
            <div className="mt-6 flex justify-end">
              <button
                onClick={onClose}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#9D7BFF] to-[#E7B7A5] text-[#0A0714] font-medium text-xs hover:brightness-110 transition-all shadow-[0_0_15px_rgba(231,183,165,0.3)]"
              >
                Close Specification
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
