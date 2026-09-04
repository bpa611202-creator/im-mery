import React, { useState, useRef, useEffect } from 'react';
import { Send, Mic, MicOff, Trash2, Sparkles, Volume2, CornerDownLeft } from 'lucide-react';

interface VoiceInputDockProps {
  onSendMessage: (text: string) => void;
  isListening: boolean;
  onToggleListen: () => void;
  onClearChat: () => void;
  disabled?: boolean;
  autoSpeak: boolean;
  onToggleAutoSpeak: () => void;
}

export const VoiceInputDock: React.FC<VoiceInputDockProps> = ({
  onSendMessage,
  isListening,
  onToggleListen,
  onClearChat,
  disabled = false,
  autoSpeak,
  onToggleAutoSpeak,
}) => {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!text.trim() || disabled) return;
    onSendMessage(text.trim());
    setText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Auto-grow textarea
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  };

  return (
    <div
      id="voice-input-dock"
      className="sticky bottom-0 z-20 w-full px-4 sm:px-6 py-3 bg-gradient-to-t from-[#07060D] via-[#08070E]/95 to-transparent backdrop-blur-md"
    >
      <div className="max-w-4xl mx-auto">
        <form
          onSubmit={handleSubmit}
          className="relative flex items-end gap-2 p-2 sm:p-2.5 rounded-2xl bg-[#140F24]/85 border border-[#E7B7A5]/25 shadow-[0_8px_32px_rgba(0,0,0,0.6),0_0_20px_rgba(157,123,255,0.12)] backdrop-blur-2xl transition-all focus-within:border-[#9D7BFF]/60 focus-within:shadow-[0_0_25px_rgba(157,123,255,0.25)]"
        >
          {/* Microphone Voice Button */}
          <button
            id="btn-voice-record"
            type="button"
            onClick={onToggleListen}
            disabled={disabled}
            className={`relative flex-shrink-0 p-2.5 sm:p-3 rounded-xl transition-all duration-300 ${
              isListening
                ? 'bg-gradient-to-tr from-[#9D7BFF] to-[#E7B7A5] text-[#07060D] shadow-[0_0_25px_rgba(198,160,255,0.6)] animate-pulse'
                : 'bg-[#1D1533] text-[#E7B7A5] hover:bg-[#2B1D4B] hover:text-white border border-[#E7B7A5]/20'
            }`}
            title={isListening ? 'Listening to your voice... (Click to finish)' : 'Speak directly to MERY'}
          >
            {isListening ? (
              <MicOff className="w-5 h-5 animate-bounce" />
            ) : (
              <Mic className="w-5 h-5" />
            )}
            {isListening && (
              <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-[#E7B7A5] animate-ping" />
            )}
          </button>

          {/* Text Area */}
          <div className="flex-1 relative">
            <textarea
              id="mery-chat-input"
              ref={textareaRef}
              rows={1}
              value={text}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={
                isListening
                  ? 'Listening to your speech...'
                  : "Talk with MERY... (e.g., 'What are you thinking about?')"
              }
              disabled={disabled}
              className="w-full bg-transparent text-sm sm:text-base text-[#F3EFFA] placeholder:text-white/35 resize-none outline-none py-1.5 px-2 max-h-[120px] font-sans"
            />
          </div>

          {/* Controls: Auto-voice toggle, Clear, Send */}
          <div className="flex items-center gap-1.5 flex-shrink-0 pb-0.5">
            <button
              id="btn-toggle-auto-voice"
              type="button"
              onClick={onToggleAutoSpeak}
              className={`p-2 rounded-xl text-xs transition-all ${
                autoSpeak
                  ? 'bg-[#9D7BFF]/20 text-[#E7B7A5] border border-[#E7B7A5]/30 shadow-sm'
                  : 'text-white/30 hover:text-white/70'
              }`}
              title={autoSpeak ? 'Auto-speak responses is ON' : 'Auto-speak responses is OFF'}
            >
              <Volume2 className="w-4 h-4" />
            </button>

            <button
              id="btn-clear-chat"
              type="button"
              onClick={onClearChat}
              className="p-2 rounded-xl text-white/30 hover:text-rose-300 hover:bg-rose-500/10 transition-all"
              title="Reset conversation"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            <button
              id="btn-send-message"
              type="submit"
              disabled={!text.trim() || disabled}
              className={`p-2.5 rounded-xl font-medium transition-all ${
                text.trim() && !disabled
                  ? 'bg-gradient-to-r from-[#9D7BFF] via-[#C6A0FF] to-[#E7B7A5] text-[#0A0714] shadow-[0_0_15px_rgba(231,183,165,0.4)] hover:brightness-110'
                  : 'bg-white/5 text-white/20 cursor-not-allowed'
              }`}
              title="Send to MERY (Enter)"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </form>

        {/* Footnote status */}
        <div className="flex items-center justify-between px-3 pt-1.5 text-[11px] text-white/40 font-telemetry">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#E7B7A5]" />
            M4 SYSTEM // MERY COMPANION INTERFACE
          </span>
          <span className="hidden sm:inline text-white/30">
            Press <kbd className="px-1 py-0.5 rounded bg-white/10 font-mono text-[10px]">Enter ↵</kbd> to send
          </span>
        </div>
      </div>
    </div>
  );
};
