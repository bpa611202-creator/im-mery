import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Edit3,
  Folder,
  TrendingUp,
  Clock,
  Plus,
  Trash2,
  FileText,
  Save,
  Search,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { stateManager } from '../../modules/StateManager';

export const ProductivitySettingsPanel: React.FC = () => {
  const [subTab, setSubTab] = useState<'study' | 'journal' | 'documents' | 'markets'>('study');

  // 1. Study Tracker State
  const [todayStudy, setTodayStudy] = useState<{ totalMinutes: number; sessionCount: number; breakdown: Record<string, number> }>({
    totalMinutes: 0,
    sessionCount: 0,
    breakdown: {},
  });
  const [recentStudy, setRecentStudy] = useState<any[]>([]);
  const [studySubject, setStudySubject] = useState('Computer Science');
  const [studyMinutes, setStudyMinutes] = useState(45);
  const [studyTopic, setStudyTopic] = useState('');
  const [studyNotes, setStudyNotes] = useState('');
  const [isLoggingStudy, setIsLoggingStudy] = useState(false);

  // 2. Journal State
  const [journalEntries, setJournalEntries] = useState<any[]>([]);
  const [journalTitle, setJournalTitle] = useState('');
  const [journalContent, setJournalContent] = useState('');
  const [journalMood, setJournalMood] = useState<'productive' | 'reflective' | 'energetic' | 'calm' | 'tired'>('productive');
  const [journalTags, setJournalTags] = useState('daily, focus');
  const [isSavingJournal, setIsSavingJournal] = useState(false);

  // 3. Documents State
  const [documents, setDocuments] = useState<any[]>([]);
  const [activeDocName, setActiveDocName] = useState<string | null>(null);
  const [activeDocContent, setActiveDocContent] = useState('');
  const [newDocName, setNewDocName] = useState('');
  const [isDocSaving, setIsDocSaving] = useState(false);

  // 4. Financial Markets State
  const [watchlist, setWatchlist] = useState<any[]>([]);
  const [searchSymbol, setSearchSymbol] = useState('');
  const [searchedQuote, setSearchedQuote] = useState<any | null>(null);
  const [isSearchingMarket, setIsSearchingMarket] = useState(false);

  // Load initial data
  useEffect(() => {
    fetchStudyData();
    fetchJournalData();
    fetchDocumentsData();
    fetchWatchlistData();
  }, []);

  // Study Fetchers
  const fetchStudyData = async () => {
    try {
      const [todayRes, recentRes] = await Promise.all([
        fetch('/api/study/today'),
        fetch('/api/study/recent'),
      ]);
      if (todayRes.ok) {
        const todayData = await todayRes.json();
        setTodayStudy({
          totalMinutes: todayData?.totalMinutes || 0,
          sessionCount:
            todayData?.sessionCount ??
            todayData?.sessionsCount ??
            (Array.isArray(todayData?.sessions) ? todayData.sessions.length : 0),
          breakdown:
            todayData?.breakdown && typeof todayData.breakdown === 'object'
              ? todayData.breakdown
              : {},
        });
      }
      if (recentRes.ok) {
        const recentData = await recentRes.json();
        setRecentStudy(recentData.sessions || []);
      }
    } catch (e) {
      console.warn('Failed to load study data', e);
    }
  };

  const handleLogStudy = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingStudy(true);
    try {
      const res = await fetch('/api/study/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: studySubject,
          durationMinutes: Number(studyMinutes),
          topic: studyTopic,
          notes: studyNotes,
        }),
      });
      if (res.ok) {
        stateManager.notify(`Logged ${studyMinutes}m study session for ${studySubject}!`, 'success');
        setStudyTopic('');
        setStudyNotes('');
        fetchStudyData();
      }
    } catch (err: any) {
      stateManager.notify('Failed to log study session: ' + err.message, 'error');
    } finally {
      setIsLoggingStudy(false);
    }
  };

  // Journal Fetchers
  const fetchJournalData = async () => {
    try {
      const res = await fetch('/api/journal/entries');
      if (res.ok) {
        const data = await res.json();
        setJournalEntries(data.entries || []);
      }
    } catch (e) {
      console.warn('Failed to load journal entries', e);
    }
  };

  const handleSaveJournal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!journalContent.trim() && !journalTitle.trim()) return;
    setIsSavingJournal(true);
    try {
      const tagsArray = journalTags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      const res = await fetch('/api/journal/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: journalTitle.trim() || 'Reflection',
          content: journalContent.trim(),
          mood: journalMood,
          tags: tagsArray,
        }),
      });
      if (res.ok) {
        stateManager.notify('Journal reflection recorded securely!', 'success');
        setJournalTitle('');
        setJournalContent('');
        fetchJournalData();
      }
    } catch (err: any) {
      stateManager.notify('Failed to save journal: ' + err.message, 'error');
    } finally {
      setIsSavingJournal(false);
    }
  };

  const handleDeleteJournal = async (id: string) => {
    try {
      await fetch(`/api/journal/delete/${id}`, { method: 'DELETE' });
      stateManager.notify('Journal entry deleted', 'info');
      fetchJournalData();
    } catch (e) {
      stateManager.notify('Failed to delete entry', 'error');
    }
  };

  // Documents Fetchers
  const fetchDocumentsData = async () => {
    try {
      const res = await fetch('/api/documents/list');
      if (res.ok) {
        const data = await res.json();
        setDocuments(data.documents || []);
      }
    } catch (e) {
      console.warn('Failed to load documents', e);
    }
  };

  const handleSelectDoc = async (filename: string) => {
    try {
      const res = await fetch(`/api/documents/read?filename=${encodeURIComponent(filename)}`);
      if (res.ok) {
        const data = await res.json();
        setActiveDocName(filename);
        setActiveDocContent(data.content || '');
      }
    } catch (e) {
      stateManager.notify('Failed to read document', 'error');
    }
  };

  const handleSaveDocument = async () => {
    const filename = activeDocName || newDocName.trim();
    if (!filename) return;
    setIsDocSaving(true);
    try {
      const res = await fetch('/api/documents/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename, content: activeDocContent }),
      });
      if (res.ok) {
        stateManager.notify(`Document "${filename}" saved cleanly!`, 'success');
        setActiveDocName(filename);
        setNewDocName('');
        fetchDocumentsData();
      }
    } catch (e: any) {
      stateManager.notify('Failed to save document: ' + e.message, 'error');
    } finally {
      setIsDocSaving(false);
    }
  };

  const handleDeleteDoc = async (filename: string) => {
    if (!confirm(`Delete ${filename}?`)) return;
    try {
      await fetch(`/api/documents/delete/${encodeURIComponent(filename)}`, { method: 'DELETE' });
      stateManager.notify(`Deleted ${filename}`, 'info');
      if (activeDocName === filename) {
        setActiveDocName(null);
        setActiveDocContent('');
      }
      fetchDocumentsData();
    } catch (e) {
      stateManager.notify('Failed to delete document', 'error');
    }
  };

  // Markets Fetchers
  const fetchWatchlistData = async () => {
    try {
      const res = await fetch('/api/markets/watchlist');
      if (res.ok) {
        const data = await res.json();
        setWatchlist(data.quotes || []);
      }
    } catch (e) {
      console.warn('Failed to load market quotes', e);
    }
  };

  const handleSearchMarket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchSymbol.trim()) return;
    setIsSearchingMarket(true);
    try {
      const res = await fetch(`/api/markets/price?symbol=${encodeURIComponent(searchSymbol.trim())}`);
      if (res.ok) {
        const data = await res.json();
        setSearchedQuote(data.quote);
      } else {
        stateManager.notify(`Market quote not found for ${searchSymbol}`, 'warning');
      }
    } catch (e: any) {
      stateManager.notify('Market query error: ' + e.message, 'error');
    } finally {
      setIsSearchingMarket(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-neutral-100 flex items-center gap-2">
            Productivity & Personal Systems
            <span className="text-xs px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-mono">
              Live SQLite Data
            </span>
          </h3>
          <p className="text-xs text-neutral-400">
            Study tracking, daily journaling, local documents repository, and live financial market intelligence.
          </p>
        </div>

        {/* Sub-tabs switch */}
        <div className="flex items-center p-1 bg-neutral-950 border border-neutral-800 rounded-xl">
          <button
            onClick={() => setSubTab('study')}
            className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
              subTab === 'study' ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" /> Study
          </button>
          <button
            onClick={() => setSubTab('journal')}
            className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
              subTab === 'journal' ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" /> Journal
          </button>
          <button
            onClick={() => setSubTab('documents')}
            className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
              subTab === 'documents' ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Folder className="w-3.5 h-3.5" /> Documents
          </button>
          <button
            onClick={() => setSubTab('markets')}
            className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
              subTab === 'markets' ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" /> Markets
          </button>
        </div>
      </div>

      {/* 1. STUDY SUB-TAB */}
      {subTab === 'study' && (
        <div className="space-y-6">
          {/* Stats Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 bg-neutral-950 border border-neutral-800 rounded-2xl">
              <span className="text-xs text-neutral-400 flex items-center gap-1.5 mb-1">
                <Clock className="w-3.5 h-3.5 text-purple-400" /> Today's Focus
              </span>
              <p className="text-xl font-bold text-neutral-100 font-mono">
                {todayStudy?.totalMinutes || 0} <span className="text-xs font-normal text-neutral-400">minutes</span>
              </p>
            </div>
            <div className="p-3.5 bg-neutral-950 border border-neutral-800 rounded-2xl">
              <span className="text-xs text-neutral-400 flex items-center gap-1.5 mb-1">
                <BookOpen className="w-3.5 h-3.5 text-emerald-400" /> Sessions Logged
              </span>
              <p className="text-xl font-bold text-neutral-100 font-mono">
                {todayStudy?.sessionCount || 0} <span className="text-xs font-normal text-neutral-400">completed</span>
              </p>
            </div>
            <div className="p-3.5 bg-neutral-950 border border-neutral-800 rounded-2xl">
              <span className="text-xs text-neutral-400 flex items-center gap-1.5 mb-1">
                <TrendingUp className="w-3.5 h-3.5 text-cyan-400" /> Subject Focus
              </span>
              <p className="text-xs font-medium text-neutral-300 truncate">
                {todayStudy?.breakdown && Object.keys(todayStudy.breakdown).length > 0
                  ? Object.entries(todayStudy.breakdown)
                      .map(([s, m]) => `${s}: ${m}m`)
                      .join(', ')
                  : 'No sessions yet today'}
              </p>
            </div>
          </div>

          {/* Quick Log Form */}
          <form onSubmit={handleLogStudy} className="p-4 bg-neutral-950 border border-neutral-800 rounded-2xl space-y-3">
            <h4 className="text-xs font-semibold text-neutral-200 flex items-center gap-2">
              <Plus className="w-3.5 h-3.5 text-purple-400" /> Log Study Session
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-neutral-400 mb-1">Subject</label>
                <input
                  type="text"
                  required
                  value={studySubject}
                  onChange={(e) => setStudySubject(e.target.value)}
                  placeholder="e.g. Physics, Cybersecurity, React"
                  className="w-full px-3 py-2 text-xs bg-neutral-900 border border-neutral-800 rounded-xl text-neutral-200 focus:outline-none focus:border-purple-500"
                />
              </div>
              <div>
                <label className="block text-[11px] text-neutral-400 mb-1">Duration (Minutes)</label>
                <input
                  type="number"
                  min="5"
                  max="480"
                  required
                  value={studyMinutes}
                  onChange={(e) => setStudyMinutes(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs bg-neutral-900 border border-neutral-800 rounded-xl text-neutral-200 focus:outline-none focus:border-purple-500 font-mono"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-neutral-400 mb-1">Topic</label>
                <input
                  type="text"
                  value={studyTopic}
                  onChange={(e) => setStudyTopic(e.target.value)}
                  placeholder="e.g. Asymmetric Encryption, Buffer Overflows"
                  className="w-full px-3 py-2 text-xs bg-neutral-900 border border-neutral-800 rounded-xl text-neutral-200 focus:outline-none focus:border-purple-500"
                />
              </div>
              <div>
                <label className="block text-[11px] text-neutral-400 mb-1">Notes / Reflection</label>
                <input
                  type="text"
                  value={studyNotes}
                  onChange={(e) => setStudyNotes(e.target.value)}
                  placeholder="Key concepts grasped, challenges faced"
                  className="w-full px-3 py-2 text-xs bg-neutral-900 border border-neutral-800 rounded-xl text-neutral-200 focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>
            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={isLoggingStudy}
                className="px-4 py-1.5 text-xs font-medium text-white bg-purple-600 hover:bg-purple-500 rounded-xl transition-colors disabled:opacity-50"
              >
                {isLoggingStudy ? 'Logging...' : 'Save Study Log'}
              </button>
            </div>
          </form>

          {/* Recent Study List */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-neutral-300">Recent Study History</h4>
            {recentStudy.length === 0 ? (
              <p className="text-xs text-neutral-500 italic p-3 bg-neutral-950 rounded-xl border border-neutral-800">
                No study sessions recorded yet. Ask Mery: "Log 45 minutes of studying algorithms" or record above.
              </p>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto">
                {recentStudy.map((s) => (
                  <div key={s.id} className="p-3 bg-neutral-950 border border-neutral-800 rounded-xl flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-neutral-200">{s.subject}</span>
                        {s.topic && <span className="text-[11px] text-neutral-400">· {s.topic}</span>}
                      </div>
                      {s.notes && <p className="text-[11px] text-neutral-400 mt-0.5">{s.notes}</p>}
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-mono text-purple-400 font-semibold">{s.duration_minutes}m</span>
                      <span className="block text-[10px] text-neutral-500">
                        {new Date(s.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. JOURNAL SUB-TAB */}
      {subTab === 'journal' && (
        <div className="space-y-6">
          {/* New Entry Form */}
          <form onSubmit={handleSaveJournal} className="p-4 bg-neutral-950 border border-neutral-800 rounded-2xl space-y-3">
            <h4 className="text-xs font-semibold text-neutral-200 flex items-center gap-2">
              <Edit3 className="w-3.5 h-3.5 text-purple-400" /> Record Daily Reflection
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-[11px] text-neutral-400 mb-1">Title</label>
                <input
                  type="text"
                  value={journalTitle}
                  onChange={(e) => setJournalTitle(e.target.value)}
                  placeholder="e.g. Milestone reached in security audit"
                  className="w-full px-3 py-2 text-xs bg-neutral-900 border border-neutral-800 rounded-xl text-neutral-200 focus:outline-none focus:border-purple-500"
                />
              </div>
              <div>
                <label className="block text-[11px] text-neutral-400 mb-1">Mood</label>
                <select
                  value={journalMood}
                  onChange={(e) => setJournalMood(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs bg-neutral-900 border border-neutral-800 rounded-xl text-neutral-200 focus:outline-none focus:border-purple-500"
                >
                  <option value="productive">Productive ⚡</option>
                  <option value="reflective">Reflective 🌙</option>
                  <option value="energetic">Energetic 🚀</option>
                  <option value="calm">Calm 🌿</option>
                  <option value="tired">Tired ☕</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-[11px] text-neutral-400 mb-1">Content / Thoughts</label>
              <textarea
                rows={3}
                required
                value={journalContent}
                onChange={(e) => setJournalContent(e.target.value)}
                placeholder="What happened today? What did you learn? How are you feeling?"
                className="w-full px-3 py-2 text-xs bg-neutral-900 border border-neutral-800 rounded-xl text-neutral-200 focus:outline-none focus:border-purple-500"
              />
            </div>
            <div>
              <label className="block text-[11px] text-neutral-400 mb-1">Tags (comma-separated)</label>
              <input
                type="text"
                value={journalTags}
                onChange={(e) => setJournalTags(e.target.value)}
                placeholder="daily, ideas, gratitude"
                className="w-full px-3 py-2 text-xs bg-neutral-900 border border-neutral-800 rounded-xl text-neutral-200 focus:outline-none focus:border-purple-500"
              />
            </div>
            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={isSavingJournal}
                className="px-4 py-1.5 text-xs font-medium text-white bg-purple-600 hover:bg-purple-500 rounded-xl transition-colors disabled:opacity-50"
              >
                {isSavingJournal ? 'Saving...' : 'Record Reflection'}
              </button>
            </div>
          </form>

          {/* Journal Entries List */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-neutral-300">Journal Reflections</h4>
            {journalEntries.length === 0 ? (
              <p className="text-xs text-neutral-500 italic p-3 bg-neutral-950 rounded-xl border border-neutral-800">
                No journal entries recorded yet. Talk to Mery: "Mery, write in my journal that we made big progress today!"
              </p>
            ) : (
              <div className="space-y-3 max-h-72 overflow-y-auto">
                {journalEntries.map((entry) => (
                  <div key={entry.id} className="p-4 bg-neutral-950 border border-neutral-800 rounded-2xl space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-neutral-100">{entry.title}</span>
                        {entry.mood && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 font-mono">
                            {entry.mood}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-neutral-500 font-mono">
                          {new Date(entry.timestamp).toLocaleDateString()}
                        </span>
                        <button
                          onClick={() => handleDeleteJournal(entry.id)}
                          className="p-1 text-neutral-500 hover:text-red-400 transition-colors"
                          title="Delete entry"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-neutral-300 whitespace-pre-wrap">{entry.content}</p>
                    {entry.tags && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {(() => {
                          let tagsList: string[] = [];
                          if (Array.isArray(entry.tags)) {
                            tagsList = entry.tags;
                          } else if (typeof entry.tags === 'string') {
                            try {
                              const parsed = JSON.parse(entry.tags);
                              tagsList = Array.isArray(parsed) ? parsed : [String(parsed)];
                            } catch {
                              tagsList = entry.tags.split(',').map((t: string) => t.trim()).filter(Boolean);
                            }
                          }
                          return tagsList.map((t: string, idx: number) => (
                            <span key={idx} className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-900 text-neutral-400">
                              #{t}
                            </span>
                          ));
                        })()}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. DOCUMENTS SUB-TAB */}
      {subTab === 'documents' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* File Browser */}
          <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-2xl flex flex-col justify-between h-96">
            <div>
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-neutral-800">
                <span className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
                  <Folder className="w-3.5 h-3.5 text-purple-400" /> data/documents/
                </span>
                <span className="text-[10px] text-neutral-500 font-mono">{documents.length} files</span>
              </div>
              <div className="space-y-1 overflow-y-auto max-h-64">
                {documents.map((doc) => (
                  <div
                    key={doc.filename}
                    onClick={() => handleSelectDoc(doc.filename)}
                    className={`flex items-center justify-between p-2 rounded-xl text-xs cursor-pointer transition-colors ${
                      activeDocName === doc.filename
                        ? 'bg-purple-900/30 text-purple-200 border border-purple-500/30'
                        : 'text-neutral-400 hover:bg-neutral-900 hover:text-neutral-200'
                    }`}
                  >
                    <span className="truncate flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 shrink-0" /> {doc.filename}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteDoc(doc.filename);
                      }}
                      className="p-1 text-neutral-500 hover:text-red-400 opacity-60 hover:opacity-100"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Create new document input */}
            <div className="pt-2 border-t border-neutral-800">
              <input
                type="text"
                placeholder="New filename (e.g. notes.md)"
                value={newDocName}
                onChange={(e) => {
                  setNewDocName(e.target.value);
                  setActiveDocName(null);
                  setActiveDocContent('');
                }}
                className="w-full px-2.5 py-1.5 text-xs bg-neutral-900 border border-neutral-800 rounded-xl text-neutral-200 focus:outline-none focus:border-purple-500 mb-1"
              />
            </div>
          </div>

          {/* Editor / Viewer */}
          <div className="md:col-span-2 p-4 bg-neutral-950 border border-neutral-800 rounded-2xl flex flex-col justify-between h-96">
            <div>
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-neutral-800">
                <span className="text-xs font-semibold text-neutral-200 flex items-center gap-1.5 font-mono">
                  <FileText className="w-3.5 h-3.5 text-purple-400" />
                  {activeDocName || newDocName || 'Select or create a document'}
                </span>
                <button
                  onClick={handleSaveDocument}
                  disabled={isDocSaving || (!activeDocName && !newDocName)}
                  className="flex items-center gap-1 px-3 py-1 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white rounded-lg text-xs font-medium transition-colors"
                >
                  <Save className="w-3 h-3" />
                  {isDocSaving ? 'Saving...' : 'Save File'}
                </button>
              </div>
              <textarea
                value={activeDocContent}
                onChange={(e) => setActiveDocContent(e.target.value)}
                placeholder="Write or edit document contents here... Mery can also read and edit these documents directly via voice tools!"
                className="w-full h-72 p-2.5 text-xs font-mono bg-neutral-900 border border-neutral-800 rounded-xl text-neutral-200 focus:outline-none focus:border-purple-500 resize-none"
              />
            </div>
          </div>
        </div>
      )}

      {/* 4. MARKETS SUB-TAB */}
      {subTab === 'markets' && (
        <div className="space-y-6">
          {/* Symbol Lookup Form */}
          <form onSubmit={handleSearchMarket} className="p-4 bg-neutral-950 border border-neutral-800 rounded-2xl flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search symbol (e.g. BTC, ETH, AAPL, GOOGL, TSLA)..."
                value={searchSymbol}
                onChange={(e) => setSearchSymbol(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-neutral-900 border border-neutral-800 rounded-xl text-neutral-200 focus:outline-none focus:border-purple-500 font-mono"
              />
            </div>
            <button
              type="submit"
              disabled={isSearchingMarket}
              className="px-4 py-2 text-xs font-medium text-white bg-purple-600 hover:bg-purple-500 rounded-xl transition-colors disabled:opacity-50"
            >
              {isSearchingMarket ? 'Querying...' : 'Get Price'}
            </button>
          </form>

          {/* Searched Quote Card */}
          {searchedQuote && (
            <div className="p-4 bg-purple-950/20 border border-purple-500/40 rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-xs font-mono text-purple-300 font-bold">{searchedQuote.symbol}</span>
                <p className="text-2xl font-bold font-mono text-neutral-100 mt-1">
                  ${searchedQuote.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <span className="text-[10px] text-neutral-500 font-mono">
                  Source: {searchedQuote.source} · Updated: {searchedQuote.timestamp}
                </span>
              </div>
              <div className="text-right">
                <span
                  className={`text-sm font-bold font-mono px-2 py-0.5 rounded ${
                    searchedQuote.change >= 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                  }`}
                >
                  {searchedQuote.change >= 0 ? '+' : ''}
                  {searchedQuote.changePercent.toFixed(2)}%
                </span>
                <p className="text-xs font-mono text-neutral-400 mt-1">
                  Day Range: ${searchedQuote.low} - ${searchedQuote.high}
                </p>
              </div>
            </div>
          )}

          {/* Watchlist Grid */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-neutral-300">Live Global Watchlist</h4>
              <button
                onClick={fetchWatchlistData}
                className="text-[11px] text-neutral-400 hover:text-purple-400 flex items-center gap-1 transition-colors"
              >
                <RefreshCw className="w-3 h-3" /> Refresh Quotes
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {watchlist.map((quote) => (
                <div key={quote.symbol} className="p-3 bg-neutral-950 border border-neutral-800 rounded-xl space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold font-mono text-neutral-200">{quote.symbol}</span>
                    <span
                      className={`text-[11px] font-mono font-semibold ${
                        quote.change >= 0 ? 'text-emerald-400' : 'text-red-400'
                      }`}
                    >
                      {quote.change >= 0 ? '+' : ''}
                      {quote.changePercent?.toFixed(2)}%
                    </span>
                  </div>
                  <p className="text-lg font-bold font-mono text-neutral-100">
                    ${quote.price?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <p className="text-[10px] text-neutral-500 font-mono">Powered by {quote.source}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
