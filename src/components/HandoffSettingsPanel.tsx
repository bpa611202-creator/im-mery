import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  Laptop,
  RefreshCw,
  Copy,
  Check,
  QrCode,
  Link,
  ShieldCheck,
  Radio,
  ArrowRight,
  Wifi,
  Sparkles,
} from 'lucide-react';
import { handoffManager, HandoffPeer, SyncedHandoffState } from '../modules/HandoffManager';
import { stateManager } from '../modules/StateManager';

interface HandoffSettingsPanelProps {
  onSyncState?: () => void;
}

export const HandoffSettingsPanel: React.FC<HandoffSettingsPanelProps> = ({ onSyncState }) => {
  const [sessionId, setSessionId] = useState(handoffManager.getSessionId());
  const [deviceType, setDeviceType] = useState(handoffManager.getDeviceType());
  const [peers, setPeers] = useState<HandoffPeer[]>([]);
  const [isConnected, setIsConnected] = useState(handoffManager.getIsConnected());
  const [pairCode, setPairCode] = useState<string | null>(null);
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);
  const [inputCode, setInputCode] = useState('');
  const [isClaimingCode, setIsClaimingCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedSession, setCopiedSession] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>('Just now');

  useEffect(() => {
    handoffManager.connect();
    setIsConnected(handoffManager.getIsConnected());
    setPeers(handoffManager.getConnectedPeers());

    const unsubPeers = handoffManager.onPeersChange((newPeers) => {
      setPeers(newPeers);
      setIsConnected(true);
    });

    const unsubState = handoffManager.onStateChange((state) => {
      if (state.updatedAt) {
        setLastSyncTime(new Date(state.updatedAt).toLocaleTimeString());
      }
    });

    return () => {
      unsubPeers();
      unsubState();
    };
  }, []);

  const handleGenerateCode = async () => {
    setIsGeneratingCode(true);
    const result = await handoffManager.generatePairingCode();
    setIsGeneratingCode(false);
    if (result.success && result.code) {
      setPairCode(result.code);
    }
  };

  const handleClaimCode = async () => {
    if (!inputCode.trim()) return;
    setIsClaimingCode(true);
    const result = await handoffManager.claimPairingCode(inputCode);
    setIsClaimingCode(false);
    if (result.success) {
      setSessionId(handoffManager.getSessionId());
      setInputCode('');
      setPairCode(null);
    }
  };

  const copyPairingUrl = () => {
    const url = `${window.location.origin}?handoff=${encodeURIComponent(sessionId)}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    stateManager.notify('Pairing URL copied to clipboard!', 'success');
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const copySessionId = () => {
    navigator.clipboard.writeText(sessionId);
    setCopiedSession(true);
    stateManager.notify('Session ID copied!', 'success');
    setTimeout(() => setCopiedSession(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-[#9D7BFF]/10 via-[#C6A0FF]/10 to-transparent border border-[#9D7BFF]/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#9D7BFF]/20 border border-[#9D7BFF]/30 flex items-center justify-center text-[#C6A0FF]">
            {deviceType === 'mobile' || deviceType === 'tablet' ? (
              <Smartphone className="w-5 h-5" />
            ) : (
              <Laptop className="w-5 h-5" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-medium text-white">
                This Device:{' '}
                <span className="capitalize text-[#C6A0FF] font-semibold">{deviceType}</span>
              </h3>
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                  isConnected
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                }`}
              >
                <Radio className={`w-2.5 h-2.5 ${isConnected ? 'animate-pulse' : ''}`} />
                {isConnected ? 'Sync Engine Live' : 'Connecting...'}
              </span>
            </div>
            <p className="text-xs text-neutral-400 mt-0.5">
              Real-time state & conversation sync across your PC, Android, or iPhone.
            </p>
          </div>
        </div>

        {onSyncState && (
          <button
            onClick={() => {
              onSyncState();
              stateManager.notify('Synced current conversation to room!', 'success');
            }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#9D7BFF]/20 hover:bg-[#9D7BFF]/30 border border-[#9D7BFF]/40 text-xs text-[#C6A0FF] font-medium transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Sync Current State
          </button>
        )}
      </div>

      {/* Pairing Methods Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Box 1: Quick 6-Digit Pair Code */}
        <div className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#C6A0FF]" />
              Quick Pair Code
            </span>
            <span className="text-[11px] text-neutral-500">15 min validity</span>
          </div>

          <p className="text-xs text-neutral-400">
            Generate a 6-digit code on this device to link your phone instantly.
          </p>

          {pairCode ? (
            <div className="p-3 rounded-lg bg-neutral-950 border border-[#9D7BFF]/40 flex items-center justify-between">
              <div className="text-center w-full">
                <span className="text-2xl font-mono font-bold tracking-widest text-[#C6A0FF]">
                  {pairCode.slice(0, 3)} - {pairCode.slice(3)}
                </span>
                <p className="text-[10px] text-neutral-400 mt-1">
                  Enter this code on your other device
                </p>
              </div>
            </div>
          ) : (
            <button
              onClick={handleGenerateCode}
              disabled={isGeneratingCode}
              className="w-full py-2.5 px-4 rounded-lg bg-[#9D7BFF] hover:bg-[#8B64FF] text-white text-xs font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
            >
              <QrCode className="w-4 h-4" />
              {isGeneratingCode ? 'Generating Code...' : 'Generate 6-Digit Pair Code'}
            </button>
          )}

          {/* Join with code */}
          <div className="pt-2 border-t border-neutral-800/80">
            <label className="text-[11px] text-neutral-400 block mb-1.5">
              Or link to an existing device code:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                maxLength={8}
                placeholder="e.g. 482910"
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value)}
                className="flex-1 bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-white font-mono placeholder:text-neutral-600 focus:outline-none focus:border-[#9D7BFF]"
              />
              <button
                onClick={handleClaimCode}
                disabled={isClaimingCode || !inputCode.trim()}
                className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs text-neutral-200 font-medium flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              >
                <ArrowRight className="w-3.5 h-3.5" />
                Pair
              </button>
            </div>
          </div>
        </div>

        {/* Box 2: Session ID & Direct Link */}
        <div className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
              <Link className="w-3.5 h-3.5 text-[#C6A0FF]" />
              Persistent Session Key
            </span>
            <span className="text-[11px] text-neutral-500 font-mono">ID: {sessionId.slice(0, 10)}...</span>
          </div>

          <p className="text-xs text-neutral-400">
            Share this URL directly to your mobile browser or open it in a Capacitor shell.
          </p>

          <div className="p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 flex items-center justify-between gap-2">
            <span className="text-xs font-mono text-neutral-300 truncate">
              {sessionId}
            </span>
            <button
              onClick={copySessionId}
              className="p-1.5 rounded-md hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors cursor-pointer"
              title="Copy Session ID"
            >
              {copiedSession ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>

          <button
            onClick={copyPairingUrl}
            className="w-full py-2 px-3 rounded-lg bg-neutral-800/80 hover:bg-neutral-800 border border-neutral-700/60 text-xs text-neutral-200 font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            {copiedLink ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Pairing Link Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-[#C6A0FF]" />
                <span>Copy Direct Pairing URL for Phone</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Connected Peers Status */}
      <div className="p-4 rounded-xl bg-neutral-900/40 border border-neutral-800/80 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-neutral-300 uppercase tracking-wider flex items-center gap-2">
            <Wifi className="w-3.5 h-3.5 text-emerald-400" />
            Connected Devices ({peers.length + 1})
          </span>
          <span className="text-[11px] text-neutral-500">Last Sync: {lastSyncTime}</span>
        </div>

        <div className="space-y-2">
          {/* Current Device */}
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-neutral-950/60 border border-neutral-800">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-[#9D7BFF]/20 flex items-center justify-center text-[#C6A0FF]">
                {deviceType === 'mobile' ? <Smartphone className="w-4 h-4" /> : <Laptop className="w-4 h-4" />}
              </div>
              <div>
                <span className="text-xs font-medium text-white capitalize">
                  {deviceType} <span className="text-neutral-500 text-[10px]">(This Device)</span>
                </span>
                <p className="text-[10px] text-neutral-500 font-mono">Active Controller</p>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              Active Host
            </span>
          </div>

          {/* Remote Peers */}
          {peers.map((peer) => (
            <div
              key={peer.id}
              className="flex items-center justify-between p-2.5 rounded-lg bg-neutral-950/60 border border-neutral-800"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-neutral-800 flex items-center justify-center text-neutral-300">
                  {peer.deviceType === 'mobile' ? <Smartphone className="w-4 h-4" /> : <Laptop className="w-4 h-4" />}
                </div>
                <div>
                  <span className="text-xs font-medium text-neutral-200 capitalize">
                    {peer.deviceType} Peer
                  </span>
                  <p className="text-[10px] text-neutral-500 font-mono">
                    Connected {new Date(peer.connectedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-[#9D7BFF]/10 text-[#C6A0FF] border border-[#9D7BFF]/30">
                Synced Peer
              </span>
            </div>
          ))}

          {peers.length === 0 && (
            <div className="text-center py-3 text-xs text-neutral-500">
              No companion devices paired yet. Open Mery on your phone with the code or URL above to sync state in real time.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
