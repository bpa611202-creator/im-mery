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
} from 'lucide-react';
import { ToolExecutionRecord } from '../types';
import { stateManager } from '../modules/StateManager';
import { toolManager } from '../modules/ToolManager';

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

  useEffect(() => {
    const unsub = stateManager.onToolUpdate(() => {
      setHistory([...stateManager.getToolHistory()]);
    });
    return () => unsub();
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
                Active Gemini Live tool declarations & execution telemetry
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
