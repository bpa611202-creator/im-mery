import React, { useEffect, useState } from 'react';
import { PhoneCall, PhoneOff, Mic } from 'lucide-react';
import { telephonyBridge, IncomingCallEvent } from '../modules/TelephonyBridge';

export const IncomingCallBanner: React.FC = () => {
  const [call, setCall] = useState<IncomingCallEvent | null>(telephonyBridge.getCurrentCall());

  useEffect(() => {
    const unsub = telephonyBridge.subscribe((incoming) => {
      setCall(incoming);
    });
    return unsub;
  }, []);

  if (!call || call.status !== 'ringing') return null;

  return (
    <div
      id="incoming-call-banner"
      className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-md p-4 rounded-2xl bg-neutral-900/95 border border-purple-500/40 shadow-2xl backdrop-blur-xl animate-bounce-in text-neutral-100"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-12 h-12 rounded-full bg-blue-500/20 border border-blue-400/40 flex items-center justify-center text-blue-400 animate-pulse">
              <PhoneCall className="w-6 h-6" />
            </div>
            <div className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 animate-ping" />
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-purple-400 font-semibold flex items-center gap-1.5">
              <span>Incoming Call</span>
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
              <span className="text-[10px] text-neutral-400 font-mono">Voice Controlled</span>
            </div>
            <h3 className="text-base font-bold text-white">{call.callerName}</h3>
            <p className="text-xs text-neutral-400 font-mono">{call.phoneNumber}</p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <button
            id="btn-reject-call"
            onClick={() => telephonyBridge.rejectCall()}
            className="w-10 h-10 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center transition-transform hover:scale-105 shadow-lg shadow-rose-600/30"
            title="Decline Call"
          >
            <PhoneOff className="w-5 h-5" />
          </button>
          <button
            id="btn-accept-call"
            onClick={() => telephonyBridge.acceptCall()}
            className="w-10 h-10 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center transition-transform hover:scale-105 shadow-lg shadow-emerald-600/30 animate-pulse"
            title="Accept Call"
          >
            <PhoneCall className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="mt-2 pt-2 border-t border-neutral-800/80 flex items-center justify-between text-[11px] text-neutral-400">
        <span className="flex items-center gap-1 text-purple-300">
          <Mic className="w-3 h-3 text-purple-400" />
          Speak to control: &quot;Accept&quot; or &quot;Reject&quot;
        </span>
        <span className="font-gujarati text-neutral-400">
          &quot;ઉપાડ&quot; / &quot;કાપી નાખ&quot;
        </span>
      </div>
    </div>
  );
};
