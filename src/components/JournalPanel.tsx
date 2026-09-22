import React, { useState, useEffect } from 'react';
import {
  X,
  BookOpen,
  Plus,
  Trash2,
  Sparkles,
  Calendar,
  Smile,
  Tag,
  CheckCircle2,
  RefreshCw,
  Edit3,
  Bookmark,
  ChevronRight,
} from 'lucide-react';
import { stateManager } from '../modules/StateManager';

export interface JournalEntry {
  id: string;
  title: string;
  content: string;
  mood?: string;
  summary?: string;
  tags?: string;
  createdAt: string;
}

interface JournalPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const JournalPanel: React.FC<JournalPanelProps> = ({ isOpen, onClose }) => {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);

  // Form State
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [mood, setMood] = useState<'productive' | 'reflective' | 'energetic' | 'calm' | 'tired'>('reflective');
  const [tags, setTags] = useState('daily, reflection');
  const [isSaving, setIsSaving] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadEntries();
    }
  }, [isOpen]);

  const loadEntries = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/journal/entries');
      if (res.ok) {
        const data = await res.json();
        setEntries(data.entries || []);
        if (data.entries && data.entries.length > 0 && !selectedEntry) {
          setSelectedEntry(data.entries[0]);
        }
      }
    } catch (e) {
      console.warn('Failed to load journal entries', e);
    } finally {
      setLoading(false);
    }
  };

  const handleStartNew = () => {
    setSelectedEntry(null);
    setTitle(`Journal — ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`);
    setContent('');
    setMood('reflective');
    setTags('daily, reflection');
    setIsEditing(true);
  };

  const handleSaveEntry = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!title.trim() && !content.trim()) {
      stateManager.notify('Please provide a title or reflection note', 'warning');
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch('/api/journal/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedEntry?.id,
          title: title.trim() || 'Daily Reflection',
          content: content.trim(),
          mood,
          tags,
        }),
      });

      if (res.ok) {
        const result = await res.json();
        stateManager.notify('Journal entry saved successfully!', 'success');
        await loadEntries();
        if (result.entry) {
          setSelectedEntry(result.entry);
        }
        setIsEditing(false);
      } else {
        throw new Error('Save failed');
      }
    } catch (e: any) {
      stateManager.notify(`Could not save journal entry: ${e.message}`, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteEntry = async (id: string) => {
    if (!confirm('Are you sure you want to delete this journal entry?')) return;
    try {
      const res = await fetch(`/api/journal/delete/${id}`, { method: 'DELETE' });
      if (res.ok) {
        stateManager.notify('Journal entry deleted', 'info');
        if (selectedEntry?.id === id) {
          setSelectedEntry(null);
          setIsEditing(false);
        }
        await loadEntries();
      }
    } catch (e) {
      stateManager.notify('Failed to delete entry', 'error');
    }
  };

  const handleAutoSummarizeDay = async () => {
    setIsSummarizing(true);
    try {
      const res = await fetch('/api/journal/auto-summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (res.ok) {
        const data = await res.json();
        setTitle(data.title || `Evening Reflection — ${new Date().toLocaleDateString()}`);
        setContent(data.summary || data.content || '');
        setMood(data.mood || 'reflective');
        setTags(data.tags || 'auto-summary, reflection');
        setIsEditing(true);
        stateManager.notify('✨ Mery generated a daily reflection from your day!', 'success');
      } else {
        // Fallback generator client-side
        const todayDate = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
        setTitle(`Mery's Daily Summary — ${todayDate}`);
        setContent(`Today's focus encompassed productive sessions, conversational check-ins with Mery, and focused tasks. Maintained momentum through the day with continuous companion interaction.`);
        setMood('productive');
        setTags('daily-summary, mery-companion');
        setIsEditing(true);
        stateManager.notify('Generated daily summary template for you to review and save', 'info');
      }
    } catch (err) {
      const todayDate = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
      setTitle(`Daily Reflection — ${todayDate}`);
      setContent(`A quiet and reflective day. Tracked meaningful conversations and study goals.`);
      setMood('calm');
      setIsEditing(true);
    } finally {
      setIsSummarizing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      id="journal-panel-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-fade-in"
    >
      <div className="relative w-full max-w-4xl h-[85vh] bg-[#0a0c10] border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-white font-sans">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 shrink-0 bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white tracking-wide flex items-center gap-2">
                Mery Companion Journal
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 font-telemetry uppercase">
                  SQLite
                </span>
              </h2>
              <p className="text-xs text-white/50">Daily reflections, milestones, and AI summaries</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleAutoSummarizeDay}
              disabled={isSummarizing}
              className="px-3 py-1.5 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 text-purple-300 text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              title="Auto-summarize today's activities & reflections with Mery"
            >
              <Sparkles className={`w-3.5 h-3.5 ${isSummarizing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Auto-Summarize Day</span>
            </button>

            <button
              onClick={handleStartNew}
              className="px-3 py-1.5 rounded-xl bg-[#00ff66]/15 hover:bg-[#00ff66]/25 border border-[#00ff66]/30 text-[#00ff66] text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Entry</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Body: Master-Detail Layout */}
        <div className="flex-1 flex min-h-0 overflow-hidden">
          {/* Sidebar / Entries List */}
          <div className="w-full sm:w-80 border-r border-white/10 flex flex-col shrink-0 bg-black/40 overflow-y-auto">
            <div className="p-3 border-b border-white/5 flex items-center justify-between text-xs text-white/50">
              <span>{entries.length} Entries Saved</span>
              <button
                onClick={loadEntries}
                className="hover:text-white transition-colors cursor-pointer"
                title="Refresh entries"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {loading && entries.length === 0 ? (
              <div className="p-8 text-center text-xs text-white/40">Loading journal...</div>
            ) : entries.length === 0 ? (
              <div className="p-8 text-center text-xs text-white/40 flex flex-col items-center gap-2">
                <Bookmark className="w-6 h-6 text-white/20" />
                <p>No entries yet.</p>
                <p className="text-[11px] text-white/30">Click 'New Entry' or ask Mery to log your reflections.</p>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {entries.map((entry) => {
                  const isSelected = selectedEntry?.id === entry.id && !isEditing;
                  return (
                    <div
                      key={entry.id}
                      onClick={() => {
                        setSelectedEntry(entry);
                        setIsEditing(false);
                      }}
                      className={`p-3 cursor-pointer transition-colors flex flex-col gap-1 text-left ${
                        isSelected
                          ? 'bg-white/[0.08] border-l-2 border-[#00ff66]'
                          : 'hover:bg-white/[0.03]'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[11px] text-white/40">
                        <span className="flex items-center gap-1 font-telemetry">
                          <Calendar className="w-3 h-3" />
                          {new Date(entry.createdAt).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                        {entry.mood && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] bg-white/5 border border-white/10 text-white/70 uppercase">
                            {entry.mood}
                          </span>
                        )}
                      </div>
                      <h4 className="text-xs font-semibold text-white truncate">{entry.title}</h4>
                      <p className="text-[11px] text-white/50 line-clamp-2 leading-relaxed">
                        {entry.content}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Editor / Detail View */}
          <div className="flex-1 flex flex-col min-h-0 bg-black/20 overflow-y-auto p-4 sm:p-6">
            {isEditing ? (
              <form onSubmit={handleSaveEntry} className="flex-1 flex flex-col gap-4">
                <div className="flex items-center justify-between pb-2 border-b border-white/10">
                  <span className="text-xs font-telemetry text-[#00ff66] uppercase tracking-wider">
                    {selectedEntry ? 'Edit Reflection' : 'New Reflection'}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="px-3 py-1 text-xs text-white/60 hover:text-white cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="px-4 py-1.5 rounded-xl bg-[#00ff66] text-[#080809] text-xs font-bold hover:bg-[#00ff66]/90 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{isSaving ? 'Saving...' : 'Save Entry'}</span>
                    </button>
                  </div>
                </div>

                <div>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Entry Title..."
                    className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white text-sm font-semibold focus:outline-none focus:border-[#00ff66]/50"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-telemetry uppercase text-white/40 block mb-1">
                      Mood / State
                    </label>
                    <select
                      value={mood}
                      onChange={(e: any) => setMood(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/10 text-white text-xs focus:outline-none focus:border-[#00ff66]/50"
                    >
                      <option value="productive" className="bg-[#0a0c10]">Productive</option>
                      <option value="reflective" className="bg-[#0a0c10]">Reflective</option>
                      <option value="energetic" className="bg-[#0a0c10]">Energetic</option>
                      <option value="calm" className="bg-[#0a0c10]">Calm</option>
                      <option value="tired" className="bg-[#0a0c10]">Tired</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-telemetry uppercase text-white/40 block mb-1">
                      Tags (Comma separated)
                    </label>
                    <input
                      type="text"
                      value={tags}
                      onChange={(e) => setTags(e.target.value)}
                      placeholder="daily, ideas, gratitude..."
                      className="w-full px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/10 text-white text-xs focus:outline-none focus:border-[#00ff66]/50"
                    />
                  </div>
                </div>

                <div className="flex-1 flex flex-col min-h-[220px]">
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Write your reflection, thoughts, or what you accomplished today..."
                    className="w-full flex-1 p-3 rounded-xl bg-white/[0.04] border border-white/10 text-white text-xs leading-relaxed focus:outline-none focus:border-[#00ff66]/50 resize-none font-sans"
                  />
                </div>
              </form>
            ) : selectedEntry ? (
              <div className="flex-1 flex flex-col gap-4">
                <div className="flex items-start justify-between pb-3 border-b border-white/10">
                  <div>
                    <h3 className="text-lg font-bold text-white mb-1">{selectedEntry.title}</h3>
                    <div className="flex items-center gap-3 text-xs text-white/50 font-telemetry">
                      <span>{new Date(selectedEntry.createdAt).toLocaleString()}</span>
                      {selectedEntry.mood && (
                        <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[#00ff66] text-[10px] uppercase">
                          {selectedEntry.mood}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setTitle(selectedEntry.title);
                        setContent(selectedEntry.content);
                        setMood((selectedEntry.mood as any) || 'reflective');
                        setTags(selectedEntry.tags || '');
                        setIsEditing(true);
                      }}
                      className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-all cursor-pointer"
                      title="Edit Entry"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteEntry(selectedEntry.id)}
                      className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 transition-all cursor-pointer"
                      title="Delete Entry"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {selectedEntry.tags && (
                  <div className="flex flex-wrap gap-1.5">
                    {selectedEntry.tags.split(',').map((t, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded-md text-[10px] font-telemetry bg-white/[0.03] border border-white/10 text-white/60"
                      >
                        #{t.trim()}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex-1 text-xs text-white/85 leading-relaxed whitespace-pre-wrap font-sans bg-black/20 p-4 rounded-xl border border-white/5">
                  {selectedEntry.content}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-white/40 gap-3">
                <BookOpen className="w-8 h-8 text-white/20" />
                <p className="text-xs">Select an entry from the list or start a new reflection.</p>
                <button
                  onClick={handleStartNew}
                  className="px-4 py-2 rounded-xl bg-[#00ff66]/15 border border-[#00ff66]/30 text-[#00ff66] text-xs font-semibold cursor-pointer"
                >
                  Write New Entry
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
