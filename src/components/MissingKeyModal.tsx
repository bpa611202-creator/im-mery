import React, { useState } from 'react';
import { ShieldAlert, ExternalLink, Key, Check, X, ArrowRight } from 'lucide-react';
import { MissingKeyProtocol } from '../types';
import { providerManager } from '../utils/providerManager';

interface MissingKeyModalProps {
  protocol: MissingKeyProtocol | null;
  onClose: () => void;
  onOpenApiSettings: () => void;
}

export const MissingKeyModal: React.FC<MissingKeyModalProps> = ({
  protocol,
  onClose,
  onOpenApiSettings,
}) => {
  const [enteredKey, setEnteredKey] = useState('');
  const [saved, setSaved] = useState(false);

  if (!protocol) return null;

  const handleSaveAndResume = () => {
    if (enteredKey.trim().length > 4) {
      // Find matching provider
      const lower = protocol.api.toLowerCase();
      let targetId = 'elevenlabs';
      if (lower.includes('cartesia')) targetId = 'cartesia';
      else if (lower.includes('gemini')) targetId = 'gemini';

      providerManager.updateProvider(targetId, { apiKey: enteredKey.trim(), enabled: true });
      setSaved(true);
      setTimeout(() => {
        onClose();
      }, 900);
    }
  };

  return (
    <div
      id="modal-missing-api-protocol"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in"
    >
      <div
        className="relative w-full max-w-lg rounded-3xl bg-[#0F0A1E] border border-amber-500/40 shadow-2xl shadow-amber-500/10 p-6 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-amber-500/20 border border-amber-500/30 text-amber-300">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-telemetry uppercase tracking-widest text-amber-400">
                Specification Protocol • API Key Required
              </span>
              <h2 className="text-lg font-bold text-white tracking-wide">
                External API Integration Required
              </h2>
            </div>
          </div>
          <button
            id="btn-close-missing-key"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Protocol Spec Box */}
        <div className="p-4 rounded-2xl bg-[#160F2B] border border-white/10 font-mono text-xs space-y-2.5 text-white/90">
          <div className="flex flex-col sm:flex-row sm:justify-between gap-1 border-b border-white/5 pb-1.5">
            <span className="text-white/40">FEATURE:</span>
            <span className="font-semibold text-[#E7B7A5]">{protocol.feature}</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:justify-between gap-1 border-b border-white/5 pb-1.5">
            <span className="text-white/40">API:</span>
            <span className="font-semibold text-white">{protocol.api}</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:justify-between gap-1 border-b border-white/5 pb-1.5">
            <span className="text-white/40">FREE TIER:</span>
            <span className="text-emerald-300">{protocol.freeTierAvailable}</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:justify-between gap-1 border-b border-white/5 pb-1.5">
            <span className="text-white/40">WHERE TO GET KEY:</span>
            <a
              href={protocol.whereToGetKey}
              target="_blank"
              rel="noreferrer"
              className="text-[#C6A0FF] hover:underline flex items-center gap-1"
            >
              {protocol.whereToGetKey} <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
            <span className="text-white/40">WHERE TO INSERT:</span>
            <span className="text-white/80">{protocol.whereToInsertKey}</span>
          </div>
        </div>

        {/* Inline Key Entry */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-white/70 flex items-center gap-1.5">
            <Key className="w-3.5 h-3.5 text-[#C6A0FF]" />
            Enter {protocol.api} Key to Enable Instantly:
          </label>
          <div className="flex items-center gap-2">
            <input
              type="password"
              value={enteredKey}
              placeholder="Paste key here..."
              onChange={(e) => setEnteredKey(e.target.value)}
              className="flex-1 px-3.5 py-2.5 rounded-xl bg-[#090514] border border-white/20 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#9D7BFF] font-telemetry"
            />
            <button
              onClick={handleSaveAndResume}
              disabled={enteredKey.trim().length < 5 || saved}
              className="px-4 py-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-semibold hover:bg-emerald-500/30 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 transition-all"
            >
              {saved ? <Check className="w-4 h-4" /> : 'Save & Enable'}
            </button>
          </div>
        </div>

        {/* Alternative Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-white/10 text-xs">
          <button
            onClick={() => {
              onClose();
              onOpenApiSettings();
            }}
            className="text-[#C6A0FF] hover:text-white flex items-center gap-1 transition-colors"
          >
            Open Full Provider Settings <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white/70 transition-colors"
          >
            Use Zero-Latency Fallback
          </button>
        </div>
      </div>
    </div>
  );
};
