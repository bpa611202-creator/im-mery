import React, { useState, useEffect, useRef } from 'react';
import {
  Monitor,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  X,
  Camera,
  Upload,
  ArrowRight,
  Info,
  RefreshCw,
  HelpCircle,
  Laptop,
  Globe,
  Settings,
} from 'lucide-react';
import { screenShareService } from '../modules/ScreenShareService';
import { stateManager } from '../modules/StateManager';

interface ScreenAllowModalProps {
  isOpen: boolean;
  onClose: () => void;
  reason?: string | null;
}

export const ScreenAllowModal: React.FC<ScreenAllowModalProps> = ({
  isOpen,
  onClose,
  reason,
}) => {
  const [activeTab, setActiveTab] = useState<'guide' | 'os_mac' | 'os_win' | 'fallback'>('guide');
  const [isStarting, setIsStarting] = useState(false);
  const [isSharing, setIsSharing] = useState(screenShareService.isSharing());
  const [lastError, setLastError] = useState<string | null>(reason || null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const isInIframe = (() => {
    try {
      return window.self !== window.top;
    } catch {
      return true;
    }
  })();

  useEffect(() => {
    if (reason) {
      setLastError(reason);
    }
  }, [reason]);

  useEffect(() => {
    const unsub = screenShareService.subscribe(() => {
      const sharing = screenShareService.isSharing();
      setIsSharing(sharing);
      if (sharing) {
        setIsStarting(false);
        // Auto close on successful share after brief delay
        setTimeout(() => {
          onClose();
        }, 1200);
      }
    });
    return unsub;
  }, [onClose]);

  if (!isOpen) return null;

  const handleStartShare = async () => {
    setIsStarting(true);
    setLastError(null);
    try {
      const success = await screenShareService.startScreenShare();
      if (!success) {
        setLastError(
          screenShareService.getStats().lastError ||
            'Permission was dismissed or blocked. If in preview iframe, please open in a new tab.'
        );
      }
    } catch (e: any) {
      setLastError(e?.message || 'Failed to initialize display capture.');
    } finally {
      setIsStarting(false);
    }
  };

  const handleOpenStandaloneTab = () => {
    const currentUrl = new URL(window.location.href);
    currentUrl.searchParams.set('autoshare', '1');
    window.open(currentUrl.toString(), '_blank');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.replace(/^data:image\/[a-z]+;base64,/, '');
      screenShareService.uploadStaticImage(base64);
      stateManager.notify('Screenshot loaded into MERY visual context', 'success');
      onClose();
    };
    reader.readAsDataURL(file);
  };

  return (
    <div
      id="modal-screen-allow"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl rounded-3xl bg-[#0F0A1E] border border-[#9D7BFF]/30 shadow-2xl shadow-purple-950/40 p-6 md:p-8 space-y-6 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3.5">
            <div
              className={`p-3.5 rounded-2xl border transition-all ${
                isSharing
                  ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.3)]'
                  : 'bg-[#9D7BFF]/15 border-[#9D7BFF]/30 text-[#E7B7A5]'
              }`}
            >
              <Monitor className={`w-6 h-6 ${isSharing ? 'animate-pulse text-emerald-400' : ''}`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-telemetry uppercase tracking-widest text-[#E7B7A5]">
                  MERY Multimodal Vision
                </span>
                {isSharing && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold">
                    Active & Streaming
                  </span>
                )}
              </div>
              <h2 className="text-xl font-bold text-white tracking-wide">
                Allow Screen Sharing & Vision
              </h2>
            </div>
          </div>

          <button
            id="btn-close-screen-allow-modal"
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-all"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Embedded Iframe Security Notice */}
        {isInIframe && (
          <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-purple-900/20 to-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg shadow-amber-950/20">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-semibold text-amber-300">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Embedded Preview Sandbox Notice</span>
              </div>
              <p className="text-xs text-white/70 leading-relaxed">
                Web browsers automatically restrict <code className="text-amber-200 bg-black/30 px-1 py-0.5 rounded">getDisplayMedia()</code> inside embedded preview iframes. Open MERY in a standalone tab for full screen permissions.
              </p>
            </div>
            <button
              id="btn-modal-open-standalone"
              onClick={handleOpenStandaloneTab}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#9D7BFF] to-[#E7B7A5] hover:opacity-95 text-[#0A0614] text-xs font-bold transition-all flex items-center justify-center gap-2 whitespace-nowrap shrink-0 shadow-lg shadow-purple-500/20"
            >
              <ExternalLink className="w-4 h-4 text-[#0A0614]" />
              Open in New Tab
            </button>
          </div>
        )}

        {/* Last Error Banner if permission failed */}
        {lastError && !isSharing && (
          <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-200 text-xs flex items-start gap-2.5">
            <Info className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <div className="font-semibold text-rose-300">Permission Status</div>
              <div className="text-white/70">{lastError}</div>
            </div>
          </div>
        )}

        {/* Primary Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            id="btn-allow-screen-now"
            onClick={handleStartShare}
            disabled={isStarting || isSharing}
            className={`p-4 rounded-2xl border transition-all flex items-center justify-between gap-3 text-left ${
              isSharing
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200'
                : 'bg-gradient-to-r from-purple-600/30 to-[#9D7BFF]/20 hover:from-purple-600/40 hover:to-[#9D7BFF]/30 border-[#9D7BFF]/50 text-white shadow-lg shadow-purple-900/30'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-white/10 text-white">
                {isStarting ? (
                  <RefreshCw className="w-5 h-5 animate-spin text-[#E7B7A5]" />
                ) : isSharing ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                ) : (
                  <Monitor className="w-5 h-5 text-[#E7B7A5]" />
                )}
              </div>
              <div>
                <div className="text-sm font-bold">
                  {isStarting ? 'Requesting Permission...' : isSharing ? 'Screen Vision Active' : 'Allow Screen Now'}
                </div>
                <div className="text-[11px] text-white/60">
                  {isSharing ? 'Transmitting display to MERY' : 'Prompts browser display dialog'}
                </div>
              </div>
            </div>
            {!isSharing && <ArrowRight className="w-4 h-4 text-white/50" />}
          </button>

          <button
            id="btn-allow-standalone-tab"
            onClick={handleOpenStandaloneTab}
            className="p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white transition-all flex items-center justify-between gap-3 text-left"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                <ExternalLink className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-bold">Launch Standalone Window</div>
                <div className="text-[11px] text-white/60">Unrestricted browser permissions</div>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-white/50" />
          </button>
        </div>

        {/* Tab Navigation for Step-by-Step Instructions */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 border-b border-white/10 pb-2 overflow-x-auto text-xs">
            <button
              onClick={() => setActiveTab('guide')}
              className={`px-3 py-1.5 rounded-xl font-medium transition-all whitespace-nowrap ${
                activeTab === 'guide'
                  ? 'bg-[#9D7BFF]/20 text-[#E7B7A5] border border-[#9D7BFF]/40'
                  : 'text-white/50 hover:text-white'
              }`}
            >
              Browser Dialog Guide
            </button>
            <button
              onClick={() => setActiveTab('os_mac')}
              className={`px-3 py-1.5 rounded-xl font-medium transition-all whitespace-nowrap ${
                activeTab === 'os_mac'
                  ? 'bg-[#9D7BFF]/20 text-[#E7B7A5] border border-[#9D7BFF]/40'
                  : 'text-white/50 hover:text-white'
              }`}
            >
              macOS System Settings
            </button>
            <button
              onClick={() => setActiveTab('os_win')}
              className={`px-3 py-1.5 rounded-xl font-medium transition-all whitespace-nowrap ${
                activeTab === 'os_win'
                  ? 'bg-[#9D7BFF]/20 text-[#E7B7A5] border border-[#9D7BFF]/40'
                  : 'text-white/50 hover:text-white'
              }`}
            >
              Windows / Linux
            </button>
            <button
              onClick={() => setActiveTab('fallback')}
              className={`px-3 py-1.5 rounded-xl font-medium transition-all whitespace-nowrap ${
                activeTab === 'fallback'
                  ? 'bg-[#9D7BFF]/20 text-[#E7B7A5] border border-[#9D7BFF]/40'
                  : 'text-white/50 hover:text-white'
              }`}
            >
              Camera & Image Fallback
            </button>
          </div>

          {/* Browser Dialog Guide */}
          {activeTab === 'guide' && (
            <div className="p-4 rounded-2xl bg-[#140E26] border border-white/5 space-y-3 text-xs text-white/80">
              <div className="font-semibold text-white flex items-center gap-2">
                <Globe className="w-4 h-4 text-cyan-400" />
                How to select and allow in the browser popup:
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-white/5 border border-white/5 space-y-1">
                  <div className="font-bold text-[#E7B7A5] flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-[#9D7BFF]/20 text-center leading-5 text-[11px]">1</span>
                    Choose Screen
                  </div>
                  <p className="text-white/60 text-[11px]">
                    Select <strong>Entire Screen</strong>, <strong>Window</strong>, or a <strong>Tab</strong> in the dialog.
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-white/5 border border-white/5 space-y-1">
                  <div className="font-bold text-[#E7B7A5] flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-[#9D7BFF]/20 text-center leading-5 text-[11px]">2</span>
                    Click the Thumbnail
                  </div>
                  <p className="text-white/60 text-[11px]">
                    <strong>Important:</strong> Click on the preview image inside the dialog box to select it.
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-white/5 border border-white/5 space-y-1">
                  <div className="font-bold text-[#E7B7A5] flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-[#9D7BFF]/20 text-center leading-5 text-[11px]">3</span>
                    Click "Share"
                  </div>
                  <p className="text-white/60 text-[11px]">
                    The blue <strong>Share</strong> button will activate. Click it to stream directly to MERY.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* macOS System Settings Guide */}
          {activeTab === 'os_mac' && (
            <div className="p-4 rounded-2xl bg-[#140E26] border border-white/5 space-y-3 text-xs text-white/80">
              <div className="font-semibold text-white flex items-center gap-2">
                <Settings className="w-4 h-4 text-purple-400" />
                If macOS blocked screen recording in Chrome/Brave/Edge:
              </div>
              <ol className="space-y-2 list-decimal list-inside text-white/70">
                <li>
                  Open your Mac's <strong className="text-white">System Settings</strong>.
                </li>
                <li>
                  Navigate to <strong className="text-white">Privacy & Security</strong> in the left sidebar.
                </li>
                <li>
                  Scroll down and click <strong className="text-white">Screen & System Audio Recording</strong>.
                </li>
                <li>
                  Find <strong className="text-white">Google Chrome</strong> (or your browser) and toggle the switch <strong className="text-emerald-400">ON</strong>.
                </li>
                <li>
                  When prompted, choose <strong className="text-white">Quit & Reopen</strong>, then reload MERY.
                </li>
              </ol>
            </div>
          )}

          {/* Windows / Linux Guide */}
          {activeTab === 'os_win' && (
            <div className="p-4 rounded-2xl bg-[#140E26] border border-white/5 space-y-3 text-xs text-white/80">
              <div className="font-semibold text-white flex items-center gap-2">
                <Laptop className="w-4 h-4 text-cyan-400" />
                Windows 10 / 11 & Linux Permissions:
              </div>
              <ul className="space-y-2 list-disc list-inside text-white/70">
                <li>
                  Ensure your browser is permitted to record your screen in <strong>Windows Settings → Privacy & Security → App permissions</strong>.
                </li>
                <li>
                  On Wayland Linux environments, ensure PipeWire desktop sharing portal (<code className="text-cyan-300">xdg-desktop-portal</code>) is active.
                </li>
                <li>
                  If using third-party browser extensions like AdBlock or privacy shields, verify they aren't blocking media capture prompts.
                </li>
              </ul>
            </div>
          )}

          {/* Camera & Image Upload Fallback */}
          {activeTab === 'fallback' && (
            <div className="p-4 rounded-2xl bg-[#140E26] border border-white/5 space-y-4 text-xs text-white/80">
              <div className="font-semibold text-white flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-[#E7B7A5]" />
                Alternative Vision Methods:
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-white">
                    <Camera className="w-4 h-4 text-purple-300" />
                    Webcam / Camera Vision
                  </div>
                  <p className="text-[11px] text-white/60">
                    Use your webcam to point at your display or physical documents for MERY to inspect.
                  </p>
                  <button
                    onClick={async () => {
                      try {
                        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                        screenShareService.setExternalStream(stream);
                        stateManager.notify('Camera vision connected to MERY', 'success');
                        onClose();
                      } catch (err: any) {
                        setLastError(`Camera access notice: ${err?.message || err}`);
                      }
                    }}
                    className="w-full py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold transition-all"
                  >
                    Start Camera Vision
                  </button>
                </div>

                <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-white">
                    <Upload className="w-4 h-4 text-[#E7B7A5]" />
                    Upload Screenshot
                  </div>
                  <p className="text-[11px] text-white/60">
                    Capture a screenshot with PrintScreen / Cmd+Shift+4 and upload it directly.
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-2 rounded-xl bg-[#9D7BFF]/20 hover:bg-[#9D7BFF]/30 text-[#E7B7A5] border border-[#9D7BFF]/40 text-xs font-semibold transition-all"
                  >
                    Select Screenshot Image
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-white/10 pt-4 text-xs">
          <div className="flex items-center gap-1.5 text-white/40">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Encrypted local transmission to AI visual reasoning model</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white/80 font-medium transition-all"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
