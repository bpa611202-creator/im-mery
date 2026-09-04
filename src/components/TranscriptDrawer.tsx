import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Volume2, Trash2, Send, CornerDownLeft, Sparkles, MessageSquare } from 'lucide-react';
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || isThinking) return;
    onSendMessage(text.trim());
    setText('');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div id="transcript-history-drawer" className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/75 backdrop-blur-md"
          />

          {/* Drawer Container */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            className="relative w-full max-w-lg h-full bg-[#0C081A] border-l border-[#E7B7A5]/25 p-5 sm:p-6 flex flex-col justify-between shadow-2xl z-10"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-[#E7B7A5]/15">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-[#1A1233] text-[#E7B7A5]">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-white">Conversation History</h2>
                  <p className="text-xs text-[#C6A0FF] font-telemetry">
                    Supporting Subtitles & Audio Log
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  id="btn-clear-transcript"
                  onClick={onClearChat}
                  className="p-2 rounded-xl text-white/40 hover:text-rose-300 hover:bg-rose-500/10 transition-all text-xs"
                  title="Clear history"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  id="btn-close-transcript"
                  onClick={onClose}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Transcript Messages List */}
            <div className="flex-1 overflow-y-auto py-4 space-y-3.5 pr-1">
              {messages.map((msg, idx) => {
                const isModel = msg.role === 'model';
                const isPlaying = playingMessageId === msg.id;

                return (
                  <div
                    key={`${msg.id || 'transcript'}_${idx}`}
                    className={`flex flex-col ${isModel ? 'items-start' : 'items-end'}`}
                  >
                    <div className="flex items-center gap-1.5 mb-1 px-1 text-[11px] font-telemetry text-white/45">
                      <span>{isModel ? 'MERY' : 'YOU'}</span>
                      <span>•</span>
                      <span>{msg.timestamp}</span>
                      {isModel && msg.emotion && (
                        <span className="text-[#E7B7A5]">[{msg.emotion}]</span>
                      )}
                    </div>

                    <div
                      className={`max-w-[88%] rounded-2xl p-3 text-sm leading-relaxed transition-all ${
                        isModel
                          ? 'bg-[#150F26] border border-[#E7B7A5]/25 text-[#F3EFFA]'
                          : 'bg-[#9D7BFF]/20 border border-[#9D7BFF]/40 text-white'
                      }`}
                    >
                      <p>{msg.content}</p>

                      {/* Vocalize button */}
                      {isModel && (
                        <div className="mt-2 pt-2 border-t border-white/10 flex justify-end">
                          <button
                            onClick={() => onPlayVoice(msg)}
                            className={`flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-all ${
                              isPlaying
                                ? 'bg-[#E7B7A5] text-[#07060D] font-medium'
                                : 'text-[#C6A0FF] hover:text-white hover:bg-white/5'
                            }`}
                          >
                            <Volume2 className="w-3.5 h-3.5" />
                            <span>{isPlaying ? 'Playing...' : 'Play voice'}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Fallback Keyboard Input Area (Optional quiet mode) */}
            <div className="pt-3 border-t border-[#E7B7A5]/15">
              <p className="text-[11px] text-white/40 font-telemetry mb-2">
                QUIET MODE INPUT (VOICE IS DEFAULT):
              </p>
              <form onSubmit={handleSubmit} className="relative flex items-center gap-2">
                <input
                  id="quiet-mode-input"
                  type="text"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Type only if you cannot speak aloud..."
                  disabled={isThinking}
                  className="w-full bg-[#150F26] border border-[#E7B7A5]/25 rounded-xl px-3.5 py-2.5 text-sm text-[#F3EFFA] placeholder:text-white/30 focus:outline-none focus:border-[#9D7BFF]"
                />
                <button
                  id="btn-quiet-mode-send"
                  type="submit"
                  disabled={!text.trim() || isThinking}
                  className="p-2.5 rounded-xl bg-gradient-to-tr from-[#9D7BFF] to-[#E7B7A5] text-[#07060D] font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110 transition-all"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
