import React, { useState, useEffect } from 'react';
import {
  X,
  FileText,
  Folder,
  Plus,
  Trash2,
  Save,
  Download,
  Search,
  CheckCircle2,
  RefreshCw,
  Edit,
  FileCode,
  Clock,
  HardDrive,
} from 'lucide-react';
import { stateManager } from '../modules/StateManager';

export interface DocItem {
  name: string;
  sizeBytes: number;
  updatedAt: string;
}

interface DocumentsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DocumentsPanel: React.FC<DocumentsPanelProps> = ({ isOpen, onClose }) => {
  const [documents, setDocuments] = useState<DocItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<string | null>(null);
  const [docContent, setDocContent] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [newDocName, setNewDocName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadDocuments();
    }
  }, [isOpen]);

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/documents/list');
      if (res.ok) {
        const data = await res.json();
        setDocuments(data.documents || []);
        if (data.documents && data.documents.length > 0 && !selectedDoc) {
          handleOpenDoc(data.documents[0].name);
        }
      }
    } catch (err) {
      console.warn('Failed to list documents:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDoc = async (docName: string) => {
    try {
      setSelectedDoc(docName);
      setIsCreating(false);
      const res = await fetch(`/api/documents/read?path=${encodeURIComponent(docName)}`);
      if (res.ok) {
        const data = await res.json();
        setDocContent(data.content || '');
      } else {
        setDocContent('');
      }
    } catch (e) {
      stateManager.notify('Failed to load document content', 'error');
    }
  };

  const handleSaveDoc = async () => {
    const targetName = isCreating ? newDocName.trim() : selectedDoc;
    if (!targetName) {
      stateManager.notify('Please provide a document name', 'warning');
      return;
    }

    const cleanName = targetName.endsWith('.md') || targetName.endsWith('.txt') || targetName.endsWith('.json')
      ? targetName
      : `${targetName}.md`;

    setIsSaving(true);
    try {
      const res = await fetch('/api/documents/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: cleanName,
          content: docContent,
        }),
      });

      if (res.ok) {
        stateManager.notify(`Saved document: ${cleanName}`, 'success');
        setSelectedDoc(cleanName);
        setIsCreating(false);
        setNewDocName('');
        await loadDocuments();
      } else {
        throw new Error('Save error');
      }
    } catch (e: any) {
      stateManager.notify(`Could not save document: ${e.message}`, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteDoc = async (docName: string) => {
    if (!confirm(`Are you sure you want to delete ${docName}?`)) return;
    try {
      const res = await fetch('/api/documents/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: docName }),
      });
      if (res.ok) {
        stateManager.notify(`Deleted ${docName}`, 'info');
        if (selectedDoc === docName) {
          setSelectedDoc(null);
          setDocContent('');
        }
        await loadDocuments();
      }
    } catch (e) {
      stateManager.notify('Failed to delete document', 'error');
    }
  };

  const handleDownload = () => {
    if (!selectedDoc || !docContent) return;
    const blob = new Blob([docContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = selectedDoc;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredDocs = documents.filter((d) =>
    d.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div
      id="documents-panel-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-fade-in"
    >
      <div className="relative w-full max-w-4xl h-[85vh] bg-[#0a0c10] border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-white font-sans">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 shrink-0 bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <Folder className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white tracking-wide flex items-center gap-2">
                Mery Scoped Documents
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 font-telemetry uppercase">
                  data/documents/
                </span>
              </h2>
              <p className="text-xs text-white/50">Local sandboxed files Mery can read, write, and reference</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setIsCreating(true);
                setSelectedDoc(null);
                setNewDocName('notes.md');
                setDocContent('# New Document\n\n');
              }}
              className="px-3 py-1.5 rounded-xl bg-[#00ff66]/15 hover:bg-[#00ff66]/25 border border-[#00ff66]/30 text-[#00ff66] text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New File</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 flex min-h-0 overflow-hidden">
          {/* File Explorer Sidebar */}
          <div className="w-full sm:w-72 border-r border-white/10 flex flex-col shrink-0 bg-black/40">
            {/* Search */}
            <div className="p-3 border-b border-white/5">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-white/40" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search files..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/10 text-white text-xs placeholder:text-white/30 focus:outline-none focus:border-[#00ff66]/40"
                />
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto divide-y divide-white/5">
              {loading && documents.length === 0 ? (
                <div className="p-6 text-center text-xs text-white/40">Loading directory...</div>
              ) : filteredDocs.length === 0 ? (
                <div className="p-6 text-center text-xs text-white/40">No documents found</div>
              ) : (
                filteredDocs.map((doc) => {
                  const isSelected = selectedDoc === doc.name && !isCreating;
                  return (
                    <div
                      key={doc.name}
                      onClick={() => handleOpenDoc(doc.name)}
                      className={`p-3 cursor-pointer transition-colors flex items-center justify-between group ${
                        isSelected
                          ? 'bg-white/[0.08] border-l-2 border-[#00ff66]'
                          : 'hover:bg-white/[0.03]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <FileText className="w-4 h-4 text-cyan-400 shrink-0" />
                        <div className="truncate text-left">
                          <p className="text-xs font-medium text-white truncate">{doc.name}</p>
                          <p className="text-[10px] text-white/40 font-telemetry">
                            {(doc.sizeBytes / 1024).toFixed(1)} KB
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteDoc(doc.name);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 text-white/40 hover:text-rose-400 transition-opacity cursor-pointer"
                        title="Delete file"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Editor / Viewer Pane */}
          <div className="flex-1 flex flex-col min-h-0 bg-black/20">
            {isCreating || selectedDoc ? (
              <>
                {/* Editor Header */}
                <div className="flex items-center justify-between px-5 py-3 border-b border-white/10 shrink-0 bg-white/[0.02]">
                  <div className="flex items-center gap-2">
                    {isCreating ? (
                      <input
                        type="text"
                        value={newDocName}
                        onChange={(e) => setNewDocName(e.target.value)}
                        placeholder="filename.md"
                        className="px-2 py-1 rounded bg-white/[0.04] border border-white/20 text-xs font-mono text-[#00ff66] focus:outline-none"
                      />
                    ) : (
                      <span className="text-xs font-mono text-white/90 font-medium">
                        {selectedDoc}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {selectedDoc && !isCreating && (
                      <button
                        onClick={handleDownload}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-all cursor-pointer"
                        title="Download to PC/Phone"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    )}

                    <button
                      onClick={handleSaveDoc}
                      disabled={isSaving}
                      className="px-3 py-1.5 rounded-xl bg-[#00ff66] text-[#080809] text-xs font-bold hover:bg-[#00ff66]/90 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{isSaving ? 'Saving...' : 'Save File'}</span>
                    </button>
                  </div>
                </div>

                {/* Editor Textarea */}
                <div className="flex-1 p-4 min-h-0">
                  <textarea
                    value={docContent}
                    onChange={(e) => setDocContent(e.target.value)}
                    placeholder="Write markdown, code, or notes..."
                    className="w-full h-full p-4 rounded-xl bg-black/40 border border-white/10 text-white text-xs font-mono leading-relaxed focus:outline-none focus:border-[#00ff66]/40 resize-none"
                  />
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-white/40 gap-3">
                <FileCode className="w-8 h-8 text-white/20" />
                <p className="text-xs">Select a document to view and edit, or click 'New File'.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
