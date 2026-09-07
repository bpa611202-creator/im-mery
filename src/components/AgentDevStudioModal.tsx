import React, { useState, useEffect } from 'react';
import {
  X,
  Cpu,
  Play,
  CheckCircle2,
  AlertCircle,
  Clock,
  Zap,
  Sliders,
  Sparkles,
  Bot,
  BrainCircuit,
  Eye,
  Terminal,
  Database,
  Users,
  Search,
  Copy,
  Check,
  Plus,
  Trash2,
  Download,
  Upload,
  RefreshCw,
  ExternalLink,
  Layers,
  ArrowRight,
} from 'lucide-react';
import {
  AgentArchetype,
  AgentBlueprint,
  AgentExecutionTrace,
  AgentExecutionStep,
} from '../types';
import {
  agentDevService,
  DEFAULT_AGENT_BLUEPRINTS,
} from '../modules/AgentDevService';
import { stateManager } from '../modules/StateManager';

interface AgentDevStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectActiveAgent?: (blueprint: AgentBlueprint) => void;
}

const ARCHETYPE_ICONS: Record<AgentArchetype, React.FC<{ className?: string }>> = {
  REACTIVE_CONVERSATIONAL: Bot,
  REACT_REASONING: BrainCircuit,
  AUTONOMOUS_GOAL_DIRECTED: Layers,
  TOOL_CALLING_SYSTEM: Zap,
  MULTI_AGENT_SWARM: Users,
  MULTIMODAL_VISION: Eye,
  MEMORY_REFLECTION: Database,
  CODE_ENGINEERING: Terminal,
};

const ARCHETYPE_COLORS: Record<
  AgentArchetype,
  { badgeBg: string; text: string; border: string; glow: string }
> = {
  REACTIVE_CONVERSATIONAL: {
    badgeBg: 'bg-rose-500/20',
    text: 'text-rose-300',
    border: 'border-rose-500/40',
    glow: 'shadow-rose-500/20',
  },
  REACT_REASONING: {
    badgeBg: 'bg-amber-500/20',
    text: 'text-amber-300',
    border: 'border-amber-500/40',
    glow: 'shadow-amber-500/20',
  },
  AUTONOMOUS_GOAL_DIRECTED: {
    badgeBg: 'bg-indigo-500/20',
    text: 'text-indigo-300',
    border: 'border-indigo-500/40',
    glow: 'shadow-indigo-500/20',
  },
  TOOL_CALLING_SYSTEM: {
    badgeBg: 'bg-emerald-500/20',
    text: 'text-emerald-300',
    border: 'border-emerald-500/40',
    glow: 'shadow-emerald-500/20',
  },
  MULTI_AGENT_SWARM: {
    badgeBg: 'bg-purple-500/20',
    text: 'text-purple-300',
    border: 'border-purple-500/40',
    glow: 'shadow-purple-500/20',
  },
  MULTIMODAL_VISION: {
    badgeBg: 'bg-cyan-500/20',
    text: 'text-cyan-300',
    border: 'border-cyan-500/40',
    glow: 'shadow-cyan-500/20',
  },
  MEMORY_REFLECTION: {
    badgeBg: 'bg-pink-500/20',
    text: 'text-pink-300',
    border: 'border-pink-500/40',
    glow: 'shadow-pink-500/20',
  },
  CODE_ENGINEERING: {
    badgeBg: 'bg-sky-500/20',
    text: 'text-sky-300',
    border: 'border-sky-500/40',
    glow: 'shadow-sky-500/20',
  },
};

const PRESET_PROMPTS: Record<AgentArchetype, string[]> = {
  REACTIVE_CONVERSATIONAL: [
    'How are you feeling today MERY? What should we build next?',
    'Give me a warm, motivating 2-sentence morning greeting.',
  ],
  REACT_REASONING: [
    'Should we use server-sent events or websockets for 100k live audio streams? Break down the step-by-step reasoning.',
    'Verify if quantum computing can currently break RSA-2048 encryption using real search telemetry.',
  ],
  AUTONOMOUS_GOAL_DIRECTED: [
    'Plan and execute an end-to-end multi-cloud backup strategy with automated validation.',
    'Architect a high-performance voice-to-text pipeline with fallback and error mitigation.',
  ],
  TOOL_CALLING_SYSTEM: [
    'Search the web for the newest Gemini 2.5 Flash benchmarks and summarize latency metrics.',
    'Check local system health status, memory footprint, and server uptime.',
  ],
  MULTI_AGENT_SWARM: [
    'Design an autonomous real-time voice translation system with edge deployment and low-latency audio codec.',
    'Develop a complete disaster recovery blueprint for our distributed microservices.',
  ],
  MULTIMODAL_VISION: [
    'Inspect my screen display, diagnose visual bugs or missing UI padding, and suggest layout fixes.',
    'Examine the active terminal window and explain any visible compiler errors.',
  ],
  MEMORY_REFLECTION: [
    'Reflect on my recent development projects and preferences, and advise on our optimal workflow.',
    'Synthesize our interaction history into 3 core user principles.',
  ],
  CODE_ENGINEERING: [
    'Write a resilient TypeScript WebSocket reconnection manager with exponential backoff and jitter.',
    'Create an in-memory LRU Cache in TypeScript with O(1) time complexity and full unit test specifications.',
  ],
};

export const AgentDevStudioModal: React.FC<AgentDevStudioModalProps> = ({
  isOpen,
  onClose,
  onSelectActiveAgent,
}) => {
  const [blueprints, setBlueprints] = useState<AgentBlueprint[]>(
    agentDevService.getAllBlueprints()
  );
  const [activeBlueprint, setActiveBlueprint] = useState<AgentBlueprint>(
    agentDevService.getActiveBlueprint()
  );
  const [selectedBlueprint, setSelectedBlueprint] = useState<AgentBlueprint>(
    agentDevService.getActiveBlueprint()
  );
  const [activeTab, setActiveTab] = useState<'matrix' | 'playground' | 'architect'>('matrix');
  const [goalInput, setGoalInput] = useState<string>('');
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [trace, setTrace] = useState<AgentExecutionTrace | null>(
    agentDevService.getActiveTrace()
  );
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Architect form state
  const [editingBlueprint, setEditingBlueprint] = useState<AgentBlueprint>(
    agentDevService.getActiveBlueprint()
  );
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    const unsub = agentDevService.subscribe(() => {
      setBlueprints(agentDevService.getAllBlueprints());
      setActiveBlueprint(agentDevService.getActiveBlueprint());
      setTrace(agentDevService.getActiveTrace());
    });
    return () => unsub();
  }, []);

  if (!isOpen) return null;

  const handleSelectActive = (bp: AgentBlueprint) => {
    agentDevService.setActiveBlueprint(bp.id);
    setActiveBlueprint(bp);
    stateManager.notify(`Active agent switched to ${bp.name}`, 'success');
    if (onSelectActiveAgent) {
      onSelectActiveAgent(bp);
    }
  };

  const handleRunAgent = async (customGoal?: string) => {
    const promptToRun = (customGoal || goalInput).trim();
    if (!promptToRun) return;

    setIsRunning(true);
    try {
      await agentDevService.executeAgent(selectedBlueprint, promptToRun);
      stateManager.notify(
        `${selectedBlueprint.name} finished execution run.`,
        'success'
      );
    } catch (err: any) {
      stateManager.notify(`Agent Run Failed: ${err?.message}`, 'warning');
    } finally {
      setIsRunning(false);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSaveBlueprint = () => {
    if (editingBlueprint.isCustom) {
      agentDevService.updateBlueprint(editingBlueprint.id, editingBlueprint);
      setSaveSuccessMsg('Blueprint updated successfully!');
    } else {
      const created = agentDevService.createBlueprint({
        ...editingBlueprint,
        name: `${editingBlueprint.name} (Custom)`,
      });
      setSelectedBlueprint(created);
      setEditingBlueprint(created);
      setSaveSuccessMsg('New Custom Blueprint saved to library!');
    }
    setTimeout(() => setSaveSuccessMsg(null), 3000);
  };

  const handleExportJson = () => {
    const jsonStr = agentDevService.exportBlueprintJson(selectedBlueprint);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedBlueprint.name.toLowerCase().replace(/\s+/g, '_')}_blueprint.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = ev.target?.result as string;
        const imported = agentDevService.importBlueprintJson(text);
        setSelectedBlueprint(imported);
        setEditingBlueprint(imported);
        setActiveTab('architect');
        stateManager.notify(`Imported ${imported.name} successfully!`, 'success');
      } catch (err: any) {
        stateManager.notify(`Import failed: ${err?.message}`, 'warning');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div
      id="agent_dev_studio_overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-fade-in"
    >
      <div
        id="agent_dev_studio_modal"
        className="relative w-full max-w-5xl max-h-[92vh] flex flex-col bg-[#0d0a1a]/95 border border-[#9D7BFF]/40 rounded-3xl shadow-[0_0_50px_rgba(157,123,255,0.25)] overflow-hidden backdrop-blur-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-[#9D7BFF]/30 to-[#E7B7A5]/30 border border-[#9D7BFF]/40 text-[#E7B7A5]">
              <Cpu className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-wide">
                  ALL-TYPE AGENT DEVELOPMENT STUDIO
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-[#9D7BFF]/20 text-[#C6A0FF] border border-[#9D7BFF]/30 text-[10px] font-mono">
                  8 ARCHETYPES
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Architect, simulate, inspect, and deploy autonomous AI agent archetypes.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Active Agent Badge */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-purple-500/10 border border-purple-500/30 text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-slate-400">Active Core:</span>
              <span className="font-semibold text-white">{activeBlueprint.name}</span>
            </div>

            <button
              id="close_agent_dev_modal_btn"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center justify-between px-6 py-2.5 bg-black/40 border-b border-white/5">
          <div className="flex items-center gap-1.5">
            <button
              id="tab_agent_matrix_btn"
              onClick={() => setActiveTab('matrix')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
                activeTab === 'matrix'
                  ? 'bg-[#9D7BFF] text-white shadow-md shadow-[#9D7BFF]/30'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Agent Matrix & Archetypes ({blueprints.length})
            </button>
            <button
              id="tab_agent_playground_btn"
              onClick={() => setActiveTab('playground')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
                activeTab === 'playground'
                  ? 'bg-[#9D7BFF] text-white shadow-md shadow-[#9D7BFF]/30'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Play className="w-3.5 h-3.5" />
              Live Playground & Trace Inspector
              {isRunning && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              )}
            </button>
            <button
              id="tab_agent_architect_btn"
              onClick={() => {
                setEditingBlueprint({ ...selectedBlueprint });
                setActiveTab('architect');
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
                activeTab === 'architect'
                  ? 'bg-[#9D7BFF] text-white shadow-md shadow-[#9D7BFF]/30'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              Blueprint Architect
            </button>
          </div>

          {/* Quick actions: Import / Export */}
          <div className="hidden md:flex items-center gap-2">
            <label
              htmlFor="agent_import_input"
              className="cursor-pointer px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-medium border border-white/10 flex items-center gap-1.5 transition-colors"
              title="Import Agent Blueprint JSON"
            >
              <Upload className="w-3.5 h-3.5 text-[#E7B7A5]" />
              Import
            </label>
            <input
              id="agent_import_input"
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleImportJson}
            />
            <button
              onClick={handleExportJson}
              className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-medium border border-white/10 flex items-center gap-1.5 transition-colors"
              title="Export Current Blueprint JSON"
            >
              <Download className="w-3.5 h-3.5 text-[#C6A0FF]" />
              Export
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-gradient-to-b from-transparent to-black/20">
          {/* ========================================================================= */}
          {/* TAB 1: AGENT MATRIX & ARCHETYPES                                         */}
          {/* ========================================================================= */}
          {activeTab === 'matrix' && (
            <div className="space-y-6">
              {/* Architecture Overview Banner */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-950/40 via-slate-900/50 to-indigo-950/40 border border-purple-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#E7B7A5]" />
                    Complete 8-Archetype Agent Development Matrix
                  </h3>
                  <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                    MERY supports the entire continuum of autonomous AI agent architecture: direct reactive reflex, ReAct reasoning scratchpads, autonomous goal planners, cybernetic tool execution, multi-agent swarms, multimodal visual grounding, long-term memory reflection, and code sandboxes.
                  </p>
                </div>
                <button
                  id="btn-create-custom-agent"
                  onClick={() => {
                    const newBp = agentDevService.createBlueprint({
                      name: 'My Custom Agent',
                      archetype: 'AUTONOMOUS_GOAL_DIRECTED',
                      tagline: 'Custom purpose-built agent',
                      description: 'Engineered custom agent blueprint.',
                      systemInstruction: 'You are a custom AI agent tailored to achieve targeted goals.',
                      model: 'gemini-2.5-flash',
                      temperature: 0.4,
                      maxSteps: 6,
                      allowedTools: ['searchWeb', 'getSystemStatus'],
                      memoryRecall: true,
                      visionEnabled: false,
                    });
                    setSelectedBlueprint(newBp);
                    setEditingBlueprint(newBp);
                    setActiveTab('architect');
                  }}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#9D7BFF] to-indigo-600 hover:brightness-110 text-white text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-purple-900/30 whitespace-nowrap shrink-0 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  New Custom Agent
                </button>
              </div>

              {/* Agent Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {blueprints.map((bp) => {
                  const Icon = ARCHETYPE_ICONS[bp.archetype] || Bot;
                  const color = ARCHETYPE_COLORS[bp.archetype] || ARCHETYPE_COLORS.REACTIVE_CONVERSATIONAL;
                  const isActive = activeBlueprint.id === bp.id;
                  const isSelected = selectedBlueprint.id === bp.id;

                  return (
                    <div
                      key={bp.id}
                      className={`p-4 rounded-2xl transition-all border flex flex-col justify-between ${
                        isSelected
                          ? 'bg-[#18112e] border-[#9D7BFF] shadow-[0_0_20px_rgba(157,123,255,0.2)]'
                          : 'bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/[0.07]'
                      }`}
                    >
                      <div>
                        {/* Header info */}
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2.5">
                            <div
                              className={`p-2 rounded-xl border ${color.badgeBg} ${color.border} ${color.text}`}
                            >
                              <Icon className="w-4 h-4" />
                            </div>
                            <div>
                              <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                                {bp.name}
                                {bp.isCustom && (
                                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                                    Custom
                                  </span>
                                )}
                              </h4>
                              <p className="text-[11px] text-[#E7B7A5]">
                                {bp.tagline}
                              </p>
                            </div>
                          </div>

                          {/* Active Pill */}
                          {isActive ? (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-semibold flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              Active Core
                            </span>
                          ) : (
                            <button
                              id={`set-core-${bp.id}`}
                              onClick={() => handleSelectActive(bp)}
                              className="px-2 py-0.5 rounded-full bg-white/5 hover:bg-white/15 text-slate-400 hover:text-white border border-white/10 text-[10px] transition-colors"
                            >
                              Set as Core
                            </button>
                          )}
                        </div>

                        {/* Description */}
                        <p className="text-xs text-slate-300 line-clamp-2 my-2.5 leading-relaxed">
                          {bp.description}
                        </p>

                        {/* Specs & Badges */}
                        <div className="flex flex-wrap items-center gap-1.5 my-2">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-mono border ${color.badgeBg} ${color.text} ${color.border}`}
                          >
                            {bp.archetype.replace(/_/g, ' ')}
                          </span>
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-white/5 text-slate-300 border border-white/10">
                            {bp.model}
                          </span>
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-white/5 text-slate-300 border border-white/10">
                            temp: {bp.temperature}
                          </span>
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-white/5 text-slate-300 border border-white/10">
                            maxSteps: {bp.maxSteps}
                          </span>
                          {bp.visionEnabled && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 flex items-center gap-1">
                              <Eye className="w-2.5 h-2.5" />
                              Vision
                            </span>
                          )}
                          {bp.memoryRecall && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] bg-pink-500/10 text-pink-300 border border-pink-500/20 flex items-center gap-1">
                              <Database className="w-2.5 h-2.5" />
                              Memories
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Card Footer Actions */}
                      <div className="flex items-center justify-between pt-3 border-t border-white/5 mt-2">
                        <span className="text-[11px] text-slate-400">
                          {bp.allowedTools.length} tools bound
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            id={`btn-inspect-bp-${bp.id}`}
                            onClick={() => {
                              setSelectedBlueprint(bp);
                              setEditingBlueprint(bp);
                              setActiveTab('architect');
                            }}
                            className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-medium border border-white/10 transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            id={`btn-play-bp-${bp.id}`}
                            onClick={() => {
                              setSelectedBlueprint(bp);
                              setGoalInput(PRESET_PROMPTS[bp.archetype]?.[0] || '');
                              setActiveTab('playground');
                            }}
                            className="px-3 py-1 rounded-lg bg-[#9D7BFF]/20 hover:bg-[#9D7BFF]/30 text-[#E7B7A5] text-xs font-semibold border border-[#9D7BFF]/40 flex items-center gap-1 transition-all"
                          >
                            <Play className="w-3 h-3 text-[#E7B7A5]" />
                            Playground
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: LIVE PLAYGROUND & TRACE INSPECTOR                                 */}
          {/* ========================================================================= */}
          {activeTab === 'playground' && (
            <div className="space-y-6">
              {/* Selected Agent Playground Header */}
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2.5 rounded-xl border ${ARCHETYPE_COLORS[selectedBlueprint.archetype].badgeBg} ${ARCHETYPE_COLORS[selectedBlueprint.archetype].border} ${ARCHETYPE_COLORS[selectedBlueprint.archetype].text}`}
                  >
                    {React.createElement(
                      ARCHETYPE_ICONS[selectedBlueprint.archetype] || Bot,
                      { className: 'w-5 h-5' }
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-white">
                        {selectedBlueprint.name}
                      </h3>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-mono border border-purple-500/30">
                        {selectedBlueprint.archetype}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">
                      {selectedBlueprint.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleSelectActive(selectedBlueprint)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                      activeBlueprint.id === selectedBlueprint.id
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/10'
                    }`}
                  >
                    {activeBlueprint.id === selectedBlueprint.id
                      ? '✓ Active MERY Core'
                      : 'Set as MERY Core'}
                  </button>
                </div>
              </div>

              {/* Swarm Syndicate Flow Visualizer (Only for MULTI_AGENT_SWARM) */}
              {selectedBlueprint.archetype === 'MULTI_AGENT_SWARM' && (
                <div className="p-4 rounded-2xl bg-[#130d24] border border-purple-500/30">
                  <h4 className="text-xs font-semibold text-purple-300 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Users className="w-3.5 h-3.5" />
                    Autonomous Swarm Collaborative Topology
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {[
                      { role: 'Lead Orchestrator', desc: 'Strategy & Work Orders' },
                      { role: 'Deep Researcher', desc: 'Real Web & Knowledge' },
                      { role: 'Software Architect', desc: 'Code & Architecture' },
                      { role: 'Critical Evaluator', desc: 'Edge Cases & Safety' },
                      { role: 'Executive Synthesizer', desc: 'Unified Delivery' },
                    ].map((member, i) => (
                      <div
                        key={i}
                        className="p-2.5 rounded-xl bg-purple-950/40 border border-purple-500/20 text-center"
                      >
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 font-mono">
                          Agent #{i + 1}
                        </span>
                        <div className="text-xs font-bold text-white mt-1">
                          {member.role}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {member.desc}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Goal Input Box & Presets */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5 text-[#E7B7A5]" />
                    Objective / Task Directive
                  </label>

                  {/* Preset Pills */}
                  <div className="hidden sm:flex items-center gap-1.5">
                    <span className="text-[10px] text-slate-500">Presets:</span>
                    {PRESET_PROMPTS[selectedBlueprint.archetype]?.map((pr, idx) => (
                      <button
                        key={idx}
                        onClick={() => setGoalInput(pr)}
                        className="text-[10px] px-2 py-0.5 rounded-md bg-white/5 hover:bg-white/10 text-[#E7B7A5] border border-white/5 truncate max-w-[180px]"
                        title={pr}
                      >
                        Example #{idx + 1}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="relative">
                  <textarea
                    id="agent_goal_input"
                    rows={3}
                    value={goalInput}
                    onChange={(e) => setGoalInput(e.target.value)}
                    placeholder={`Enter goal or directive for ${selectedBlueprint.name}...`}
                    className="w-full px-4 py-3 rounded-2xl bg-black/50 border border-white/10 text-white placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:border-[#9D7BFF] focus:ring-1 focus:ring-[#9D7BFF] transition-all resize-none"
                  />
                  <div className="absolute right-3 bottom-3 flex items-center gap-2">
                    <button
                      id="btn-run-agent-execution"
                      disabled={isRunning || !goalInput.trim()}
                      onClick={() => handleRunAgent()}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#9D7BFF] to-indigo-600 hover:brightness-110 disabled:opacity-40 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-purple-900/30 transition-all"
                    >
                      {isRunning ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          Executing Loop...
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5 fill-current" />
                          Run Agent
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Execution Trace & Telemetry */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-[#C6A0FF]" />
                      Execution Telemetry & Trace
                    </h4>
                    {trace && (
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-semibold ${
                          trace.status === 'completed'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : trace.status === 'running'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse'
                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        }`}
                      >
                        {trace.status.toUpperCase()}
                      </span>
                    )}
                  </div>

                  {trace && (
                    <div className="flex items-center gap-3 text-xs text-slate-400 font-mono">
                      <span>Steps: {trace.metrics.stepsCount}</span>
                      <span>Time: {trace.metrics.durationMs}ms</span>
                      <button
                        onClick={() => agentDevService.clearTrace()}
                        className="text-[11px] text-slate-500 hover:text-white transition-colors"
                      >
                        Clear
                      </button>
                    </div>
                  )}
                </div>

                {/* Steps Container */}
                {!trace || trace.steps.length === 0 ? (
                  <div className="p-8 rounded-2xl bg-black/30 border border-white/5 text-center text-slate-500 text-xs space-y-1">
                    <BrainCircuit className="w-6 h-6 mx-auto text-slate-600 mb-2" />
                    <p>No active execution trace yet.</p>
                    <p className="text-[11px] text-slate-600">
                      Enter a directive above and click "Run Agent" to observe step-by-step cognitive actions.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {trace.steps.map((st) => {
                      const isThought = st.type === 'thought';
                      const isAction = st.type === 'action';
                      const isObs = st.type === 'observation';
                      const isOutput = st.type === 'final_output';
                      const isSubagent =
                        st.type === 'subagent_dispatch' ||
                        st.type === 'subagent_response';

                      return (
                        <div
                          key={st.stepNumber}
                          className={`p-4 rounded-2xl border transition-all text-xs ${
                            isOutput
                              ? 'bg-gradient-to-r from-purple-950/60 to-indigo-950/60 border-purple-500/50 shadow-lg'
                              : isThought
                              ? 'bg-amber-500/[0.04] border-amber-500/20'
                              : isAction
                              ? 'bg-emerald-500/[0.04] border-emerald-500/20'
                              : isObs
                              ? 'bg-cyan-500/[0.04] border-cyan-500/20'
                              : 'bg-white/5 border-white/10'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-slate-300">
                                #{st.stepNumber}
                              </span>
                              <span className="font-semibold text-white">
                                {st.title}
                              </span>
                              {st.agentRole && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                  {st.agentRole}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-slate-500 font-mono">
                                {st.timestamp}
                              </span>
                              <button
                                onClick={() =>
                                  handleCopy(st.content, `step_${st.stepNumber}`)
                                }
                                className="text-slate-500 hover:text-white transition-colors"
                                title="Copy content"
                              >
                                {copiedId === `step_${st.stepNumber}` ? (
                                  <Check className="w-3 h-3 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            </div>
                          </div>

                          <div className="text-slate-300 leading-relaxed whitespace-pre-wrap font-sans">
                            {st.content}
                          </div>

                          {/* Tool Call Artifact Preview if present */}
                          {st.toolCall && (
                            <div className="mt-2.5 p-2.5 rounded-xl bg-black/50 border border-white/10 font-mono text-[11px] text-emerald-300">
                              <div className="text-[10px] text-slate-500 uppercase">
                                Tool Call Telemetry
                              </div>
                              <div className="text-slate-200 mt-1">
                                {st.toolCall.name}(
                                {JSON.stringify(st.toolCall.args)})
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 3: BLUEPRINT ARCHITECT & JSON EDITOR                                 */}
          {/* ========================================================================= */}
          {activeTab === 'architect' && (
            <div className="space-y-6">
              {/* Success Notification */}
              {saveSuccessMsg && (
                <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2 animate-fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  {saveSuccessMsg}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Column: Form Controls */}
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">
                      Agent Name
                    </label>
                    <input
                      type="text"
                      value={editingBlueprint.name}
                      onChange={(e) =>
                        setEditingBlueprint({
                          ...editingBlueprint,
                          name: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:outline-none focus:border-[#9D7BFF]"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">
                      Archetype Paradigm
                    </label>
                    <select
                      value={editingBlueprint.archetype}
                      onChange={(e) =>
                        setEditingBlueprint({
                          ...editingBlueprint,
                          archetype: e.target.value as AgentArchetype,
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl bg-[#161026] border border-white/10 text-white text-xs focus:outline-none focus:border-[#9D7BFF]"
                    >
                      <option value="REACTIVE_CONVERSATIONAL">
                        Reactive Reflex (Zero-Latency Companion)
                      </option>
                      <option value="REACT_REASONING">
                        ReAct Reasoning (Thought-Action-Observation)
                      </option>
                      <option value="AUTONOMOUS_GOAL_DIRECTED">
                        Autonomous Goal-Directed (Plan & Execute)
                      </option>
                      <option value="TOOL_CALLING_SYSTEM">
                        Tool-Calling & System Operator
                      </option>
                      <option value="MULTI_AGENT_SWARM">
                        Multi-Agent Collaborative Swarm
                      </option>
                      <option value="MULTIMODAL_VISION">
                        Multimodal Vision & Screen Perception
                      </option>
                      <option value="MEMORY_REFLECTION">
                        Episodic Memory & Persona Biographer
                      </option>
                      <option value="CODE_ENGINEERING">
                        Full-Stack Software Engineer
                      </option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">
                      Tagline
                    </label>
                    <input
                      type="text"
                      value={editingBlueprint.tagline}
                      onChange={(e) =>
                        setEditingBlueprint({
                          ...editingBlueprint,
                          tagline: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:outline-none focus:border-[#9D7BFF]"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">
                      Description
                    </label>
                    <input
                      type="text"
                      value={editingBlueprint.description}
                      onChange={(e) =>
                        setEditingBlueprint({
                          ...editingBlueprint,
                          description: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:outline-none focus:border-[#9D7BFF]"
                    />
                  </div>

                  {/* Sliders: Temperature & MaxSteps */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="flex justify-between text-xs text-slate-300 mb-1">
                        <span>Temperature</span>
                        <span className="font-mono text-[#E7B7A5]">
                          {editingBlueprint.temperature}
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={editingBlueprint.temperature}
                        onChange={(e) =>
                          setEditingBlueprint({
                            ...editingBlueprint,
                            temperature: parseFloat(e.target.value),
                          })
                        }
                        className="w-full accent-[#9D7BFF]"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-xs text-slate-300 mb-1">
                        <span>Max Reasoning Steps</span>
                        <span className="font-mono text-[#E7B7A5]">
                          {editingBlueprint.maxSteps}
                        </span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="15"
                        step="1"
                        value={editingBlueprint.maxSteps}
                        onChange={(e) =>
                          setEditingBlueprint({
                            ...editingBlueprint,
                            maxSteps: parseInt(e.target.value),
                          })
                        }
                        className="w-full accent-[#9D7BFF]"
                      />
                    </div>
                  </div>

                  {/* Toggles */}
                  <div className="flex items-center gap-4 pt-1">
                    <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                      <input
                        type="checkbox"
                        checked={editingBlueprint.memoryRecall}
                        onChange={(e) =>
                          setEditingBlueprint({
                            ...editingBlueprint,
                            memoryRecall: e.target.checked,
                          })
                        }
                        className="rounded accent-[#9D7BFF]"
                      />
                      <span>Inject Long-term Memories</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                      <input
                        type="checkbox"
                        checked={editingBlueprint.visionEnabled}
                        onChange={(e) =>
                          setEditingBlueprint({
                            ...editingBlueprint,
                            visionEnabled: e.target.checked,
                          })
                        }
                        className="rounded accent-[#9D7BFF]"
                      />
                      <span>Enable Live Vision Snapshot</span>
                    </label>
                  </div>
                </div>

                {/* Right Column: System Instruction & Tool Bindings */}
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">
                      System Instruction / Cognitive Prompt
                    </label>
                    <textarea
                      rows={6}
                      value={editingBlueprint.systemInstruction}
                      onChange={(e) =>
                        setEditingBlueprint({
                          ...editingBlueprint,
                          systemInstruction: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-xs font-mono leading-relaxed focus:outline-none focus:border-[#9D7BFF] resize-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-2">
                      Bound Tools & Browser Capabilities
                    </label>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {[
                        'searchWeb',
                        'openWebsite',
                        'getWeather',
                        'controlSystem',
                        'getSystemStatus',
                        'setSystemReminder',
                        'toggleTheme',
                      ].map((tName) => {
                        const isChecked = editingBlueprint.allowedTools.includes(tName);
                        return (
                          <label
                            key={tName}
                            className={`p-2 rounded-xl border flex items-center gap-2 cursor-pointer transition-colors ${
                              isChecked
                                ? 'bg-purple-500/20 border-purple-500/40 text-purple-200'
                                : 'bg-white/5 border-white/10 text-slate-400'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                const newTools = e.target.checked
                                  ? [...editingBlueprint.allowedTools, tName]
                                  : editingBlueprint.allowedTools.filter(
                                      (t) => t !== tName
                                    );
                                setEditingBlueprint({
                                  ...editingBlueprint,
                                  allowedTools: newTools,
                                });
                              }}
                              className="accent-[#9D7BFF]"
                            />
                            <span className="font-mono text-[11px]">{tName}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-end gap-3 pt-4">
                    {editingBlueprint.isCustom && (
                      <button
                        onClick={() => {
                          agentDevService.deleteBlueprint(editingBlueprint.id);
                          setSelectedBlueprint(DEFAULT_AGENT_BLUEPRINTS[0]);
                          setActiveTab('matrix');
                          stateManager.notify('Custom agent deleted.', 'info');
                        }}
                        className="px-3 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-medium border border-rose-500/30 flex items-center gap-1.5 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete
                      </button>
                    )}
                    <button
                      id="btn-save-blueprint"
                      onClick={handleSaveBlueprint}
                      className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#9D7BFF] to-indigo-600 hover:brightness-110 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-purple-900/30 transition-all"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Save Blueprint
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
