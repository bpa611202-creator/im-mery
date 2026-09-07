import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Sliders,
  AppWindow,
  FolderOpen,
  Music,
  Bell,
  FileText,
  Home,
  Play,
  Pause,
  Volume2,
  Sun,
  Search,
  Plus,
  Trash2,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Circle,
  FileCode,
  FileAudio,
} from 'lucide-react';
import { systemController } from '../utils/systemController';
import { SystemApp, VirtualFile, SystemReminder, SystemNote, SmartHomeDevice } from '../types';

interface SystemControlDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  onNotifyMeryAction?: (text: string) => void;
}

export const SystemControlDashboard: React.FC<SystemControlDashboardProps> = ({
  isOpen,
  onClose,
  onNotifyMeryAction,
}) => {
  const [activeTab, setActiveTab] = useState<'apps' | 'files' | 'media' | 'reminders' | 'smarthome'>('apps');
  const [apps, setApps] = useState<SystemApp[]>([]);
  const [files, setFiles] = useState<VirtualFile[]>([]);
  const [reminders, setReminders] = useState<SystemReminder[]>([]);
  const [notes, setNotes] = useState<SystemNote[]>([]);
  const [devices, setDevices] = useState<SmartHomeDevice[]>([]);
  const [mediaState, setMediaState] = useState(systemController.getMediaState());

  // Form states
  const [searchQuery, setSearchQuery] = useState('');
  const [newFileName, setNewFileName] = useState('');
  const [newReminderTitle, setNewReminderTitle] = useState('');
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [newNoteContent, setNewNoteContent] = useState('');

  const refreshState = () => {
    setApps(systemController.getApps());
    setFiles(systemController.getFiles());
    setReminders(systemController.getReminders());
    setNotes(systemController.getNotes());
    setDevices(systemController.getSmartDevices());
    setMediaState(systemController.getMediaState());
  };

  useEffect(() => {
    refreshState();
    const unsub = systemController.subscribe(() => {
      refreshState();
    });
    return unsub;
  }, []);

  const handleLaunchApp = (app: SystemApp) => {
    const res = systemController.launchApp(app.name);
    onNotifyMeryAction?.(res);
  };

  const handleCloseApp = (app: SystemApp) => {
    const res = systemController.closeApp(app.name);
    onNotifyMeryAction?.(res);
  };

  const handleToggleMedia = () => {
    systemController.toggleMediaPlayback();
  };

  const handleCreateFile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFileName.trim()) return;
    const res = systemController.createFile(newFileName.trim());
    setNewFileName('');
    onNotifyMeryAction?.(res);
  };

  const handleDeleteFile = async (id: string) => {
    const deleted = await systemController.deleteFileWithSafety(id);
    if (deleted) {
      onNotifyMeryAction?.('File deleted securely upon user safety confirmation.');
    }
  };

  const handleAddReminder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReminderTitle.trim()) return;
    systemController.addReminder(newReminderTitle.trim(), 'In 30 mins', 30);
    setNewReminderTitle('');
    onNotifyMeryAction?.(`Added reminder: ${newReminderTitle}`);
  };

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteTitle.trim()) return;
    systemController.addNote(newNoteTitle.trim(), newNoteContent.trim());
    setNewNoteTitle('');
    setNewNoteContent('');
    onNotifyMeryAction?.(`Created note: ${newNoteTitle}`);
  };

  const handleWebSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    systemController.searchWeb(searchQuery.trim());
    onNotifyMeryAction?.(`Searched web for "${searchQuery}"`);
    setSearchQuery('');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div id="system-control-modal" className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
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
            className="relative w-full max-w-4xl max-h-[90vh] bg-[#020204]/95 border border-[#00A3FF]/25 rounded-3xl p-5 sm:p-7 shadow-[0_20px_60px_rgba(0,0,0,0.8),0_0_40px_rgba(0,163,255,0.15)] backdrop-blur-2xl flex flex-col z-10 overflow-hidden text-[#FFFFFF]"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-[#00A3FF]/15">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-gradient-to-br from-[#0066FF]/30 to-[#00A3FF]/30 border border-[#00A3FF]/30 text-[#00A3FF]">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-display font-semibold text-lg text-[#FFFFFF]">
                    M4 System Controller
                  </h2>
                  <p className="text-xs text-[#00A3FF] flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    Live Computer Interface · Voice Controlled & Hands-Free
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

            {/* Quick Global Sliders / Hardware Strip */}
            <div className="my-4 p-4 rounded-2xl bg-[#140F24]/80 border border-[#0066FF]/20 grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
              {/* Media Controls */}
              <div className="flex items-center gap-3">
                <button
                  onClick={handleToggleMedia}
                  className="p-2.5 rounded-xl bg-[#0066FF]/25 text-[#00A3FF] hover:bg-[#0066FF]/40 transition-all"
                  title={mediaState.isPlaying ? 'Pause ambient focus audio' : 'Play ambient focus audio'}
                >
                  {mediaState.isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>
                <div className="overflow-hidden">
                  <div className="text-xs font-semibold text-white/90 truncate">
                    {mediaState.currentTrack}
                  </div>
                  <div className="text-[10px] text-[#00A3FF]/80 font-telemetry">
                    {mediaState.isPlaying ? 'PLAYING 432Hz' : 'AUDIO PAUSED'}
                  </div>
                </div>
              </div>

              {/* Volume Slider */}
              <div className="flex items-center gap-2.5">
                <Volume2 className="w-4 h-4 text-[#38BDF8] shrink-0" />
                <div className="flex-1">
                  <div className="flex justify-between text-[11px] font-telemetry mb-1 text-white/70">
                    <span>AUDIO VOL</span>
                    <span className="text-[#00A3FF]">{mediaState.volume}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={mediaState.volume}
                    onChange={(e) => systemController.setVolume(Number(e.target.value))}
                    className="w-full accent-[#00A3FF] h-1.5 rounded-lg bg-black/40 cursor-pointer"
                  />
                </div>
              </div>

              {/* Brightness Tint Slider */}
              <div className="flex items-center gap-2.5">
                <Sun className="w-4 h-4 text-[#00A3FF] shrink-0" />
                <div className="flex-1">
                  <div className="flex justify-between text-[11px] font-telemetry mb-1 text-white/70">
                    <span>DISPLAY LEVEL</span>
                    <span className="text-[#38BDF8]">{mediaState.brightness}%</span>
                  </div>
                  <input
                    type="range"
                    min="60"
                    max="100"
                    value={mediaState.brightness}
                    onChange={(e) => systemController.setBrightness(Number(e.target.value))}
                    className="w-full accent-[#0066FF] h-1.5 rounded-lg bg-black/40 cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-4 border-b border-white/10 no-scrollbar">
              <button
                onClick={() => setActiveTab('apps')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
                  activeTab === 'apps'
                    ? 'bg-gradient-to-r from-[#0066FF]/30 to-[#00A3FF]/30 text-white border border-[#00A3FF]/40 shadow-[0_0_15px_rgba(0,163,255,0.2)]'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                <AppWindow className="w-3.5 h-3.5" />
                Applications ({apps.filter((a) => a.status === 'running').length} Active)
              </button>

              <button
                onClick={() => setActiveTab('files')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
                  activeTab === 'files'
                    ? 'bg-gradient-to-r from-[#0066FF]/30 to-[#00A3FF]/30 text-white border border-[#00A3FF]/40 shadow-[0_0_15px_rgba(0,163,255,0.2)]'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                <FolderOpen className="w-3.5 h-3.5" />
                Files ({files.length})
              </button>

              <button
                onClick={() => setActiveTab('reminders')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
                  activeTab === 'reminders'
                    ? 'bg-gradient-to-r from-[#0066FF]/30 to-[#00A3FF]/30 text-white border border-[#00A3FF]/40 shadow-[0_0_15px_rgba(0,163,255,0.2)]'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                <Bell className="w-3.5 h-3.5" />
                Reminders & Notes
              </button>

              <button
                onClick={() => setActiveTab('smarthome')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
                  activeTab === 'smarthome'
                    ? 'bg-gradient-to-r from-[#0066FF]/30 to-[#00A3FF]/30 text-white border border-[#00A3FF]/40 shadow-[0_0_15px_rgba(0,163,255,0.2)]'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                <Home className="w-3.5 h-3.5" />
                Smart Studio ({devices.filter((d) => d.state).length} On)
              </button>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto pr-1">
              {/* Apps Tab */}
              {activeTab === 'apps' && (
                <div className="space-y-4">
                  {/* Web search quick bar */}
                  <form onSubmit={handleWebSearch} className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 absolute left-3 top-3 text-white/40" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search the web or launch a site via MERY..."
                        className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-[#081426] border border-white/10 text-white placeholder-white/40 focus:border-[#00A3FF]/50 focus:outline-none"
                      />
                    </div>
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-xl text-xs font-medium bg-[#0066FF]/30 text-[#00A3FF] hover:bg-[#0066FF]/40 border border-[#00A3FF]/30 transition-all flex items-center gap-1.5"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Search
                    </button>
                  </form>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {apps.map((app, idx) => (
                      <div
                        key={`${app.id}_${idx}`}
                        className="p-3.5 rounded-2xl bg-[#081426]/70 border border-white/10 flex items-center justify-between hover:border-[#00A3FF]/30 transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-2.5 rounded-xl border ${
                            app.status === 'running'
                              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                              : 'bg-white/5 border-white/10 text-white/40'
                          }`}>
                            <AppWindow className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-xs font-semibold text-white/90">
                              {app.name}
                            </div>
                            <div className="text-[10px] font-telemetry text-white/50 flex items-center gap-2">
                              <span className={app.status === 'running' ? 'text-emerald-400' : 'text-white/40'}>
                                {app.status.toUpperCase()}
                              </span>
                              {app.status === 'running' && (
                                <span>· CPU {app.cpuUsage}%</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {app.status === 'running' ? (
                            <button
                              onClick={() => handleCloseApp(app)}
                              className="px-2.5 py-1 rounded-lg text-[11px] font-telemetry bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border border-rose-500/30 transition-all"
                            >
                              CLOSE
                            </button>
                          ) : (
                            <button
                              onClick={() => handleLaunchApp(app)}
                              className="px-2.5 py-1 rounded-lg text-[11px] font-telemetry bg-[#0066FF]/25 text-[#00A3FF] hover:bg-[#0066FF]/40 border border-[#00A3FF]/30 transition-all"
                            >
                              LAUNCH
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Files Tab */}
              {activeTab === 'files' && (
                <div className="space-y-4">
                  <form onSubmit={handleCreateFile} className="flex gap-2">
                    <input
                      type="text"
                      value={newFileName}
                      onChange={(e) => setNewFileName(e.target.value)}
                      placeholder="Create new file (e.g. project-notes.md, task-list.json)..."
                      className="flex-1 px-4 py-2 text-xs rounded-xl bg-[#081426] border border-white/10 text-white placeholder-white/40 focus:border-[#00A3FF]/50 focus:outline-none"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-xl text-xs font-medium bg-[#0066FF]/30 text-[#00A3FF] hover:bg-[#0066FF]/40 border border-[#00A3FF]/30 transition-all flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Create File
                    </button>
                  </form>

                  <div className="space-y-2">
                    {files.map((file, idx) => (
                      <div
                        key={`${file.id}_${idx}`}
                        className="p-3 rounded-2xl bg-[#081426]/70 border border-white/10 flex items-center justify-between hover:border-[#00A3FF]/30 transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-xl bg-[#0066FF]/15 border border-[#0066FF]/25 text-[#38BDF8]">
                            {file.type === 'code' ? (
                              <FileCode className="w-4 h-4" />
                            ) : file.type === 'audio' ? (
                              <FileAudio className="w-4 h-4" />
                            ) : (
                              <FileText className="w-4 h-4" />
                            )}
                          </div>
                          <div>
                            <div className="text-xs font-medium text-white/90">
                              {file.name}
                            </div>
                            <div className="text-[10px] font-telemetry text-white/50">
                              {file.path} · {file.size} · Updated {file.updatedAt}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleDeleteFile(file.id)}
                            className="p-1.5 rounded-lg text-rose-400/70 hover:text-rose-300 hover:bg-rose-500/20 transition-all"
                            title="Delete file (Requires M4 Safety Confirmation)"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Reminders & Notes Tab */}
              {activeTab === 'reminders' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Reminders Section */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-telemetry uppercase tracking-wider text-[#00A3FF] flex items-center gap-1.5">
                      <Bell className="w-3.5 h-3.5" /> Scheduled Reminders
                    </h3>

                    <form onSubmit={handleAddReminder} className="flex gap-2">
                      <input
                        type="text"
                        value={newReminderTitle}
                        onChange={(e) => setNewReminderTitle(e.target.value)}
                        placeholder="Add reminder..."
                        className="flex-1 px-3 py-1.5 text-xs rounded-xl bg-[#081426] border border-white/10 text-white placeholder-white/40 focus:border-[#00A3FF]/50 focus:outline-none"
                      />
                      <button
                        type="submit"
                        className="px-3 py-1.5 rounded-xl text-xs bg-[#0066FF]/30 text-[#00A3FF] border border-[#00A3FF]/30 hover:bg-[#0066FF]/40"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </form>

                    <div className="space-y-2">
                      {reminders.map((rem, idx) => (
                        <div
                          key={`${rem.id}_${idx}`}
                          className="p-3 rounded-xl bg-[#081426]/70 border border-white/10 flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2.5">
                            <button
                              onClick={() => systemController.toggleReminder(rem.id)}
                              className="text-white/60 hover:text-emerald-400 transition-all"
                            >
                              {rem.completed ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                              ) : (
                                <Circle className="w-4 h-4" />
                              )}
                            </button>
                            <div>
                              <div
                                className={`text-xs ${
                                  rem.completed ? 'line-through text-white/40' : 'text-white/90'
                                }`}
                              >
                                {rem.title}
                              </div>
                              <div className="text-[10px] font-telemetry text-[#00A3FF]">
                                {rem.timeString}
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => systemController.deleteReminder(rem.id)}
                            className="p-1 rounded text-white/30 hover:text-rose-400"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Notes Section */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-telemetry uppercase tracking-wider text-[#38BDF8] flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5" /> MERY Quick Notes
                    </h3>

                    <form onSubmit={handleAddNote} className="space-y-2">
                      <input
                        type="text"
                        value={newNoteTitle}
                        onChange={(e) => setNewNoteTitle(e.target.value)}
                        placeholder="Note title..."
                        className="w-full px-3 py-1.5 text-xs rounded-xl bg-[#081426] border border-white/10 text-white placeholder-white/40 focus:border-[#00A3FF]/50 focus:outline-none"
                      />
                      <textarea
                        value={newNoteContent}
                        onChange={(e) => setNewNoteContent(e.target.value)}
                        placeholder="Note content..."
                        rows={2}
                        className="w-full px-3 py-1.5 text-xs rounded-xl bg-[#081426] border border-white/10 text-white placeholder-white/40 focus:border-[#00A3FF]/50 focus:outline-none resize-none"
                      />
                      <button
                        type="submit"
                        className="w-full py-1.5 rounded-xl text-xs font-medium bg-[#0066FF]/30 text-[#00A3FF] border border-[#00A3FF]/30 hover:bg-[#0066FF]/40 flex items-center justify-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" /> Save Note
                      </button>
                    </form>

                    <div className="space-y-2">
                      {notes.map((note, idx) => (
                        <div
                          key={`${note.id}_${idx}`}
                          className="p-3 rounded-xl bg-[#081426]/70 border border-white/10 relative group"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="text-xs font-semibold text-white/90">
                              {note.title}
                            </h4>
                            <button
                              onClick={() => systemController.deleteNote(note.id)}
                              className="text-white/30 hover:text-rose-400"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <p className="text-xs text-white/70 whitespace-pre-wrap">
                            {note.content}
                          </p>
                          <div className="text-[10px] font-telemetry text-[#00A3FF]/70 mt-1">
                            {note.updatedAt}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Smart Home Tab */}
              {activeTab === 'smarthome' && (
                <div className="space-y-3">
                  <p className="text-xs text-white/70">
                    Voice-native control over studio lighting, temperature, and ambient environment.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {devices.map((device, idx) => (
                      <div
                        key={`${device.id}_${idx}`}
                        className="p-4 rounded-2xl bg-[#081426]/70 border border-white/10 flex items-center justify-between"
                      >
                        <div>
                          <div className="text-xs font-semibold text-white/90">
                            {device.name}
                          </div>
                          <div className="text-[11px] font-telemetry text-[#00A3FF]">
                            {device.value}
                          </div>
                        </div>

                        <button
                          onClick={() => systemController.toggleSmartDevice(device.id)}
                          className={`px-3 py-1 rounded-full text-xs font-telemetry font-semibold transition-all ${
                            device.state
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-[0_0_12px_rgba(52,211,153,0.3)]'
                              : 'bg-white/5 text-white/40 border border-white/10'
                          }`}
                        >
                          {device.state ? 'ACTIVE' : 'OFF'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
