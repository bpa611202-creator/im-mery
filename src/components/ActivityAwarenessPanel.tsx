import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Activity,
  Cpu,
  Battery,
  BatteryCharging,
  Wifi,
  Clock,
  Keyboard,
  MousePointer,
  Sparkles,
  Zap,
  Play,
  CheckCircle,
} from 'lucide-react';
import { activityMonitor } from '../utils/activityMonitor';
import { proactiveEngine } from '../utils/proactiveEngine';
import { ActivityContext, ActivityPattern } from '../types';

interface ActivityAwarenessPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onTriggerProactive: () => void;
}

export const ActivityAwarenessPanel: React.FC<ActivityAwarenessPanelProps> = ({
  isOpen,
  onClose,
  onTriggerProactive,
}) => {
  const [ctx, setCtx] = useState<ActivityContext>(activityMonitor.getContext());
  const [proactivityLevel, setProactivityLevel] = useState(proactiveEngine.getLevel());
  const [isTriggering, setIsTriggering] = useState(false);

  useEffect(() => {
    const unsub = activityMonitor.subscribe((newCtx) => {
      setCtx(newCtx);
    });
    return unsub;
  }, []);

  const apps: { name: string; pattern: ActivityPattern }[] = [
    { name: 'Visual Studio Code — Project M4', pattern: 'coding' },
    { name: 'Ableton Live 12 — Spatial Suite', pattern: 'video_editing' },
    { name: 'Figma — Aurora Design System', pattern: 'writing' },
    { name: 'Google Chrome — AI Research & Docs', pattern: 'studying' },
    { name: 'Steam — Cyberpunk 2077', pattern: 'gaming' },
    { name: 'YouTube — TECH GPT Live Stream', pattern: 'youtube' },
  ];

  const handleSwitchApp = (name: string, pattern: ActivityPattern) => {
    activityMonitor.switchApp(name, pattern);
  };

  const handleProactivityChange = (level: any) => {
    setProactivityLevel(level);
    proactiveEngine.setLevel(level);
  };

  const handleManualProactive = async () => {
    setIsTriggering(true);
    await onTriggerProactive();
    setTimeout(() => setIsTriggering(false), 1200);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div id="activity-awareness-modal" className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-md"
          />

          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="relative w-full max-w-2xl max-h-[90vh] bg-[#0E0A1B]/95 border border-[#E7B7A5]/25 rounded-3xl p-5 sm:p-7 shadow-[0_20px_60px_rgba(0,0,0,0.8),0_0_40px_rgba(157,123,255,0.15)] backdrop-blur-2xl flex flex-col z-10 overflow-y-auto text-[#F3EFFA]"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-[#E7B7A5]/15">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-gradient-to-br from-[#9D7BFF]/30 to-[#E7B7A5]/30 border border-[#E7B7A5]/30 text-[#E7B7A5]">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-display font-semibold text-lg text-[#F3EFFA]">
                    Activity Awareness & Autonomous Triggers
                  </h2>
                  <p className="text-xs text-[#E7B7A5]">
                    How MERY observes context and decides when to proactively speak
                  </p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="p-2 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Live Telemetry Grid */}
            <div className="my-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Focus Session */}
              <div className="p-3.5 rounded-2xl bg-[#140F24]/80 border border-[#9D7BFF]/20">
                <div className="flex items-center justify-between text-[#E7B7A5] mb-1 text-xs">
                  <span className="font-telemetry">FOCUS DURATION</span>
                  <Clock className="w-3.5 h-3.5" />
                </div>
                <div className="font-telemetry font-bold text-lg text-white">
                  {ctx.focusMinutes} <span className="text-xs font-normal text-white/50">mins</span>
                </div>
                <div className="text-[10px] text-white/50 font-light mt-0.5 capitalize">
                  Circadian: {ctx.timeOfDay.replace('_', ' ')}
                </div>
              </div>

              {/* Keystroke Intensity */}
              <div className="p-3.5 rounded-2xl bg-[#140F24]/80 border border-[#9D7BFF]/20">
                <div className="flex items-center justify-between text-[#C6A0FF] mb-1 text-xs">
                  <span className="font-telemetry">KEYSTROKES</span>
                  <Keyboard className="w-3.5 h-3.5" />
                </div>
                <div className="font-telemetry font-bold text-lg text-white">
                  {ctx.keystrokesPerMinute} <span className="text-xs font-normal text-white/50">/min</span>
                </div>
                <div className="text-[10px] text-white/50 font-light mt-0.5">
                  Real window events
                </div>
              </div>

              {/* Mouse Interaction */}
              <div className="p-3.5 rounded-2xl bg-[#140F24]/80 border border-[#9D7BFF]/20">
                <div className="flex items-center justify-between text-[#E7B7A5] mb-1 text-xs">
                  <span className="font-telemetry">MOUSE CADENCE</span>
                  <MousePointer className="w-3.5 h-3.5" />
                </div>
                <div className="font-telemetry font-bold text-lg text-white">
                  {ctx.mouseEventsPerMinute} <span className="text-xs font-normal text-white/50">/min</span>
                </div>
                <div className="text-[10px] text-white/50 font-light mt-0.5">
                  Active motion
                </div>
              </div>

              {/* Hardware / Battery */}
              <div className="p-3.5 rounded-2xl bg-[#140F24]/80 border border-[#9D7BFF]/20">
                <div className="flex items-center justify-between text-[#9D7BFF] mb-1 text-xs">
                  <span className="font-telemetry">HARDWARE</span>
                  {ctx.isCharging ? (
                    <BatteryCharging className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Battery className="w-3.5 h-3.5" />
                  )}
                </div>
                <div className="font-telemetry font-bold text-lg text-white">
                  {ctx.batteryLevel !== null ? `${ctx.batteryLevel}%` : 'AC Power'}
                </div>
                <div className="text-[10px] text-white/50 font-light mt-0.5 flex items-center gap-1">
                  <Wifi className="w-3 h-3 text-emerald-400" />
                  <span>CPU ~{ctx.cpuLoadEstimate}%</span>
                </div>
              </div>
            </div>

            {/* Current Detected Application */}
            <div className="mb-5 p-4 rounded-2xl bg-[#150F26] border border-white/10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-telemetry tracking-wider text-[#E7B7A5]">
                  ACTIVE APPLICATION & CONTEXT
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-telemetry">
                  {ctx.activityPattern.toUpperCase()}
                </span>
              </div>
              <div className="text-sm font-semibold text-white/90 mb-3">
                {ctx.currentApp}
              </div>

              <div className="text-xs text-white/60 mb-2 font-light">
                Switch simulation to see how MERY adapts her spontaneous check-ins:
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {apps.map((app) => (
                  <button
                    key={app.name}
                    onClick={() => handleSwitchApp(app.name, app.pattern)}
                    className={`px-3 py-2 rounded-xl text-xs text-left transition-all border ${
                      ctx.currentApp === app.name
                        ? 'bg-[#9D7BFF]/25 border-[#E7B7A5]/50 text-white font-medium'
                        : 'bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {app.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Proactivity Level Setting */}
            <div className="mb-5 p-4 rounded-2xl bg-[#150F26] border border-white/10">
              <div className="flex items-center justify-between mb-3">
                <div className="text-xs font-telemetry tracking-wider text-[#C6A0FF]">
                  PROACTIVE SENSITIVITY
                </div>
                <span className="text-xs text-white/50 capitalize font-telemetry">
                  Mode: {proactivityLevel}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(['silent', 'gentle', 'balanced', 'attentive'] as const).map((level) => (
                  <button
                    key={level}
                    onClick={() => handleProactivityChange(level)}
                    className={`py-2 px-2.5 rounded-xl text-xs capitalize transition-all border ${
                      proactivityLevel === level
                        ? 'bg-gradient-to-r from-[#9D7BFF]/30 to-[#E7B7A5]/30 text-white border-[#E7B7A5]/40 font-semibold shadow-[0_0_15px_rgba(157,123,255,0.2)]'
                        : 'bg-white/5 border-white/10 text-white/50 hover:text-white'
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>

              <p className="text-[11px] text-white/60 mt-2 font-light">
                {proactivityLevel === 'attentive'
                  ? 'MERY observes closely and initiates conversations whenever you have been working hard or need a break.'
                  : proactivityLevel === 'balanced'
                  ? 'MERY speaks up naturally during key milestones, long coding sessions, or late nights.'
                  : proactivityLevel === 'gentle'
                  ? 'MERY speaks occasionally, only for important wellness check-ins.'
                  : 'Proactive verbal initiation is disabled. MERY speaks only when addressed.'}
              </p>
            </div>

            {/* Trigger Proactive Check-in Now */}
            <div className="pt-2">
              <button
                onClick={handleManualProactive}
                disabled={isTriggering}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#9D7BFF] via-[#C6A0FF] to-[#E7B7A5] text-[#07060D] font-semibold text-xs tracking-wide shadow-[0_0_30px_rgba(198,160,255,0.4)] hover:shadow-[0_0_45px_rgba(231,183,165,0.6)] active:scale-[0.99] transition-all flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                <span>
                  {isTriggering
                    ? 'MERY is formulating spontaneous thought...'
                    : 'Experience MERY Proactively Initiating Conversation Aloud'}
                </span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
