import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Heart,
  Sparkles,
  Smile,
  Compass,
  AlertCircle,
  Award,
  Brain,
  Mic,
  Activity,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  Minus,
  Sliders,
} from 'lucide-react';
import { emotionEngine, ALL_EMOTION_STATES } from '../utils/emotionEngine';
import { EmotionState, EmotionType, UserEmotionType } from '../types';

interface EmotionRadarModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSetDominantEmotion: (emotion: EmotionType) => void;
}

export const EmotionRadarModal: React.FC<EmotionRadarModalProps> = ({
  isOpen,
  onClose,
  onSetDominantEmotion,
}) => {
  const [state, setState] = useState<EmotionState>(emotionEngine.getState());
  const [activeTab, setActiveTab] = useState<'multimodal' | 'vocal' | 'vectors'>('multimodal');

  useEffect(() => {
    const unsub = emotionEngine.subscribe((newState) => {
      setState(newState);
    });
    return unsub;
  }, []);

  const userEmotion = state.userEmotion || emotionEngine.getUserEmotion();
  const voiceMod = state.voiceModulation || emotionEngine.getVoiceModulation();
  const strategy = state.responseStrategy || emotionEngine.getResponseStrategy();

  const emotionList: { name: EmotionType; label: string; icon: any; color: string; desc: string }[] = [
    { name: 'warm', label: 'Warmth', icon: Heart, color: 'text-amber-300', desc: 'Gentle, reassuring, calm, grounded frequency.' },
    { name: 'curious', label: 'Curiosity', icon: Compass, color: 'text-sky-300', desc: 'Inquisitive pitch lift, interested in user ideas.' },
    { name: 'playful', label: 'Playfulness', icon: Smile, color: 'text-pink-300', desc: 'Lighter cadence, witty humor, natural banter.' },
    { name: 'thoughtful', label: 'Thoughtfulness', icon: Brain, color: 'text-indigo-300', desc: 'Deep reflection, slower rate, meditative pacing.' },
    { name: 'supportive', label: 'Support', icon: Award, color: 'text-emerald-300', desc: 'Protective, encouraging, high empathy.' },
    { name: 'excited', label: 'Excitement', icon: Sparkles, color: 'text-violet-300', desc: 'Elevated pitch, faster energetic pace, passionate.' },
    { name: 'concerned', label: 'Attentive', icon: AlertCircle, color: 'text-rose-300', desc: 'Caring, attentive tone, notices user strain or stress.' },
  ];

  const getTrendIcon = (trend: string) => {
    if (trend === 'increasing') return <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />;
    if (trend === 'decreasing') return <TrendingDown className="w-3.5 h-3.5 text-rose-400" />;
    return <Minus className="w-3.5 h-3.5 text-amber-400" />;
  };

  const getIntensityLabel = (val: number) => {
    if (val < 0.15) return 'Neutral';
    if (val < 0.35) return 'Slight';
    if (val < 0.65) return 'Moderate';
    if (val < 0.85) return 'Strong';
    return 'Very Strong';
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div id="emotion-radar-modal" className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-md"
          />

          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="relative w-full max-w-2xl max-h-[90vh] bg-[#020204]/95 border border-[#00A3FF]/25 rounded-3xl p-5 sm:p-7 shadow-[0_20px_60px_rgba(0,0,0,0.8),0_0_40px_rgba(0,163,255,0.15)] backdrop-blur-2xl flex flex-col z-10 overflow-y-auto text-[#FFFFFF]"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-[#00A3FF]/15">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-gradient-to-br from-[#0066FF]/30 to-[#00A3FF]/30 border border-[#00A3FF]/30 text-[#00A3FF]">
                  <Brain className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-display font-semibold text-lg text-[#FFFFFF]">
                    MERY Emotional Intelligence Engine
                  </h2>
                  <p className="text-xs text-[#00A3FF]">
                    Multimodal emotional awareness, intensity matching & prosody modulation
                  </p>
                </div>
              </div>

              <button
                id="btn-close-emotion-radar"
                onClick={onClose}
                className="p-2 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Navigation tabs */}
            <div className="flex items-center gap-2 mt-4 pb-2 border-b border-white/5">
              <button
                id="tab-multimodal"
                onClick={() => setActiveTab('multimodal')}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                  activeTab === 'multimodal'
                    ? 'bg-[#0066FF]/30 text-white border border-[#00A3FF]/40'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                Multimodal Detection
              </button>
              <button
                id="tab-vocal"
                onClick={() => setActiveTab('vocal')}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                  activeTab === 'vocal'
                    ? 'bg-[#0066FF]/30 text-white border border-[#00A3FF]/40'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                Voice Prosody
              </button>
              <button
                id="tab-vectors"
                onClick={() => setActiveTab('vectors')}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                  activeTab === 'vectors'
                    ? 'bg-[#0066FF]/30 text-white border border-[#00A3FF]/40'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                Resonance Vectors
              </button>
            </div>

            {/* Tab 1: Multimodal Detection & Response Strategy */}
            {activeTab === 'multimodal' && (
              <div className="space-y-4 my-4">
                {/* User State & Strategy Card */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-4 rounded-2xl bg-[#081426]/80 border border-[#0066FF]/25">
                    <div className="text-[11px] font-telemetry tracking-wider text-[#00A3FF] mb-1 flex items-center justify-between">
                      <span>DETECTED USER STATE</span>
                      <span className="flex items-center gap-1 text-white/70">
                        {getTrendIcon(userEmotion.trend)}
                        <span className="capitalize text-[10px]">{userEmotion.trend}</span>
                      </span>
                    </div>
                    <div className="text-xl font-display font-semibold text-white capitalize flex items-center gap-2 mt-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#0066FF] animate-pulse" />
                      {userEmotion.primary}
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-white/10 text-xs font-telemetry text-white/70">
                      <div>
                        <div className="text-[10px] text-white/40">CONFIDENCE</div>
                        <div className="font-semibold text-[#00A3FF]">
                          {(userEmotion.confidence * 100).toFixed(0)}%
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-white/40">INTENSITY</div>
                        <div className="font-semibold text-white">
                          {getIntensityLabel(userEmotion.intensity)} ({(userEmotion.intensity * 100).toFixed(0)}%)
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#081426]/80 border border-[#00A3FF]/25">
                    <div className="text-[11px] font-telemetry tracking-wider text-[#00A3FF] mb-1 flex items-center justify-between">
                      <span>RESPONSE STRATEGY</span>
                      <span className="text-[10px] text-emerald-400">Decoupled</span>
                    </div>
                    <div className="text-lg font-display font-semibold text-emerald-300 mt-1">
                      {strategy}
                    </div>
                    <p className="text-xs text-white/60 mt-1.5 leading-relaxed">
                      {strategy === 'SUPPORTIVE' && 'Empathetic presence, warm listening, gentle pacing.'}
                      {strategy === 'EMPATHETIC' && 'Authentic validation without clichés. Softer delivery.'}
                      {strategy === 'CALM' && 'De-escalating, grounded cadence, concise and non-defensive.'}
                      {strategy === 'EXCITED' && 'Matching positive energy naturally without exaggeration.'}
                      {strategy === 'PLAYFUL' && 'Light cadence, witty banter, witty natural humor.'}
                      {strategy === 'CURIOUS' && 'Inquisitive pitch lift, interested in user ideas.'}
                      {strategy === 'SOLUTION_FOCUSED' && 'Clarity, structured guidance, calm troubleshooting.'}
                      {strategy === 'REASSURING' && 'Patient, calming reassurance, steady composure.'}
                      {strategy === 'NEUTRAL' && 'Standard friendly demeanor, avoiding unneeded over-emoting.'}
                      {strategy === 'SERIOUS' && 'Direct, focused, professional respect.'}
                    </p>
                  </div>
                </div>

                {/* Topic context / concern if detected */}
                {(userEmotion.topicContext || userEmotion.userConcern) && (
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-xs flex items-center justify-between">
                    <div>
                      <span className="text-[#00A3FF] font-semibold">Active Context:</span>{' '}
                      <span className="text-white/80">{userEmotion.topicContext || 'General Dialogue'}</span>
                      {userEmotion.userConcern && (
                        <span className="text-white/50 block text-[11px] mt-0.5">
                          Tracking concern: {userEmotion.userConcern}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] font-telemetry px-2 py-0.5 rounded-full bg-[#0066FF]/20 text-[#38BDF8]">
                      Continuity Active
                    </span>
                  </div>
                )}

                {/* 13 Emotion Probability Distribution */}
                <div>
                  <div className="text-xs font-telemetry tracking-wider text-white/60 mb-2.5 flex items-center justify-between">
                    <span>MULTIMODAL PROBABILITY DISTRIBUTION (13 STATES)</span>
                    <span className="text-[10px] text-white/40">Softmax Normalization</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {ALL_EMOTION_STATES.map((emo) => {
                      const prob = userEmotion.possibleEmotions?.[emo] || 0;
                      const isPrimary = userEmotion.primary === emo;
                      return (
                        <div
                          key={emo}
                          className={`p-2.5 rounded-xl border transition-all ${
                            isPrimary
                              ? 'bg-[#0066FF]/25 border-[#00A3FF] text-white'
                              : 'bg-white/5 border-white/5 text-white/70'
                          }`}
                        >
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="capitalize font-medium">{emo}</span>
                            <span className="font-telemetry text-[11px] text-[#00A3FF]">
                              {(prob * 100).toFixed(0)}%
                            </span>
                          </div>
                          <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all duration-500 ${
                                isPrimary ? 'bg-[#00A3FF]' : 'bg-[#0066FF]/60'
                              }`}
                              style={{ width: `${Math.min(100, prob * 100)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Safety & Non-Diagnostic Guarantee */}
                <div className="p-3.5 rounded-2xl bg-emerald-950/20 border border-emerald-500/20 flex items-start gap-2.5 text-xs text-emerald-200/90">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                  <p className="leading-relaxed text-[11px]">
                    <strong className="text-emerald-300">Autonomy & Non-Diagnostic Guarantee:</strong> MERY's
                    emotional estimation is a conversational guide, never a medical or psychological diagnosis.
                    She respects your autonomy, never manipulates emotions, and never uses fake empathy.
                  </p>
                </div>
              </div>
            )}

            {/* Tab 2: Voice Prosody Modulation */}
            {activeTab === 'vocal' && (
              <div className="space-y-4 my-4">
                <div className="p-4 rounded-2xl bg-[#081426]/80 border border-[#0066FF]/20">
                  <div className="text-[11px] font-telemetry tracking-wider text-[#00A3FF] mb-2 flex items-center justify-between">
                    <span>ACTIVE VOICE PROSODY MODULATION</span>
                    <span className="text-[10px] text-white/50">Provider-Agnostic</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                    <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                      <div className="text-[10px] text-white/40">PITCH</div>
                      <div className="text-base font-telemetry font-semibold text-[#00A3FF]">
                        {voiceMod.pitch.toFixed(2)}x
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                      <div className="text-[10px] text-white/40">RATE (SPEED)</div>
                      <div className="text-base font-telemetry font-semibold text-[#38BDF8]">
                        {voiceMod.rate.toFixed(2)}x
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                      <div className="text-[10px] text-white/40">STABILITY</div>
                      <div className="text-base font-telemetry font-semibold text-emerald-300">
                        {voiceMod.stability.toFixed(2)}
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                      <div className="text-[10px] text-white/40">DELIVERY TONE</div>
                      <div className="text-base font-telemetry font-semibold text-amber-300 capitalize">
                        {voiceMod.deliveryTone}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Overrides */}
                <div>
                  <div className="text-xs font-telemetry tracking-wider text-white/60 mb-2">
                    NUDGE OR SET EMOTIONAL FREQUENCY
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {emotionList.map((emo) => {
                      const Icon = emo.icon;
                      const isSelected = state.dominant === emo.name;
                      return (
                        <button
                          key={emo.name}
                          id={`btn-emotion-${emo.name}`}
                          onClick={() => onSetDominantEmotion(emo.name)}
                          className={`p-3 rounded-xl text-left border transition-all ${
                            isSelected
                              ? 'bg-[#0066FF]/25 border-[#00A3FF]/50 shadow-[0_0_15px_rgba(0,163,255,0.2)]'
                              : 'bg-white/5 border-white/10 hover:bg-white/10 text-white/70 hover:text-white'
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <Icon className={`w-4 h-4 ${emo.color}`} />
                            <span className="text-xs font-semibold capitalize text-white">
                              {emo.label}
                            </span>
                          </div>
                          <p className="text-[10px] text-white/50 leading-snug">{emo.desc}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Tab 3: Resonance Vectors */}
            {activeTab === 'vectors' && (
              <div className="space-y-4 my-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs font-telemetry tracking-wider text-white/60">
                    <span>INTERNAL VECTOR INTENSITIES</span>
                    <span className="text-[10px] text-[#00A3FF]">Live Feedback</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      { key: 'happiness', label: 'Happiness', val: state.happiness, color: 'accent-amber-400' },
                      { key: 'curiosity', label: 'Curiosity', val: state.curiosity, color: 'accent-sky-400' },
                      { key: 'excitement', label: 'Excitement', val: state.excitement, color: 'accent-violet-400' },
                      { key: 'empathy', label: 'Empathy', val: state.empathy, color: 'accent-pink-400' },
                      { key: 'confidence', label: 'Confidence', val: state.confidence, color: 'accent-emerald-400' },
                      { key: 'concern', label: 'Concern', val: state.concern, color: 'accent-rose-400' },
                    ].map((item) => (
                      <div
                        key={item.key}
                        className="p-3 rounded-xl bg-[#150F26] border border-white/10 hover:border-[#0066FF]/30 transition-all"
                      >
                        <div className="flex justify-between text-xs font-medium mb-1.5">
                          <span className="text-white/80">{item.label}</span>
                          <span className="font-telemetry text-[#00A3FF] font-semibold">{item.val}%</span>
                        </div>
                        <input
                          id={`slider-emotion-${item.key}`}
                          type="range"
                          min={0}
                          max={100}
                          value={item.val}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10);
                            emotionEngine.updateEmotionVector({ [item.key]: val } as any);
                          }}
                          className={`w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer ${item.color}`}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
