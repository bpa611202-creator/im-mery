import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Volume2, Mic, Sparkles, MessageSquare } from 'lucide-react';
import { EmotionType } from '../types';

interface VoiceSubtitleStageProps {
  state: 'idle' | 'listening' | 'thinking' | 'speaking';
  emotion: EmotionType;
  userLiveTranscript: string;
  merySpokenSubtitle: string;
  onOpenHistory: () => void;
  messageCount: number;
  fullDuplexActive?: boolean;
  wakeWordMode?: boolean;
}

export const VoiceSubtitleStage: React.FC<VoiceSubtitleStageProps> = ({
  state,
  emotion,
  userLiveTranscript,
  merySpokenSubtitle,
  onOpenHistory,
  messageCount,
  fullDuplexActive = true,
  wakeWordMode = false,
}) => {
  return (
    <div id="voice-subtitle-stage" className="w-full max-w-3xl mx-auto px-4 sm:px-6 my-2">
      <div className="relative rounded-3xl p-5 sm:p-7 bg-[#110C22]/75 backdrop-blur-2xl border border-[#E7B7A5]/25 shadow-[0_12px_40px_rgba(0,0,0,0.65),0_0_30px_rgba(157,123,255,0.12)] transition-all">
        {/* Upper Meta Status Row */}
        <div className="flex items-center justify-between mb-3 text-xs">
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                state === 'listening'
                  ? 'bg-emerald-400 animate-ping'
                  : state === 'speaking'
                  ? 'bg-[#E7B7A5] animate-pulse'
                  : state === 'thinking'
                  ? 'bg-[#C6A0FF] animate-spin'
                  : fullDuplexActive
                  ? 'bg-emerald-400'
                  : 'bg-[#9D7BFF]'
              }`}
            />
            <span className="font-telemetry tracking-wider uppercase text-[#E7B7A5] text-[11px] font-medium">
              {state === 'listening'
                ? 'Hearing speech in real-time...'
                : state === 'speaking'
                ? 'MERY is speaking aloud'
                : state === 'thinking'
                ? 'Composing spoken reply...'
                : fullDuplexActive
                ? 'Full-Duplex Room Mic // Always-Ready'
                : 'MERY // Connected & Present'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {state === 'speaking' && (
              <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full bg-[#E7B7A5]/15 border border-[#E7B7A5]/30 text-[10px] font-telemetry text-[#E7B7A5]">
                Speak aloud to interrupt
              </span>
            )}

            {/* Transcript History Button */}
            <button
              id="btn-view-transcript-history"
              onClick={onOpenHistory}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1A1333] border border-[#9D7BFF]/25 text-[#C6A0FF] hover:text-white hover:border-[#E7B7A5]/40 transition-all text-xs"
              title="Open conversation history"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>History ({messageCount})</span>
            </button>
          </div>
        </div>

        {/* Live Spoken Subtitle Viewport */}
        <div className="min-h-[85px] flex flex-col justify-center">
          <AnimatePresence mode="wait">
            {state === 'listening' ? (
              <motion.div
                key="listening-state"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="space-y-1.5"
              >
                <div className="flex items-center gap-2 text-xs text-[#C6A0FF] font-telemetry">
                  <Mic className="w-3.5 h-3.5 animate-pulse text-emerald-400" />
                  <span>LISTENING TO YOUR VOICE...</span>
                </div>
                <p className="text-base sm:text-lg text-white font-medium italic tracking-wide">
                  {userLiveTranscript ? (
                    `"${userLiveTranscript}"`
                  ) : (
                    <span className="text-white/40 not-italic">
                      Speak naturally as if MERY is right there with you...
                    </span>
                  )}
                </p>
              </motion.div>
            ) : state === 'thinking' ? (
              <motion.div
                key="thinking-state"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-3 py-2"
              >
                <Sparkles className="w-5 h-5 text-[#E7B7A5] animate-spin" />
                <p className="text-sm sm:text-base text-[#E7B7A5]/90 font-telemetry tracking-wide">
                  MERY is formulating her response...
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="speaking-or-idle"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="space-y-1"
              >
                <div className="flex items-center gap-2 text-xs text-[#E7B7A5] font-telemetry">
                  <Volume2 className="w-3.5 h-3.5 text-[#C6A0FF]" />
                  <span>SPOKEN SUBTITLE // MERY</span>
                </div>
                <p className="text-base sm:text-lg text-[#F3EFFA] font-medium leading-relaxed">
                  {merySpokenSubtitle || "Hey, I'm MERY. What's on your mind today?"}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Ambient Bottom Spoken Waveform Bar */}
        <div className="mt-4 pt-3 border-t border-[#E7B7A5]/10 flex items-center justify-between text-[11px] text-white/40 font-telemetry">
          <span className="flex items-center gap-1.5 text-[#E7B7A5]/80">
            <span className="w-1.5 h-1.5 rounded-full bg-[#E7B7A5]" />
            VOICE-NATIVE ARCHITECTURE
          </span>
          <span className="text-white/40 hidden sm:inline">
            Optimized for natural room acoustic dialogue
          </span>
        </div>
      </div>
    </div>
  );
};
