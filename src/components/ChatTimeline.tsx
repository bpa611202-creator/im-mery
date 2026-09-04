import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Volume2, User, Heart, MessageSquareHeart, Flame } from 'lucide-react';
import { ChatMessage, EmotionType } from '../types';

interface ChatTimelineProps {
  messages: ChatMessage[];
  isThinking: boolean;
  playingMessageId: string | null;
  onPlayVoice: (message: ChatMessage) => void;
  onSelectPrompt: (prompt: string) => void;
  proactiveThought: string | null;
}

export const ChatTimeline: React.FC<ChatTimelineProps> = ({
  messages,
  isThinking,
  playingMessageId,
  onPlayVoice,
  onSelectPrompt,
  proactiveThought,
}) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  const quickSparks = [
    "What's going on with you today?",
    "That sounds interesting — tell me more.",
    "I've been curious about something...",
    "You seem really focused today.",
    "I was thinking about that idea you mentioned earlier.",
  ];

  const getEmotionBadge = (emotion?: EmotionType) => {
    switch (emotion) {
      case 'curious':
        return { text: 'Curious', bg: 'bg-[#C6A0FF]/15 text-[#C6A0FF] border-[#C6A0FF]/30' };
      case 'playful':
        return { text: 'Playful', bg: 'bg-[#E7B7A5]/20 text-[#E7B7A5] border-[#E7B7A5]/40' };
      case 'thoughtful':
        return { text: 'Thoughtful', bg: 'bg-[#9D7BFF]/20 text-[#9D7BFF] border-[#9D7BFF]/30' };
      case 'supportive':
        return { text: 'Supportive', bg: 'bg-[#E7B7A5]/20 text-[#F5D5C8] border-[#E7B7A5]/30' };
      case 'inspired':
        return { text: 'Inspired', bg: 'bg-[#C6A0FF]/25 text-white border-[#C6A0FF]/40' };
      case 'warm':
      default:
        return { text: 'Warm', bg: 'bg-[#9D7BFF]/15 text-[#C6A0FF] border-[#9D7BFF]/30' };
    }
  };

  return (
    <div className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 py-4 flex flex-col justify-between">
      {/* Proactive Thought Ribbon (if available) */}
      {proactiveThought && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 p-3.5 rounded-2xl bg-gradient-to-r from-[#9D7BFF]/15 via-[#C6A0FF]/10 to-[#E7B7A5]/15 border border-[#E7B7A5]/25 backdrop-blur-md flex items-start gap-3 shadow-[0_4px_20px_rgba(157,123,255,0.1)]"
        >
          <div className="mt-0.5 p-1 rounded-full bg-[#E7B7A5]/20 text-[#E7B7A5]">
            <Heart className="w-3.5 h-3.5 fill-[#E7B7A5]/60" />
          </div>
          <div className="flex-1 text-xs sm:text-sm">
            <span className="font-semibold text-[#E7B7A5] tracking-wide">MERY noticed: </span>
            <span className="text-[#F3EFFA]/90 italic">"{proactiveThought}"</span>
          </div>
        </motion.div>
      )}

      {/* Messages List */}
      <div id="messages-container" className="space-y-5 pb-6">
        <AnimatePresence initial={false}>
          {messages.map((msg, idx) => {
            const isMery = msg.role === 'model';
            const isCurrentPlaying = playingMessageId === msg.id;
            const badge = getEmotionBadge(msg.emotion);

            return (
              <motion.div
                key={`${msg.id || 'msg'}_${idx}`}
                id={`chat-message-${msg.id}`}
                initial={{ opacity: 0, y: 15, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className={`flex gap-3 sm:gap-4 ${isMery ? 'justify-start' : 'justify-end'}`}
              >
                {/* MERY Avatar */}
                {isMery && (
                  <div className="flex-shrink-0 mt-1">
                    <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-tr from-[#9D7BFF] via-[#C6A0FF] to-[#E7B7A5] p-[1.5px] shadow-[0_0_15px_rgba(157,123,255,0.4)]">
                      <div className="w-full h-full rounded-full bg-[#0E0B19] flex items-center justify-center">
                        <Sparkles className="w-4 h-4 text-[#E7B7A5]" />
                      </div>
                    </div>
                  </div>
                )}

                {/* Message Bubble */}
                <div
                  className={`max-w-[85%] sm:max-w-[78%] rounded-2xl p-4 sm:p-5 transition-all ${
                    isMery
                      ? 'bg-[#150F26]/80 backdrop-blur-xl border border-[#E7B7A5]/20 shadow-[0_8px_32px_rgba(0,0,0,0.5),0_0_15px_rgba(157,123,255,0.08)]'
                      : 'bg-gradient-to-br from-[#21163A]/90 to-[#120B20]/90 backdrop-blur-xl border border-[#9D7BFF]/30 text-right ml-auto shadow-[0_8px_25px_rgba(0,0,0,0.4)]'
                  }`}
                >
                  {/* Sender Header */}
                  <div
                    className={`flex items-center gap-2 mb-2 ${
                      isMery ? 'justify-start' : 'justify-end'
                    }`}
                  >
                    <span
                      className={`text-xs font-semibold tracking-wide ${
                        isMery ? 'text-[#E7B7A5]' : 'text-[#C6A0FF]'
                      }`}
                    >
                      {isMery ? 'MERY' : 'You'}
                    </span>

                    {isMery && (
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full border font-telemetry capitalize ${badge.bg}`}
                      >
                        {badge.text}
                      </span>
                    )}

                    <span className="text-[10px] text-white/30 font-telemetry">
                      {msg.timestamp}
                    </span>
                  </div>

                  {/* Message Content */}
                  <p className="text-sm sm:text-[15px] leading-relaxed text-[#F3EFFA] font-normal whitespace-pre-wrap selection:bg-[#9D7BFF]/40">
                    {msg.content}
                  </p>

                  {/* MERY Audio Playback / Interaction bar */}
                  {isMery && (
                    <div className="mt-3 pt-2.5 border-t border-[#E7B7A5]/10 flex items-center justify-between">
                      <button
                        id={`btn-play-voice-${msg.id}`}
                        onClick={() => onPlayVoice(msg)}
                        disabled={msg.audioGenerating}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-telemetry transition-all ${
                          isCurrentPlaying
                            ? 'bg-[#E7B7A5]/25 text-[#E7B7A5] border border-[#E7B7A5]/40 shadow-[0_0_10px_rgba(231,183,165,0.3)]'
                            : 'bg-white/5 text-[#C6A0FF] hover:bg-[#9D7BFF]/20 hover:text-white border border-[#9D7BFF]/20'
                        }`}
                        title="Listen to MERY speak naturally"
                      >
                        <Volume2
                          className={`w-3.5 h-3.5 ${
                            isCurrentPlaying ? 'animate-bounce text-[#E7B7A5]' : ''
                          }`}
                        />
                        <span>
                          {msg.audioGenerating
                            ? 'Synthesizing voice...'
                            : isCurrentPlaying
                            ? 'Speaking...'
                            : 'Play Voice'}
                        </span>
                      </button>

                      <span className="text-[10px] text-white/30 italic">
                        M4 Companion Sync
                      </span>
                    </div>
                  )}
                </div>

                {/* User Avatar */}
                {!isMery && (
                  <div className="flex-shrink-0 mt-1">
                    <div className="w-8 h-8 rounded-full bg-[#18112C] border border-[#9D7BFF]/40 flex items-center justify-center text-[#C6A0FF]">
                      <User className="w-4 h-4" />
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Thinking Indicator */}
        {isThinking && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3"
          >
            <div className="w-8 h-8 rounded-full bg-[#0E0B19] border border-[#E7B7A5]/40 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-[#E7B7A5] animate-spin" />
            </div>
            <div className="px-4 py-3 rounded-2xl bg-[#150F26]/70 border border-[#9D7BFF]/20 backdrop-blur-md flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#9D7BFF] animate-ping" />
              <span className="w-2 h-2 rounded-full bg-[#C6A0FF] animate-ping delay-100" />
              <span className="w-2 h-2 rounded-full bg-[#E7B7A5] animate-ping delay-200" />
              <span className="text-xs text-[#E7B7A5] font-telemetry ml-2">
                MERY is reflecting...
              </span>
            </div>
          </motion.div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Suggested Spontaneous Sparks / Prompts */}
      <div className="pt-2">
        <div className="flex items-center gap-1.5 text-xs text-[#E7B7A5]/70 mb-2 font-telemetry">
          <MessageSquareHeart className="w-3.5 h-3.5 text-[#C6A0FF]" />
          <span>NATURAL CONVERSATION SPARKS</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {quickSparks.map((spark, idx) => (
            <button
              key={idx}
              id={`quick-spark-${idx}`}
              onClick={() => onSelectPrompt(spark)}
              className="text-xs px-3 py-1.5 rounded-full bg-[#161128]/70 border border-[#E7B7A5]/18 text-[#F3EFFA]/80 hover:text-white hover:border-[#E7B7A5]/50 hover:bg-[#22163C] transition-all shadow-sm"
            >
              {spark}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
