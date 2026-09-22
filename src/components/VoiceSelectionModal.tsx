import React, { useEffect, useState } from 'react';
import { X, Play, Check, Mic2 } from 'lucide-react';
import { voiceService } from '../utils/audio';

interface VoiceSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const VoiceSelectionModal: React.FC<VoiceSelectionModalProps> = ({ isOpen, onClose }) => {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedURI, setSelectedURI] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const loadVoices = () => {
      const ranked = voiceService.getAvailableVoicesRanked();
      setVoices(ranked);

      const existingChoice = voiceService.getSelectedVoiceURI();
      if (existingChoice) {
        setSelectedURI(existingChoice);
      } else if (ranked.length > 0) {
        // No manual choice saved yet - auto-set the best-ranked voice as the
        // default instead of leaving the user to pick from a list that may
        // not even contain a Gujarati option on this device.
        voiceService.selectVoice(ranked[0]);
        setSelectedURI(ranked[0].voiceURI);
      }
    };
    loadVoices();

    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
    }

    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
      }
    };
  }, [isOpen]);

  const hasGujaratiVoice = voices.some((v) => v.lang.toLowerCase().startsWith('gu'));

  if (!isOpen) return null;

  const handleSelect = (voice: SpeechSynthesisVoice) => {
    voiceService.selectVoice(voice);
    setSelectedURI(voice.voiceURI);
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="absolute inset-0" onClick={onClose} />

      <div
        className="relative w-full sm:max-w-lg bg-[#0c0e12] border-t sm:border border-white/15 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[88dvh] flex flex-col z-10 pb-[max(1rem,env(safe-area-inset-bottom))] animate-slideUp"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mt-3 mb-1 sm:hidden" />

        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-[#00ff66]/15 border border-[#00ff66]/30 flex items-center justify-center">
              <Mic2 className="w-4 h-4 text-[#00ff66]" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white tracking-wide">Choose Mery's Voice</h3>
              <p className="text-[10px] text-white/50 font-telemetry">Tap play to preview, then select</p>
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

        <div className="overflow-y-auto px-5 py-4 space-y-2 text-xs">
          {!hasGujaratiVoice && voices.length > 0 && (
            <p className="text-amber-300/80 bg-amber-400/10 border border-amber-400/20 rounded-xl px-3 py-2 text-[11px] mb-1">
              No Gujarati voice found on this device — auto-set to the best available Hindi/English voice instead (Gujarati text is still read using it).
            </p>
          )}

          {voices.length === 0 && (
            <p className="text-white/50 text-center py-6">
              No voices found yet on this browser/device. Try again in a moment.
            </p>
          )}

          {voices.map((voice) => {
            const isSelected = selectedURI ? voice.voiceURI === selectedURI : false;
            return (
              <div
                key={voice.voiceURI}
                className={`p-3 rounded-2xl border flex items-center gap-3 transition-all ${
                  isSelected ? 'bg-[#00ff66]/15 border-[#00ff66]' : 'bg-white/[0.03] border-white/10'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-xs text-white truncate">{voice.name}</div>
                  <div className="text-[10px] text-white/40">{voice.lang}</div>
                </div>
                <button
                  type="button"
                  onClick={() => voiceService.previewVoice(voice)}
                  className="p-2 rounded-full bg-white/5 text-white/70 hover:text-white hover:bg-white/10 cursor-pointer shrink-0"
                  title="Preview this voice"
                >
                  <Play className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleSelect(voice)}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-medium cursor-pointer transition-all shrink-0 ${
                    isSelected ? 'bg-[#00ff66] text-black' : 'bg-white/10 text-white/80 hover:bg-white/20'
                  }`}
                >
                  {isSelected ? <Check className="w-3.5 h-3.5" /> : 'Select'}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default VoiceSelectionModal;
