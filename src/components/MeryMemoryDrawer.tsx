import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, BookHeart, Sparkles, Plus, Trash2, Heart, Award, Tag, Filter } from 'lucide-react';
import { MeryMemory, MemoryCategory } from '../types';

interface MeryMemoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  memories: MeryMemory[];
  onAddMemory: (text: string, category?: MemoryCategory) => void;
  onDeleteMemory: (id: string) => void;
  resonance: number;
}

const CATEGORY_LABELS: Record<MemoryCategory, { label: string; color: string }> = {
  user_preference: { label: 'Preference', color: 'bg-pink-500/20 text-pink-300 border-pink-500/30' },
  project_goal: { label: 'Project Goal', color: 'bg-violet-500/20 text-violet-300 border-violet-500/30' },
  important_date: { label: 'Important Date', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
  relationship: { label: 'Relationship', color: 'bg-rose-500/20 text-rose-300 border-rose-500/30' },
  habit_schedule: { label: 'Habit & Rhythm', color: 'bg-sky-500/20 text-sky-300 border-sky-500/30' },
  frequently_used_app: { label: 'App / Workflow', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
  favorite_thing: { label: 'Favorite', color: 'bg-amber-400/20 text-amber-200 border-amber-400/30' },
  observation: { label: 'Observation', color: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' },
  insight: { label: 'Insight', color: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
};

export const MeryMemoryDrawer: React.FC<MeryMemoryDrawerProps> = ({
  isOpen,
  onClose,
  memories,
  onAddMemory,
  onDeleteMemory,
  resonance,
}) => {
  const [newNote, setNewNote] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<MemoryCategory>('user_preference');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    onAddMemory(newNote.trim(), selectedCategory);
    setNewNote('');
  };

  const filteredMemories = filterCategory === 'all'
    ? memories
    : memories.filter((m) => m.category === filterCategory);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm">
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
            transition={{ type: 'spring', damping: 26, stiffness: 280 }}
            className="relative w-full max-w-md h-full bg-[#0E0A1A]/95 border-l border-[#E7B7A5]/25 shadow-2xl backdrop-blur-2xl flex flex-col p-6 z-10 overflow-y-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-[#E7B7A5]/15">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-[#9D7BFF]/20 text-[#E7B7A5] border border-[#E7B7A5]/30">
                  <BookHeart className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display font-semibold text-base text-[#F3EFFA]">
                    MERY's Long-Term Memory
                  </h3>
                  <p className="text-xs text-[#E7B7A5]">
                    Persistent knowledge that survives restarts
                  </p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="p-1.5 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Neural Sync Level */}
            <div className="my-4 p-4 rounded-2xl bg-[#171128] border border-[#9D7BFF]/25 relative overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-telemetry tracking-wider text-[#E7B7A5] flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5 text-[#C6A0FF]" /> COMPANION RESONANCE
                </span>
                <span className="font-telemetry font-bold text-sm text-[#F3EFFA]">
                  {resonance}%
                </span>
              </div>
              <div className="w-full h-2 bg-black/40 rounded-full overflow-hidden p-[1px]">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${resonance}%` }}
                  transition={{ duration: 1.2, ease: 'easeOut' }}
                  className="h-full rounded-full bg-gradient-to-r from-[#9D7BFF] via-[#C6A0FF] to-[#E7B7A5]"
                />
              </div>
              <p className="text-[11px] text-white/60 mt-2 font-light">
                High resonance indicates deep contextual and emotional alignment.
              </p>
            </div>

            {/* Add memory / thought form */}
            <form onSubmit={handleAdd} className="mb-4 space-y-2">
              <label className="block text-xs font-telemetry text-[#E7B7A5]">
                SAVE LONG-TERM MEMORY OR PREFERENCE:
              </label>

              <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                {(Object.keys(CATEGORY_LABELS) as MemoryCategory[]).slice(0, 5).map((cat) => (
                  <button
                    type="button"
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-2 py-1 rounded-lg text-[10px] font-telemetry whitespace-nowrap border transition-all ${
                      selectedCategory === cat
                        ? 'bg-[#9D7BFF]/30 border-[#E7B7A5]/50 text-white font-medium'
                        : 'bg-white/5 border-white/10 text-white/50 hover:text-white'
                    }`}
                  >
                    {CATEGORY_LABELS[cat].label}
                  </button>
                ))}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="e.g. 'Prefers dark mode, nocturnal coder, building M4'"
                  className="flex-1 px-3 py-2 text-xs rounded-xl bg-[#1A1330] border border-[#E7B7A5]/20 text-white placeholder:text-white/30 outline-none focus:border-[#9D7BFF]"
                />
                <button
                  type="submit"
                  disabled={!newNote.trim()}
                  className="px-3 py-2 rounded-xl bg-gradient-to-r from-[#9D7BFF] to-[#E7B7A5] text-[#0A0714] font-medium text-xs flex items-center gap-1 disabled:opacity-40"
                >
                  <Plus className="w-3.5 h-3.5" /> Save
                </button>
              </div>
            </form>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-3 no-scrollbar text-xs">
              <span className="text-white/40 text-[10px] font-telemetry">FILTER:</span>
              <button
                onClick={() => setFilterCategory('all')}
                className={`px-2 py-0.5 rounded-full text-[10px] font-telemetry border ${
                  filterCategory === 'all'
                    ? 'bg-[#E7B7A5]/20 text-[#E7B7A5] border-[#E7B7A5]/40'
                    : 'bg-white/5 text-white/40 border-white/10'
                }`}
              >
                All ({memories.length})
              </button>
              {(Object.keys(CATEGORY_LABELS) as MemoryCategory[]).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setFilterCategory(cat)}
                  className={`px-2 py-0.5 rounded-full text-[10px] font-telemetry border whitespace-nowrap ${
                    filterCategory === cat
                      ? 'bg-[#E7B7A5]/20 text-[#E7B7A5] border-[#E7B7A5]/40'
                      : 'bg-white/5 text-white/40 border-white/10'
                  }`}
                >
                  {CATEGORY_LABELS[cat].label}
                </button>
              ))}
            </div>

            {/* List of memories */}
            <div className="flex-1 space-y-2.5 overflow-y-auto pr-1">
              {filteredMemories.length === 0 ? (
                <div className="p-6 text-center text-xs text-white/40 border border-dashed border-white/10 rounded-2xl">
                  No memories in this category yet. Talk with MERY or add above.
                </div>
              ) : (
                filteredMemories.map((mem, idx) => {
                  const catInfo = CATEGORY_LABELS[mem.category] || CATEGORY_LABELS.observation;
                  return (
                    <div
                      key={`${mem.id}_${idx}`}
                      className="p-3 rounded-xl bg-[#161026]/90 border border-[#E7B7A5]/18 flex items-start justify-between gap-3 group hover:border-[#9D7BFF]/40 transition-all"
                    >
                      <div className="flex items-start gap-2.5 flex-1">
                        <Sparkles className="w-4 h-4 text-[#C6A0FF] flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-[9px] font-telemetry px-1.5 py-0.5 rounded border ${catInfo.color}`}>
                              {catInfo.label.toUpperCase()}
                            </span>
                            <span className="text-[10px] text-white/40 font-telemetry">
                              {mem.createdAt}
                            </span>
                          </div>
                          <p className="text-xs text-[#F3EFFA] font-normal leading-relaxed">
                            {mem.text}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => onDeleteMemory(mem.id)}
                        className="text-white/20 hover:text-rose-400 p-1 rounded transition-colors opacity-0 group-hover:opacity-100 shrink-0"
                        title="Forget this memory"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer note */}
            <div className="pt-3 mt-auto border-t border-[#E7B7A5]/15 text-[11px] text-[#E7B7A5]/60 flex items-center justify-center gap-1.5">
              <Heart className="w-3.5 h-3.5 text-[#E7B7A5]" />
              <span>Living memory engine · Survives restarts</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

