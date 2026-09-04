import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Database,
  Search,
  Plus,
  Trash2,
  Download,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  Heart,
  FolderKanban,
  Target,
  Clock,
  Network,
  MessageSquare,
  Sliders,
  CheckCircle2,
  Edit3,
  Cpu,
  Layers,
  History,
  Activity,
  ChevronRight,
  Info,
} from 'lucide-react';
import { memoryService } from '../memory/MemoryService';
import {
  MemoryItem,
  MemoryType,
  MemoryStatus,
  MemoryStats,
  MemoryContextResult,
} from '../memory/memoryTypes';
import { MEMORY_TYPE_META } from '../memory/memoryConstants';

interface MemoryDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  resonance: number;
}

export const MemoryDashboard: React.FC<MemoryDashboardProps> = ({
  isOpen,
  onClose,
  resonance,
}) => {
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [stats, setStats] = useState<MemoryStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTypeFilter, setActiveTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<MemoryStatus>('active');

  // Creation & Editing states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingMemory, setEditingMemory] = useState<MemoryItem | null>(null);
  const [newContent, setNewContent] = useState('');
  const [newType, setNewType] = useState<MemoryType>('preference');
  const [newCategory, setNewCategory] = useState('');
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [newImportance, setNewImportance] = useState(0.85);

  // Retrieval simulation test bench
  const [isTestBenchOpen, setIsTestBenchOpen] = useState(false);
  const [testQuery, setTestQuery] = useState('');
  const [testResult, setTestResult] = useState<MemoryContextResult | null>(null);
  const [testLoading, setTestLoading] = useState(false);

  // Danger zone modal
  const [dangerConfirm, setDangerConfirm] = useState<'purge' | 'category' | null>(null);
  const [categoryToPurge, setCategoryToPurge] = useState('');
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Load memories & stats
  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [list, currentStats] = await Promise.all([
        memoryService.list({ status: statusFilter }),
        memoryService.getStats(),
      ]);
      setMemories(list);
      setStats(currentStats);
    } catch (err: any) {
      console.warn('[MemoryDashboard] Load error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchAllData();
    }
  }, [isOpen, statusFilter]);

  // Subscribe to external service changes
  useEffect(() => {
    const unsubscribe = memoryService.subscribe(() => {
      fetchAllData();
    });
    return unsubscribe;
  }, [statusFilter]);

  const showNotice = (msg: string) => {
    setActionNotice(msg);
    setTimeout(() => setActionNotice(null), 4000);
  };

  // Filter memories locally by search query and type filter
  const filteredMemories = useMemo(() => {
    return memories.filter((m) => {
      if (activeTypeFilter !== 'all' && m.type !== activeTypeFilter) {
        return false;
      }
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        m.content.toLowerCase().includes(q) ||
        m.normalizedKey.toLowerCase().includes(q) ||
        m.normalizedValue.toLowerCase().includes(q) ||
        m.normalizedCategory.toLowerCase().includes(q)
      );
    });
  }, [memories, activeTypeFilter, searchQuery]);

  // Save new memory
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.trim() && (!newKey.trim() || !newValue.trim())) return;

    try {
      const res = await memoryService.save({
        text: newContent.trim() || undefined,
        type: newType,
        category: newCategory.trim() || undefined,
        key: newKey.trim() || undefined,
        value: newValue.trim() || undefined,
        importance: newImportance,
      });
      showNotice(res.actionResult || 'Memory stored successfully.');
      setIsCreateOpen(false);
      setNewContent('');
      setNewKey('');
      setNewValue('');
      setNewCategory('');
      fetchAllData();
    } catch (err: any) {
      showNotice(`Failed to save: ${err.message}`);
    }
  };

  // Update existing memory
  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMemory) return;

    try {
      const success = await memoryService.update(editingMemory.id, {
        content: editingMemory.content,
        importance: editingMemory.importance,
        normalizedKey: editingMemory.normalizedKey,
        normalizedValue: editingMemory.normalizedValue,
        normalizedCategory: editingMemory.normalizedCategory,
        status: editingMemory.status,
      });
      if (success) {
        showNotice(`Memory '${editingMemory.normalizedKey}' updated.`);
        setEditingMemory(null);
        fetchAllData();
      }
    } catch (err: any) {
      showNotice(`Update failed: ${err.message}`);
    }
  };

  // Delete single memory
  const handleDeleteMemory = async (id: string, keyName: string) => {
    try {
      const ok = await memoryService.delete(id);
      if (ok) {
        showNotice(`Memory '${keyName}' deleted.`);
        fetchAllData();
      }
    } catch (err: any) {
      showNotice(`Delete failed: ${err.message}`);
    }
  };

  // Run real-time retrieval test bench
  const handleRunTestBench = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!testQuery.trim()) return;
    setTestLoading(true);
    try {
      const result = await memoryService.retrieve(testQuery.trim(), {
        limit: 6,
        threshold: 0.35,
      });
      setTestResult(result);
    } catch (err: any) {
      showNotice(`Test retrieval failed: ${err.message}`);
    } finally {
      setTestLoading(false);
    }
  };

  // Purge Category
  const handleConfirmPurgeCategory = async () => {
    if (!categoryToPurge) return;
    try {
      const count = await memoryService.deleteCategory(categoryToPurge);
      showNotice(`Purged ${count} memories in category '${categoryToPurge}'.`);
      setDangerConfirm(null);
      setCategoryToPurge('');
      fetchAllData();
    } catch (err: any) {
      showNotice(`Failed: ${err.message}`);
    }
  };

  // Purge All
  const handleConfirmPurgeAll = async () => {
    try {
      await memoryService.clearAll();
      showNotice('All memories purged from persistent SQLite storage.');
      setDangerConfirm(null);
      fetchAllData();
    } catch (err: any) {
      showNotice(`Purge failed: ${err.message}`);
    }
  };

  const getCategoryIcon = (type: MemoryType) => {
    switch (type) {
      case 'semantic':
        return <Sparkles className="w-3.5 h-3.5" />;
      case 'preference':
        return <Heart className="w-3.5 h-3.5" />;
      case 'project':
        return <FolderKanban className="w-3.5 h-3.5" />;
      case 'goal':
        return <Target className="w-3.5 h-3.5" />;
      case 'habit':
        return <Clock className="w-3.5 h-3.5" />;
      case 'relationship':
        return <Network className="w-3.5 h-3.5" />;
      case 'conversation':
        return <MessageSquare className="w-3.5 h-3.5" />;
      default:
        return <Layers className="w-3.5 h-3.5" />;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/75 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0"
          />

          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 290 }}
            className="relative w-full max-w-2xl h-full bg-[#0D0A18]/95 border-l border-[#E7B7A5]/25 shadow-2xl backdrop-blur-2xl flex flex-col p-6 z-10 overflow-hidden"
          >
            {/* Action Notice Bar */}
            {actionNotice && (
              <div className="absolute top-4 left-6 right-6 z-30 px-4 py-2.5 rounded-xl bg-[#9D7BFF]/25 border border-[#E7B7A5]/40 text-xs text-[#F3EFFA] backdrop-blur-xl shadow-xl flex items-center gap-2 animate-fade-in">
                <CheckCircle2 className="w-4 h-4 text-[#C6A0FF] shrink-0" />
                <span className="font-medium">{actionNotice}</span>
              </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-[#E7B7A5]/15 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-[#9D7BFF]/20 text-[#E7B7A5] border border-[#E7B7A5]/30">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-display font-bold text-base text-[#F3EFFA] tracking-wide">
                      MERY Long-Term Memory
                    </h2>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-telemetry bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      SQLite + Vector Index
                    </span>
                  </div>
                  <p className="text-xs text-[#E7B7A5]/80 font-light">
                    Canonical storage, hybrid relevance ranking & non-blocking voice pipeline
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={fetchAllData}
                  disabled={loading}
                  className="p-2 rounded-xl bg-white/5 border border-white/10 text-white/70 hover:text-white hover:bg-white/10 transition-all"
                  title="Reload memory store"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#9D7BFF]' : ''}`} />
                </button>
                <button
                  onClick={() => memoryService.exportData()}
                  className="p-2 rounded-xl bg-white/5 border border-white/10 text-white/70 hover:text-white hover:bg-white/10 transition-all"
                  title="Export Memories (JSON)"
                >
                  <Download className="w-4 h-4" />
                </button>
                <button
                  onClick={onClose}
                  className="p-2 rounded-xl text-white/50 hover:text-white hover:bg-white/10 transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Stats Bar & Companion Resonance */}
            <div className="my-3 grid grid-cols-4 gap-2.5 shrink-0">
              <div className="p-3 rounded-xl bg-[#150F28] border border-[#9D7BFF]/20">
                <div className="text-[10px] font-telemetry text-[#E7B7A5]/70 flex items-center gap-1">
                  <Layers className="w-3 h-3 text-[#C6A0FF]" /> ACTIVE
                </div>
                <div className="text-lg font-bold font-telemetry text-[#F3EFFA] mt-0.5">
                  {stats?.totalActive ?? memories.length}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#150F28] border border-[#9D7BFF]/20">
                <div className="text-[10px] font-telemetry text-[#E7B7A5]/70 flex items-center gap-1">
                  <Activity className="w-3 h-3 text-pink-400" /> ACCESSES
                </div>
                <div className="text-lg font-bold font-telemetry text-[#F3EFFA] mt-0.5">
                  {stats?.totalAccesses ?? 0}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#150F28] border border-[#9D7BFF]/20">
                <div className="text-[10px] font-telemetry text-[#E7B7A5]/70 flex items-center gap-1">
                  <Cpu className="w-3 h-3 text-emerald-400" /> VECTOR ENGINE
                </div>
                <div className="text-xs font-bold font-telemetry text-emerald-400 mt-1">
                  Ready (Hybrid)
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#150F28] border border-[#9D7BFF]/20">
                <div className="text-[10px] font-telemetry text-[#E7B7A5]/70 flex items-center gap-1">
                  <History className="w-3 h-3 text-amber-400" /> SUPERSEDED
                </div>
                <div className="text-lg font-bold font-telemetry text-amber-300 mt-0.5">
                  {stats?.totalSuperseded ?? 0}
                </div>
              </div>
            </div>

            {/* Sub-toolbar: Search + Actions */}
            <div className="flex items-center gap-2 mb-3 shrink-0">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search facts, keys, preferences, projects..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-[#17112A] border border-[#E7B7A5]/20 text-[#F3EFFA] placeholder:text-white/30 outline-none focus:border-[#9D7BFF]"
                />
              </div>

              <button
                onClick={() => setIsCreateOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#9D7BFF] to-[#E7B7A5] text-[#0A0714] font-medium text-xs flex items-center gap-1.5 shrink-0 hover:opacity-95 transition-opacity"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Fact</span>
              </button>

              <button
                onClick={() => setIsTestBenchOpen(!isTestBenchOpen)}
                className={`px-3 py-1.5 rounded-xl border text-xs font-telemetry flex items-center gap-1.5 shrink-0 transition-all ${
                  isTestBenchOpen
                    ? 'bg-[#9D7BFF]/30 border-[#E7B7A5]/50 text-white'
                    : 'bg-white/5 border-white/10 text-white/70 hover:text-white'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Test Recall</span>
              </button>
            </div>

            {/* Test Recall Bench Drawer (Collapsible) */}
            <AnimatePresence>
              {isTestBenchOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="mb-3 p-3 rounded-xl bg-[#1A1233] border border-[#9D7BFF]/30 space-y-2 overflow-hidden shrink-0"
                >
                  <div className="flex items-center justify-between text-xs text-[#E7B7A5]">
                    <span className="font-telemetry font-semibold flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-[#C6A0FF]" /> TEST MEMORY RECALL (HYBRID RANKER)
                    </span>
                    <span className="text-[10px] text-white/40">Threshold: 0.35 | Budget: 6</span>
                  </div>
                  <form onSubmit={handleRunTestBench} className="flex gap-2">
                    <input
                      type="text"
                      value={testQuery}
                      onChange={(e) => setTestQuery(e.target.value)}
                      placeholder="e.g. 'What game should we play tonight?' or 'Tell me about my channel'"
                      className="flex-1 px-3 py-1.5 text-xs rounded-lg bg-[#0E0A1A] border border-[#E7B7A5]/20 text-white placeholder:text-white/30 outline-none"
                    />
                    <button
                      type="submit"
                      disabled={testLoading || !testQuery.trim()}
                      className="px-3 py-1.5 rounded-lg bg-[#9D7BFF] text-black font-semibold text-xs disabled:opacity-50"
                    >
                      {testLoading ? 'Retrieving...' : 'Simulate'}
                    </button>
                  </form>

                  {testResult && (
                    <div className="mt-2 space-y-1.5 max-h-36 overflow-y-auto no-scrollbar">
                      <div className="text-[10px] font-telemetry text-emerald-400">
                        {testResult.memories.length} relevant memories recalled in {testResult.diagnostics.retrievalTimeMs}ms:
                      </div>
                      {testResult.memories.length === 0 ? (
                        <p className="text-[11px] text-white/40 italic">
                          No memory exceeded the relevance threshold. Clean slate.
                        </p>
                      ) : (
                        testResult.memories.map((tm, idx) => (
                          <div
                            key={`${tm.id}_${idx}`}
                            className="p-2 rounded-lg bg-black/40 border border-white/10 text-xs flex items-center justify-between"
                          >
                            <span className="text-[#F3EFFA] font-light text-[11px] truncate flex-1 mr-2">
                              • {tm.content}
                            </span>
                            <div className="flex items-center gap-2 font-telemetry text-[10px]">
                              <span className="text-emerald-300">
                                Score: {(tm.relevanceScore || 0).toFixed(2)}
                              </span>
                              {tm.scoreBreakdown && (
                                <span className="text-white/40 text-[9px]">
                                  (Sem: {tm.scoreBreakdown.semantic.toFixed(2)}, Imp: {tm.scoreBreakdown.importance.toFixed(2)})
                                </span>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Category Filter Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-2 no-scrollbar shrink-0 text-xs">
              <button
                onClick={() => setActiveTypeFilter('all')}
                className={`px-2.5 py-1 rounded-full text-[11px] font-telemetry border transition-all ${
                  activeTypeFilter === 'all'
                    ? 'bg-[#E7B7A5]/25 text-[#E7B7A5] border-[#E7B7A5]/50 font-medium'
                    : 'bg-white/5 text-white/50 border-white/10 hover:text-white'
                }`}
              >
                All ({memories.length})
              </button>

              {(Object.keys(MEMORY_TYPE_META) as MemoryType[]).map((type) => {
                const meta = MEMORY_TYPE_META[type];
                const count = memories.filter((m) => m.type === type).length;
                return (
                  <button
                    key={type}
                    onClick={() => setActiveTypeFilter(type)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-telemetry border whitespace-nowrap flex items-center gap-1 transition-all ${
                      activeTypeFilter === type
                        ? 'bg-[#E7B7A5]/25 text-[#E7B7A5] border-[#E7B7A5]/50 font-medium'
                        : 'bg-white/5 text-white/50 border-white/10 hover:text-white'
                    }`}
                  >
                    {getCategoryIcon(type)}
                    <span>{meta.label}</span>
                    <span className="text-[9px] opacity-70">({count})</span>
                  </button>
                );
              })}
            </div>

            {/* Status Selector (Active vs Superseded) */}
            <div className="flex items-center justify-between mb-2 shrink-0 text-[11px] text-white/50">
              <div className="flex items-center gap-2">
                <span>View Status:</span>
                <button
                  onClick={() => setStatusFilter('active')}
                  className={`px-2 py-0.5 rounded text-[10px] font-telemetry ${
                    statusFilter === 'active'
                      ? 'bg-[#9D7BFF]/30 text-white font-semibold'
                      : 'hover:text-white'
                  }`}
                >
                  Active
                </button>
                <button
                  onClick={() => setStatusFilter('superseded')}
                  className={`px-2 py-0.5 rounded text-[10px] font-telemetry ${
                    statusFilter === 'superseded'
                      ? 'bg-amber-500/30 text-amber-200 font-semibold'
                      : 'hover:text-white'
                  }`}
                >
                  Superseded History
                </button>
              </div>

              {activeTypeFilter !== 'all' && (
                <button
                  onClick={() => {
                    setCategoryToPurge(activeTypeFilter);
                    setDangerConfirm('category');
                  }}
                  className="text-[10px] text-rose-400/80 hover:text-rose-400 flex items-center gap-1 font-telemetry"
                >
                  <Trash2 className="w-3 h-3" /> Clear Category
                </button>
              )}
            </div>

            {/* Main Memory List View */}
            <div className="flex-1 space-y-2.5 overflow-y-auto pr-1">
              {filteredMemories.length === 0 ? (
                <div className="py-12 px-6 text-center text-xs text-white/40 border border-dashed border-white/10 rounded-2xl">
                  <Database className="w-6 h-6 mx-auto mb-2 text-white/20" />
                  {searchQuery
                    ? `No memories matched "${searchQuery}".`
                    : 'No memories in this view yet. Add a fact or converse naturally with MERY.'}
                </div>
              ) : (
                filteredMemories.map((mem, idx) => {
                  const meta = MEMORY_TYPE_META[mem.type] || MEMORY_TYPE_META.semantic;
                  const dateStr = new Date(mem.updatedAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  });

                  return (
                    <div
                      key={`${mem.id}_${idx}`}
                      className={`p-3.5 rounded-xl border transition-all group ${
                        mem.status === 'superseded'
                          ? 'bg-[#120D1F]/50 border-white/5 opacity-60'
                          : 'bg-[#150F28]/85 border-[#E7B7A5]/18 hover:border-[#9D7BFF]/40'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                            <span
                              className={`text-[9px] font-telemetry px-2 py-0.5 rounded border flex items-center gap-1 ${meta.badgeColor}`}
                            >
                              {getCategoryIcon(mem.type)}
                              <span>{meta.label.toUpperCase()}</span>
                            </span>

                            <span className="text-[10px] font-telemetry px-1.5 py-0.5 rounded bg-black/40 text-[#E7B7A5]/80 border border-white/5">
                              {mem.normalizedKey} = {mem.normalizedValue}
                            </span>

                            <span className="text-[10px] font-telemetry text-white/40 ml-auto">
                              {dateStr}
                            </span>
                          </div>

                          <p className="text-xs text-[#F3EFFA] font-normal leading-relaxed">
                            {mem.content}
                          </p>

                          {/* Metadata row */}
                          <div className="mt-2.5 pt-2 border-t border-white/5 flex items-center gap-3 text-[10px] font-telemetry text-white/45 flex-wrap">
                            <span className="flex items-center gap-1">
                              <span className="text-emerald-400">Imp:</span>
                              <span>{(mem.importance * 100).toFixed(0)}%</span>
                            </span>
                            <span className="flex items-center gap-1">
                              <span className="text-sky-400">Conf:</span>
                              <span>{(mem.confidence * 100).toFixed(0)}%</span>
                            </span>
                            <span className="flex items-center gap-1">
                              <span className="text-purple-400">Recalls:</span>
                              <span>{mem.accessCount}</span>
                            </span>
                            {mem.version > 1 && (
                              <span className="text-amber-300">v{mem.version}</span>
                            )}
                            {mem.provenance && (
                              <span className="text-white/30 truncate max-w-[140px]">
                                {mem.provenance}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex flex-col items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                          <button
                            onClick={() => setEditingMemory({ ...mem })}
                            className="p-1.5 rounded text-white/50 hover:text-[#C6A0FF] hover:bg-white/10 transition-all"
                            title="Edit memory"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteMemory(mem.id, mem.normalizedKey)}
                            className="p-1.5 rounded text-white/40 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
                            title="Delete memory"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer / Danger Zone Trigger */}
            <div className="pt-3 mt-auto border-t border-[#E7B7A5]/15 flex items-center justify-between text-xs text-[#E7B7A5]/70 shrink-0">
              <div className="flex items-center gap-1.5">
                <Heart className="w-3.5 h-3.5 text-[#E7B7A5]" />
                <span className="text-[11px]">Resonance {resonance}% · Real SQLite Storage</span>
              </div>

              <button
                onClick={() => setDangerConfirm('purge')}
                className="text-[10px] text-rose-400/80 hover:text-rose-400 font-telemetry flex items-center gap-1"
              >
                <AlertTriangle className="w-3 h-3" /> Purge All
              </button>
            </div>
          </motion.div>

          {/* Modal 1: Create Memory Fact */}
          {isCreateOpen && (
            <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="w-full max-w-md p-6 rounded-2xl bg-[#140F26] border border-[#E7B7A5]/30 shadow-2xl space-y-4"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-display font-semibold text-white flex items-center gap-2">
                    <Plus className="w-4 h-4 text-[#9D7BFF]" /> Add Verified User Fact
                  </h3>
                  <button
                    onClick={() => setIsCreateOpen(false)}
                    className="text-white/40 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleCreateSubmit} className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-telemetry text-[#E7B7A5] mb-1">
                      MEMORY CATEGORY:
                    </label>
                    <select
                      value={newType}
                      onChange={(e) => setNewType(e.target.value as MemoryType)}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-[#1D1636] border border-[#E7B7A5]/20 text-white outline-none"
                    >
                      {(Object.keys(MEMORY_TYPE_META) as MemoryType[]).map((t) => (
                        <option key={t} value={t}>
                          {MEMORY_TYPE_META[t].label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-telemetry text-[#E7B7A5] mb-1">
                      NATURAL LANGUAGE STATEMENT:
                    </label>
                    <textarea
                      rows={2}
                      value={newContent}
                      onChange={(e) => setNewContent(e.target.value)}
                      placeholder="e.g. User's favorite game is Cyberpunk 2077."
                      className="w-full px-3 py-2 text-xs rounded-xl bg-[#1D1636] border border-[#E7B7A5]/20 text-white placeholder:text-white/30 outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-telemetry text-[#E7B7A5] mb-1">
                        NORMALIZED KEY:
                      </label>
                      <input
                        type="text"
                        value={newKey}
                        onChange={(e) => setNewKey(e.target.value)}
                        placeholder="e.g. favorite_game"
                        className="w-full px-3 py-1.5 text-xs rounded-xl bg-[#1D1636] border border-[#E7B7A5]/20 text-white placeholder:text-white/30 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-telemetry text-[#E7B7A5] mb-1">
                        VALUE:
                      </label>
                      <input
                        type="text"
                        value={newValue}
                        onChange={(e) => setNewValue(e.target.value)}
                        placeholder="e.g. Cyberpunk"
                        className="w-full px-3 py-1.5 text-xs rounded-xl bg-[#1D1636] border border-[#E7B7A5]/20 text-white placeholder:text-white/30 outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-telemetry text-[#E7B7A5] mb-1">
                      IMPORTANCE SCORE: {(newImportance * 100).toFixed(0)}%
                    </label>
                    <input
                      type="range"
                      min="0.1"
                      max="1.0"
                      step="0.05"
                      value={newImportance}
                      onChange={(e) => setNewImportance(parseFloat(e.target.value))}
                      className="w-full accent-[#9D7BFF]"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsCreateOpen(false)}
                      className="px-3 py-1.5 rounded-xl bg-white/5 text-xs text-white/70 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-[#9D7BFF] to-[#E7B7A5] text-[#0A0714] font-medium text-xs"
                    >
                      Commit to SQLite
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}

          {/* Modal 2: Edit Memory Fact */}
          {editingMemory && (
            <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="w-full max-w-md p-6 rounded-2xl bg-[#140F26] border border-[#E7B7A5]/30 shadow-2xl space-y-4"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-display font-semibold text-white flex items-center gap-2">
                    <Edit3 className="w-4 h-4 text-[#C6A0FF]" /> Edit Memory Fact
                  </h3>
                  <button
                    onClick={() => setEditingMemory(null)}
                    className="text-white/40 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleUpdateSubmit} className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-telemetry text-[#E7B7A5] mb-1">
                      STATEMENT CONTENT:
                    </label>
                    <textarea
                      rows={2}
                      value={editingMemory.content}
                      onChange={(e) =>
                        setEditingMemory({ ...editingMemory, content: e.target.value })
                      }
                      className="w-full px-3 py-2 text-xs rounded-xl bg-[#1D1636] border border-[#E7B7A5]/20 text-white outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-telemetry text-[#E7B7A5] mb-1">
                        KEY:
                      </label>
                      <input
                        type="text"
                        value={editingMemory.normalizedKey}
                        onChange={(e) =>
                          setEditingMemory({ ...editingMemory, normalizedKey: e.target.value })
                        }
                        className="w-full px-3 py-1.5 text-xs rounded-xl bg-[#1D1636] border border-[#E7B7A5]/20 text-white outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-telemetry text-[#E7B7A5] mb-1">
                        VALUE:
                      </label>
                      <input
                        type="text"
                        value={editingMemory.normalizedValue}
                        onChange={(e) =>
                          setEditingMemory({ ...editingMemory, normalizedValue: e.target.value })
                        }
                        className="w-full px-3 py-1.5 text-xs rounded-xl bg-[#1D1636] border border-[#E7B7A5]/20 text-white outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-telemetry text-[#E7B7A5] mb-1">
                      IMPORTANCE SCORE: {(editingMemory.importance * 100).toFixed(0)}%
                    </label>
                    <input
                      type="range"
                      min="0.1"
                      max="1.0"
                      step="0.05"
                      value={editingMemory.importance}
                      onChange={(e) =>
                        setEditingMemory({
                          ...editingMemory,
                          importance: parseFloat(e.target.value),
                        })
                      }
                      className="w-full accent-[#9D7BFF]"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setEditingMemory(null)}
                      className="px-3 py-1.5 rounded-xl bg-white/5 text-xs text-white/70 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-[#9D7BFF] to-[#E7B7A5] text-[#0A0714] font-medium text-xs"
                    >
                      Save Changes
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}

          {/* Modal 3: Danger Confirmation */}
          {dangerConfirm && (
            <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="w-full max-w-sm p-6 rounded-2xl bg-[#1B1020] border border-rose-500/40 shadow-2xl space-y-3 text-center"
              >
                <div className="w-10 h-10 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-display font-semibold text-white">
                  {dangerConfirm === 'purge'
                    ? 'Purge All Stored Memories?'
                    : `Clear All Memories in '${categoryToPurge}'?`}
                </h3>
                <p className="text-xs text-white/60">
                  {dangerConfirm === 'purge'
                    ? 'This will permanently remove all persistent memories and embeddings from the SQLite database. MERY will start with a fresh slate.'
                    : `This will permanently remove all memories classified under ${categoryToPurge}.`}
                </p>

                <div className="flex justify-center gap-2 pt-3">
                  <button
                    onClick={() => setDangerConfirm(null)}
                    className="px-4 py-2 rounded-xl bg-white/10 text-xs text-white hover:bg-white/15"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={
                      dangerConfirm === 'purge'
                        ? handleConfirmPurgeAll
                        : handleConfirmPurgeCategory
                    }
                    className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-medium text-xs"
                  >
                    Confirm Deletion
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </div>
      )}
    </AnimatePresence>
  );
};
