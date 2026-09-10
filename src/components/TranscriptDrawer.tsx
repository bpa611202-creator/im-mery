import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Volume2,
  Trash2,
  Send,
  Sparkles,
  MessageSquare,
  Terminal,
  Activity,
  CornerDownLeft,
  Smile,
} from 'lucide-react';
import { EmojiPickerPopover } from './EmojiPickerPopover';
import { ChatMessage } from '../types';

interface TranscriptDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  messages: ChatMessage[];
  onPlayVoice: (msg: ChatMessage) => void;
  playingMessageId: string | null;
  onSendMessage: (text: string) => void;
  onClearChat: () => void;
  isThinking: boolean;
}

const QUICK_SPARKS = [
  'Status report on system capabilities',
  'What have you remembered about me?',
  'Search the web for latest AI news',
  'Tell me an interesting thought today',
];

export const TranscriptDrawer: React.FC<TranscriptDrawerProps> = ({
  isOpen,
  onClose,
  messages,
  onPlayVoice,
  playingMessageId,
  onSendMessage,
  onClearChat,
  isThinking,
}) => {
  const [text, setText] = useState('');
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const emojiTriggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        inputRef.current?.focus();
      }, 150);
    }
  }, [isOpen, messages, isThinking]);

  const handleInsertEmoji = (emoji: string) => {
    const input = inputRef.current;
    if (!input) {
      setText((prev) => prev + emoji);
      return;
    }
    const start = input.selectionStart ?? text.length;
    const end = input.selectionEnd ?? text.length;
    const nextText = text.slice(0, start) + emoji + text.slice(end);
    setText(nextText);
    requestAnimationFrame(() => {
      input.focus();
      const newPos = start + emoji.length;
      input.setSelectionRange(newPos, newPos);
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || isThinking) return;
    setIsEmojiPickerOpen(false);
    onSendMessage(text.trim());
    setText('');
  };

  const handleSparkClick = (spark: string) => {
    if (isThinking) return;
    onSendMessage(spark);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div id="neural-chat-box-drawer" className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-md"
          />

          {/* Drawer Container */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            className="relative w-full max-w-xl h-full bg-[#020204] border-l border-[#00A3FF]/30 p-5 sm:p-6 flex flex-col justify-between shadow-2xl z-10 font-body"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-[#00A3FF]/15 border border-[#00A3FF]/40 flex items-center justify-center text-[#00A3FF]">
                  <Terminal className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="label font-telemetry text-[9px] tracking-[0.3em] uppercase text-[#00A3FF]">
                      Console
                    </span>
                    <span className="text-[10px] font-telemetry text-white/40">
                      [{messages.length} MSGS]
                    </span>
                  </div>
                  <h2 className="text-base font-bold tracking-wider text-white font-brand">
                    NEURAL CHAT BOX
                  </h2>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  id="btn-clear-transcript"
                  onClick={onClearChat}
                  className="p-2 border border-white/[0.08] hover:border-rose-500/50 text-white/40 hover:text-rose-300 hover:bg-rose-500/10 transition-all text-xs"
                  title="Clear conversation history"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  id="btn-close-transcript"
                  onClick={onClose}
                  className="p-2 border border-white/[0.08] hover:border-[#00A3FF]/50 text-white/60 hover:text-white hover:bg-white/[0.04] transition-all"
                  title="Close Chat Box"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Quick Prompt Sparks */}
            <div className="py-2.5 flex items-center gap-1.5 overflow-x-auto no-scrollbar border-b border-white/[0.05]">
              <span className="text-[9px] font-telemetry text-[#00A3FF] tracking-widest uppercase shrink-0 mr-1 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                PROMPTS:
              </span>
              {QUICK_SPARKS.map((spark, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSparkClick(spark)}
                  disabled={isThinking}
                  className="shrink-0 text-[10px] font-telemetry px-2.5 py-1 bg-white/[0.03] hover:bg-[#00A3FF]/15 border border-white/[0.08] hover:border-[#00A3FF]/40 text-white/70 hover:text-white transition-all whitespace-nowrap disabled:opacity-40 cursor-pointer"
                >
                  {spark}
                </button>
              ))}
            </div>

            {/* Messages Stream */}
            <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
              {messages.map((msg, idx) => {
                const isModel = msg.role === 'model';
                const isPlaying = playingMessageId === msg.id;

                return (
                  <div
                    key={`${msg.id || 'transcript'}_${idx}`}
                    className={`flex flex-col ${isModel ? 'items-start' : 'items-end'}`}
                  >
                    {/* Header meta */}
                    <div className="flex items-center gap-2 mb-1 px-1 text-[10px] font-telemetry text-white/40">
                      <span className={isModel ? 'text-[#00A3FF] font-semibold' : 'text-white/70'}>
                        {isModel ? 'MERY // NEURAL' : 'USER // INPUT'}
                      </span>
                      <span>•</span>
                      <span>{msg.timestamp}</span>
                      {isModel && msg.emotion && (
                        <span className="text-white/60 uppercase border border-white/10 px-1 py-0.2 text-[9px]">
                          {msg.emotion}
                        </span>
                      )}
                    </div>

                    {/* Bubble */}
                    <div
                      className={`max-w-[90%] p-3.5 text-sm leading-relaxed transition-all ${
                        isModel
                          ? 'bg-white/[0.03] border-l-2 border-l-[#00A3FF] border-y border-r border-white/[0.06] text-white/95 backdrop-blur-md'
                          : 'bg-[#00A3FF]/10 border border-[#00A3FF]/40 text-white'
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{msg.content}</p>

                      {/* Action details if parsed */}
                      {msg.actionExecuted && (
                        <div className="mt-2 pt-2 border-t border-white/10 flex items-center gap-1.5 text-[10px] font-telemetry text-emerald-400">
                          <Activity className="w-3 h-3" />
                          <span>Action: {msg.actionExecuted.type}</span>
                        </div>
                      )}

                      {/* Vocalize button */}
                      {isModel && (
                        <div className="mt-2.5 pt-2 border-t border-white/10 flex justify-end">
                          <button
                            onClick={() => onPlayVoice(msg)}
                            className={`flex items-center gap-1.5 text-[10px] font-telemetry px-2.5 py-1 border transition-all ${
                              isPlaying
                                ? 'bg-[#00A3FF] border-[#00A3FF] text-white font-semibold shadow-[0_0_12px_rgba(0,163,255,0.5)]'
                                : 'bg-white/[0.03] border-white/[0.1] text-white/60 hover:text-white hover:border-[#00A3FF]/50'
                            }`}
                          >
                            <Volume2 className={`w-3 h-3 ${isPlaying ? 'animate-pulse' : ''}`} />
                            <span>{isPlaying ? 'STREAMING...' : 'VOCALIZE'}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Thinking Indicator */}
              {isThinking && (
                <div className="flex flex-col items-start gap-1">
                  <div className="flex items-center gap-2 px-1 text-[10px] font-telemetry text-[#00A3FF]">
                    <span>MERY // PROCESSING</span>
                  </div>
                  <div className="bg-white/[0.03] border-l-2 border-l-[#00A3FF] border-y border-r border-white/[0.06] p-3 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#00A3FF] animate-spin" />
                    <span className="text-xs font-telemetry text-white/70">
                      Synthesizing neural response...
                    </span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Chat Box Input Area */}
            <div className="pt-3 border-t border-white/[0.08]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] text-white/40 font-telemetry tracking-wider">
                  CHAT BOX INPUT
                </span>
                <span className="text-[9px] text-[#00A3FF] font-telemetry tracking-widest uppercase flex items-center gap-1">
                  <CornerDownLeft className="w-2.5 h-2.5" />
                  PRESS ENTER TO TRANSMIT
                </span>
              </div>
              <form onSubmit={handleSubmit} className="relative flex items-center gap-2">
                <input
                  ref={inputRef}
                  id="chat-box-input"
                  type="text"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder={
                    isThinking
                      ? 'Synthesizing neural reply...'
                      : 'Type a message or instruction for Mery...'
                  }
                  disabled={isThinking}
                  className="w-full bg-white/[0.03] border border-white/[0.12] focus:border-[#00A3FF] px-3.5 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none transition-all font-sans"
                />
                {/* Side Emoji Box Button */}
                <button
                  ref={emojiTriggerRef}
                  type="button"
                  id="btn-chat-box-emoji"
                  onClick={() => setIsEmojiPickerOpen(!isEmojiPickerOpen)}
                  className={`p-2.5 rounded-lg border border-white/[0.12] bg-white/[0.03] transition-all cursor-pointer shrink-0 flex items-center justify-center ${
                    isEmojiPickerOpen
                      ? 'text-[#00A3FF] border-[#00A3FF] bg-[#00A3FF]/15'
                      : 'text-white/50 hover:text-[#00A3FF] hover:border-[#00A3FF]/40 hover:bg-white/[0.06]'
                  }`}
                  title={isEmojiPickerOpen ? 'Close emoji picker' : 'Open emoji box'}
                >
                  <Smile className="w-4 h-4" />
                </button>
                <button
                  id="btn-chat-box-send"
                  type="submit"
                  disabled={!text.trim() || isThinking}
                  className="px-4 py-2.5 bg-[#00A3FF] hover:bg-[#0084FF] text-white font-telemetry text-xs tracking-wider uppercase disabled:opacity-30 disabled:cursor-not-allowed transition-all shrink-0 flex items-center gap-1.5 cursor-pointer shadow-[0_0_15px_rgba(0,163,255,0.35)]"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">SEND</span>
                </button>

                {/* Floating Emoji Box Popover */}
                <EmojiPickerPopover
                  isOpen={isEmojiPickerOpen}
                  onClose={() => setIsEmojiPickerOpen(false)}
                  onSelectEmoji={handleInsertEmoji}
                  triggerRef={emojiTriggerRef}
                  accentColor="blue"
                  align="right"
                />
              </form>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

