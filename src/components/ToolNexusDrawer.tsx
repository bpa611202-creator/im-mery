import React, { useEffect, useState } from 'react';
import {
  X,
  Zap,
  Globe,
  Search,
  Clock,
  Shield,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Play,
  Sparkles,
  Flame,
  Heart,
  Smile,
  RotateCcw,
} from 'lucide-react';
import { ToolExecutionRecord, EmotionType } from '../types';
import { stateManager } from '../modules/StateManager';
import { toolManager } from '../modules/ToolManager';
import { emotionEngine, NakhraProfile } from '../utils/emotionEngine';

interface ToolNexusDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ToolNexusDrawer: React.FC<ToolNexusDrawerProps> = ({
  isOpen,
  onClose,
}) => {
  const [history, setHistory] = useState<ToolExecutionRecord[]>(
    stateManager.getToolHistory()
  );
  const [isExecuting, setIsExecuting] = useState<string | null>(null);
  const [nakhra, setNakhra] = useState<NakhraProfile>(emotionEngine.getNakhraProfile());
  const [currentEmotion, setCurrentEmotion] = useState<EmotionType>(
    emotionEngine.getState().dominant || 'warm'
  );

  useEffect(() => {
    const unsubTools = stateManager.onToolUpdate(() => {
      setHistory([...stateManager.getToolHistory()]);
    });
    const unsubEmotion = emotionEngine.subscribe((st) => {
      setNakhra(emotionEngine.getNakhraProfile());
      setCurrentEmotion(st.dominant || 'warm');
    });
    return () => {
      unsubTools();
      unsubEmotion();
    };
  }, []);

  if (!isOpen) return null;

  const handleTestTool = async (name: string, args: Record<string, any>) => {
    setIsExecuting(name);
    try {
      await toolManager.execute(name, args);
    } finally {
      setIsExecuting(null);
    }
  };

  const handleNudgeEmotion = (
    emotion: EmotionType,
    vectors: Partial<Record<'happiness' | 'curiosity' | 'excitement' | 'empathy' | 'confidence' | 'concern', number>>
  ) => {
    emotionEngine.setDominantEmotion(emotion);
    emotionEngine.updateEmotionVector(vectors);
  };

  return (
    <div
      id="tool_nexus_modal_overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in"
    >
      <div
        id="tool_nexus_modal_content"
        className="relative w-full max-w-2xl max-h-[85vh] flex flex-col bg-slate-900/90 border border-purple-500/30 rounded-3xl shadow-2xl overflow-hidden backdrop-blur-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">
                Modular Tool Nexus & Functions
              </h2>
              <p className="text-xs text-slate-400">
                Active Gemini Live tool declarations, execution telemetry & companion personality
              </p>
            </div>
          </div>
          <button
            id="close_tool_nexus_btn"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          {/* Nakhra Level & Attitude Visual Indicator */}
          <div
            id="mery_nakhra_indicator_card"
            className="p-5 rounded-3xl bg-gradient-to-br from-pink-950/30 via-purple-950/25 to-slate-900/60 border border-pink-500/30 shadow-xl backdrop-blur-xl relative overflow-hidden"
          >
            {/* Ambient background glow */}
            <div
              className="absolute -top-12 -right-12 w-36 h-36 rounded-full blur-3xl pointer-events-none opacity-40 transition-colors duration-700"
              style={{ background: nakhra.glowColor }}
            />

            {/* Indicator Card Header */}
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-2xl bg-gradient-to-br from-pink-500/20 to-purple-500/20 border border-pink-500/30 text-pink-400 shadow-sm">
                  {nakhra.level >= 75 ? (
                    <Flame className="w-5 h-5 text-rose-400 animate-pulse" />
                  ) : nakhra.level >= 45 ? (
                    <Sparkles className="w-5 h-5 text-pink-400" />
                  ) : (
                    <Smile className="w-5 h-5 text-emerald-400" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-white tracking-wide">
                      MERY's Nakhra Level
                    </h3>
                    <span className="text-[11px] font-medium text-pink-300/80">
                      (નખરાં & Attitude)
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Real-time playfulness, cute stubbornness & banter telemetry
                  </p>
                </div>
              </div>

              <span
                id="nakhra_tier_badge"
                className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border shadow-sm transition-all duration-300 ${nakhra.badgeColor}`}
              >
                {nakhra.tierLabel}
              </span>
            </div>

            {/* Score & Gauge Section */}
            <div className="space-y-2 mb-4">
              <div className="flex items-baseline justify-between">
                <div className="flex items-baseline gap-2">
                  <span
                    id="nakhra_score_value"
                    className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-purple-300 to-white"
                  >
                    {nakhra.level}%
                  </span>
                  <span className="text-xs font-semibold text-pink-200">
                    {nakhra.attitudeLabel}
                  </span>
                </div>
                <span className="text-[11px] text-slate-400">
                  {nakhra.subtitle}
                </span>
              </div>

              {/* Glowing Multi-step Progress Bar */}
              <div
                id="nakhra_progress_bar_track"
                className="w-full h-3.5 bg-black/60 rounded-full p-0.5 border border-white/10 overflow-hidden shadow-inner relative"
              >
                <div
                  id="nakhra_progress_bar_fill"
                  className={`h-full rounded-full bg-gradient-to-r ${nakhra.barColor} transition-all duration-500 shadow-md`}
                  style={{ width: `${Math.max(5, nakhra.level)}%` }}
                />
              </div>

              {/* Milestone labels */}
              <div className="flex items-center justify-between text-[10px] text-slate-400 px-0.5 font-medium">
                <span>0% Pure Care</span>
                <span>25% Gentle</span>
                <span>50% Cheeky</span>
                <span>75% Nakhrali</span>
                <span>100% Full Sass</span>
              </div>
            </div>

            {/* Personality Component Vector Breakdown */}
            <div
              id="nakhra_vectors_grid"
              className="grid grid-cols-3 gap-2.5 p-3 rounded-2xl bg-black/40 border border-white/5"
            >
              {/* Playfulness */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400 font-medium">Playfulness</span>
                  <span className="text-pink-300 font-semibold">{nakhra.playfulness}%</span>
                </div>
                <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-pink-400 rounded-full transition-all duration-500"
                    style={{ width: `${nakhra.playfulness}%` }}
                  />
                </div>
                <span className="text-[9px] text-slate-500 block leading-tight">મજાકિયો અંદાજ</span>
              </div>

              {/* Cute Stubbornness */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400 font-medium">Stubbornness</span>
                  <span className="text-purple-300 font-semibold">{nakhra.stubbornness}%</span>
                </div>
                <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-purple-400 rounded-full transition-all duration-500"
                    style={{ width: `${nakhra.stubbornness}%` }}
                  />
                </div>
                <span className="text-[9px] text-slate-500 block leading-tight">મીઠી હઠ / નખરાં</span>
              </div>

              {/* Affection */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400 font-medium">Affection</span>
                  <span className="text-emerald-300 font-semibold">{nakhra.affection}%</span>
                </div>
                <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-400 rounded-full transition-all duration-500"
                    style={{ width: `${nakhra.affection}%` }}
                  />
                </div>
                <span className="text-[9px] text-slate-500 block leading-tight">આંતરિક વ્હાલ</span>
              </div>
            </div>

            {/* Dynamic Gujarati Dialogue Quote Box */}
            <div
              id="nakhra_quote_box"
              className="mt-3 p-3 rounded-2xl bg-gradient-to-r from-pink-900/25 via-purple-900/20 to-slate-900/40 border border-pink-500/20 flex items-start gap-2.5"
            >
              <div className="p-1.5 rounded-lg bg-pink-500/20 text-pink-300 shrink-0 mt-0.5">
                <Heart className="w-3.5 h-3.5 fill-pink-400/40 text-pink-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-pink-100 italic leading-relaxed">
                  "{nakhra.gujaratiRemark}"
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] text-slate-400">
                    Current Voice & Tag:
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-pink-950/80 text-pink-300 border border-pink-800/40">
                    [emotion: {currentEmotion}]
                  </span>
                </div>
              </div>
            </div>

            {/* Interactive Emotion/Attitude Simulator */}
            <div className="mt-3 pt-3 border-t border-white/10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <Sliders className="w-3 h-3 text-pink-400" />
                  Live Mood & Attitude Simulator
                </span>
                <span className="text-[10px] text-slate-500">Tap to calibrate</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                <button
                  id="btn_sim_full_nakhra"
                  onClick={() =>
                    handleNudgeEmotion('playful', {
                      happiness: 95,
                      excitement: 90,
                      confidence: 95,
                      concern: 5,
                    })
                  }
                  className="py-1.5 px-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 text-[11px] font-medium border border-rose-500/30 transition-all flex items-center justify-center gap-1"
                >
                  <span>💅 Full Nakhra</span>
                </button>
                <button
                  id="btn_sim_sassy_banter"
                  onClick={() =>
                    handleNudgeEmotion('excited', {
                      happiness: 85,
                      excitement: 80,
                      confidence: 85,
                      concern: 10,
                    })
                  }
                  className="py-1.5 px-2 rounded-xl bg-pink-500/15 hover:bg-pink-500/25 text-pink-300 text-[11px] font-medium border border-pink-500/30 transition-all flex items-center justify-center gap-1"
                >
                  <span>✨ Sassy Banter</span>
                </button>
                <button
                  id="btn_sim_gentle_care"
                  onClick={() =>
                    handleNudgeEmotion('warm', {
                      happiness: 75,
                      excitement: 40,
                      confidence: 80,
                      empathy: 90,
                      concern: 15,
                    })
                  }
                  className="py-1.5 px-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 text-[11px] font-medium border border-emerald-500/30 transition-all flex items-center justify-center gap-1"
                >
                  <span>🌸 Gentle Care</span>
                </button>
                <button
                  id="btn_sim_pure_empathy"
                  onClick={() =>
                    handleNudgeEmotion('supportive', {
                      happiness: 60,
                      excitement: 20,
                      confidence: 80,
                      empathy: 98,
                      concern: 80,
                    })
                  }
                  className="py-1.5 px-2 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 text-[11px] font-medium border border-cyan-500/30 transition-all flex items-center justify-center gap-1"
                >
                  <span>🤍 Pure Empathy</span>
                </button>
              </div>
            </div>
          </div>

          {/* Registered Tools Grid */}
          <div>
            <h3 className="text-xs font-semibold text-purple-300 uppercase tracking-wider mb-3">
              Registered Browser & System Actions
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Tool 1: openWebsite */}
              <div className="p-3 rounded-2xl bg-white/5 border border-white/10 hover:border-purple-500/40 transition-colors flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-cyan-400" />
                      openWebsite
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800">
                      Browser
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 line-clamp-2">
                    Opens any target website or link in a new tab upon request.
                  </p>
                </div>
                <button
                  id="test_open_website_btn"
                  onClick={() =>
                    handleTestTool('openWebsite', {
                      url: 'https://google.com',
                      title: 'Google',
                    })
                  }
                  disabled={isExecuting === 'openWebsite'}
                  className="mt-3 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 text-xs font-medium border border-cyan-500/30 transition-all"
                >
                  <Play className="w-3 h-3" />
                  <span>Test: Open Google</span>
                </button>
              </div>

              {/* Tool 2: searchWeb */}
              <div className="p-3 rounded-2xl bg-white/5 border border-white/10 hover:border-purple-500/40 transition-colors flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                      <Search className="w-3.5 h-3.5 text-amber-400" />
                      searchWeb
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-800">
                      Live Web
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 line-clamp-2">
                    Queries the live web for current facts, news, and live answers.
                  </p>
                </div>
                <button
                  id="test_search_web_btn"
                  onClick={() =>
                    handleTestTool('searchWeb', {
                      query: 'Latest advancements in Gemini models',
                    })
                  }
                  disabled={isExecuting === 'searchWeb'}
                  className="mt-3 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 text-xs font-medium border border-amber-500/30 transition-all"
                >
                  <Play className="w-3 h-3" />
                  <span>Test: Search Web</span>
                </button>
              </div>

              {/* Tool 3: getSystemStatus */}
              <div className="p-3 rounded-2xl bg-white/5 border border-white/10 hover:border-purple-500/40 transition-colors flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-emerald-400" />
                      getSystemStatus
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800">
                      Context
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 line-clamp-2">
                    Reads battery level, current time, online state, and companion status.
                  </p>
                </div>
                <button
                  id="test_system_status_btn"
                  onClick={() => handleTestTool('getSystemStatus', {})}
                  disabled={isExecuting === 'getSystemStatus'}
                  className="mt-3 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 text-xs font-medium border border-emerald-500/30 transition-all"
                >
                  <Play className="w-3 h-3" />
                  <span>Test: Get Status</span>
                </button>
              </div>

              {/* Tool 4: executeDangerousAction */}
              <div className="p-3 rounded-2xl bg-white/5 border border-white/10 hover:border-purple-500/40 transition-colors flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-rose-400" />
                      executeDangerousAction
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-950 text-rose-300 border border-rose-800">
                      Protected
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 line-clamp-2">
                    Strict safety protocol requiring user confirmation modal before execution.
                  </p>
                </div>
                <button
                  id="test_dangerous_action_btn"
                  onClick={() =>
                    handleTestTool('executeDangerousAction', {
                      actionName: 'Purge Companion Memory Cache',
                      target: 'All session memories',
                    })
                  }
                  disabled={isExecuting === 'executeDangerousAction'}
                  className="mt-3 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 text-xs font-medium border border-rose-500/30 transition-all"
                >
                  <Play className="w-3 h-3" />
                  <span>Test Safety Check</span>
                </button>
              </div>
            </div>
          </div>

          {/* Live Execution Telemetry Logs */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-purple-300 uppercase tracking-wider">
                Live Execution Telemetry ({history.length})
              </h3>
              {history.length > 0 && (
                <span className="text-[11px] text-slate-400">
                  Most recent first
                </span>
              )}
            </div>

            {history.length === 0 ? (
              <div className="p-6 rounded-2xl bg-white/5 border border-white/5 text-center text-slate-400 text-xs">
                No tools executed yet. Speak to MERY (e.g. "Open YouTube", "Search for space photos") or tap a test button above.
              </div>
            ) : (
              <div className="space-y-2.5">
                {history.map((item, idx) => (
                  <div
                    key={`${item.id || 'tool'}_${item.status}_${idx}`}
                    className="p-3.5 rounded-2xl bg-slate-950/70 border border-white/10 space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {item.status === 'success' ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        ) : item.status === 'failed' ? (
                          <AlertCircle className="w-4 h-4 text-rose-400" />
                        ) : (
                          <Zap className="w-4 h-4 text-amber-400 animate-spin" />
                        )}
                        <span className="text-xs font-semibold text-white">
                          {item.name}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {item.timestamp}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-300 font-mono bg-black/40 px-2.5 py-1.5 rounded-lg overflow-x-auto">
                      <span className="text-slate-500">args: </span>
                      {JSON.stringify(item.args)}
                    </div>

                    {item.result && (
                      <div className="text-[11px] text-emerald-300/90 font-mono bg-black/40 px-2.5 py-1.5 rounded-lg overflow-x-auto">
                        <span className="text-slate-500">result: </span>
                        {JSON.stringify(item.result)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-white/10 bg-white/5 flex items-center justify-between text-xs text-slate-400">
          <span>Decoupled AI reasoning & modular execution</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
