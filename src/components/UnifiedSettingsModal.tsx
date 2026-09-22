import React, { useState, useEffect } from 'react';
import {
  X,
  Sliders,
  Mail,
  MessageSquare,
  Share2,
  Plug,
  Sparkles,
  Shield,
  Volume2,
  Database,
  Download,
  Upload,
  Key,
  CheckCircle2,
  AlertCircle,
  Clock,
  RefreshCw,
  Eye,
  EyeOff,
  Plus,
  Trash2,
  PhoneCall,
  Smartphone,
  Terminal,
  Search,
  ExternalLink,
  ShieldAlert,
  Radio,
  Send,
  UserCheck,
  BookOpen,
} from 'lucide-react';
import { skillManager } from '../modules/skills/SkillManager';
import { CompanionSkill } from '../modules/skills/skillsData';
import { safetyManager, SafetySettings, EmergencyContact } from '../modules/SafetyManager';
import { telephonyBridge, IncomingCallEvent } from '../modules/TelephonyBridge';
import { providerManager } from '../utils/providerManager';
import { ProviderConfig, VoiceSettings, StructuredLog } from '../types';
import { stateManager, SpokenLanguage } from '../modules/StateManager';
import { voiceService } from '../utils/audio';
import { logger } from '../utils/logger';
import { PersonasSettingsPanel } from './settings/PersonasSettingsPanel';
import { ProductivitySettingsPanel } from './settings/ProductivitySettingsPanel';
import { HandoffSettingsPanel } from './HandoffSettingsPanel';

interface UnifiedSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSkillStore?: () => void;
  initialTab?: SettingsTab;
  onSyncState?: () => void;
  immersiveCallMode?: boolean;
  onToggleImmersiveCallMode?: (enabled: boolean) => void;
}

export type SettingsTab =
  | 'integrations'
  | 'handoff'
  | 'personas'
  | 'productivity'
  | 'skills'
  | 'safety'
  | 'voice'
  | 'memory'
  | 'backup'
  | 'providers'
  | 'telephony';

export const UnifiedSettingsModal: React.FC<UnifiedSettingsModalProps> = ({
  isOpen,
  onClose,
  onOpenSkillStore,
  initialTab = 'integrations',
  onSyncState,
  immersiveCallMode,
  onToggleImmersiveCallMode,
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);

  // Immersive Phone-Call Mode state with localStorage persistence
  const [localImmersiveCallMode, setLocalImmersiveCallMode] = useState<boolean>(() => {
    if (typeof immersiveCallMode === 'boolean') return immersiveCallMode;
    try {
      return localStorage.getItem('mery_immersive_call_mode') === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (typeof immersiveCallMode === 'boolean') {
      setLocalImmersiveCallMode(immersiveCallMode);
    }
  }, [immersiveCallMode]);

  const handleToggleImmersiveMode = (nextVal: boolean) => {
    setLocalImmersiveCallMode(nextVal);
    try {
      localStorage.setItem('mery_immersive_call_mode', String(nextVal));
      window.dispatchEvent(
        new CustomEvent('mery-immersive-call-mode-change', { detail: { enabled: nextVal } })
      );
    } catch (e) {
      console.warn('[Settings] Failed to save immersive call mode:', e);
    }
    onToggleImmersiveCallMode?.(nextVal);
  };

  // Tab 1: Integrations state
  const [integrationSubTab, setIntegrationSubTab] = useState<'email' | 'whatsapp' | 'connectors'>('email');
  const [emailStatus, setEmailStatus] = useState<any>({ configured: false, user: '' });
  const [emailUser, setEmailUser] = useState('');
  const [emailPass, setEmailPass] = useState('');
  const [testEmailTo, setTestEmailTo] = useState('');
  const [testEmailSubject, setTestEmailSubject] = useState('Test from MERY AI Companion');
  const [testEmailBody, setTestEmailBody] = useState('Kem cho! This is a test email sent from Mery.');
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  // WhatsApp state
  const [whatsappStatus, setWhatsappStatus] = useState<any>({ connected: false });
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  const [pairingPhone, setPairingPhone] = useState('');
  const [whatsappTo, setWhatsappTo] = useState('');
  const [whatsappMsg, setWhatsappMsg] = useState('');
  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState(false);

  // Connectors state
  const [connectorStatus, setConnectorStatus] = useState<any>({});
  const [githubPat, setGithubPat] = useState('');
  const [notionKey, setNotionKey] = useState('');
  const [telegramToken, setTelegramToken] = useState('');
  const [telegramChatId, setTelegramChatId] = useState('');
  const [telegramTestText, setTelegramTestText] = useState('Mery Companion Telegram Notification Test');
  const [isSendingTelegram, setIsSendingTelegram] = useState(false);

  // Tab 2: Skills
  const [skills, setSkills] = useState<CompanionSkill[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [skillSearch, setSkillSearch] = useState('');

  // Tab 3: Safety & Access
  const [safetySettings, setSafetySettings] = useState<SafetySettings>(safetyManager.getSettings());
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [newContactName, setNewContactName] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [newContactEmail, setNewContactEmail] = useState('');
  const [newContactRelation, setNewContactRelation] = useState('Family');
  const [newContactEmergency, setNewContactEmergency] = useState(true);

  // Tab 4: Voice
  const [voiceSettings, setVoiceSettings] = useState<VoiceSettings>(providerManager.getVoiceSettings());
  const [currentLanguage, setCurrentLanguage] = useState<SpokenLanguage>(stateManager.getLanguage());

  // Tab 5: Memory
  const [memoriesCount, setMemoriesCount] = useState<number>(0);
  const [memoriesList, setMemoriesList] = useState<any[]>([]);
  const [memoryFilter, setMemoryFilter] = useState('');

  // Tab 6: Backup
  const [isExporting, setIsExporting] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreMessage, setRestoreMessage] = useState<string | null>(null);

  // Tab 7: Providers & Keys
  const [providers, setProviders] = useState<ProviderConfig[]>([]);
  const [editingKeys, setEditingKeys] = useState<Record<string, string>>({});
  const [revealedKeys, setRevealedKeys] = useState<Record<string, boolean>>({});
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, any>>({});
  const [logs, setLogs] = useState<StructuredLog[]>([]);

  // Load Initial Data
  useEffect(() => {
    if (!isOpen) return;

    // Load skills
    setSkills(skillManager.getAllSkills());
    const unsubSkills = skillManager.subscribe(() => {
      setSkills(skillManager.getAllSkills());
    });

    // Load safety
    setSafetySettings(safetyManager.getSettings());
    const unsubSafety = safetyManager.subscribe(() => {
      setSafetySettings(safetyManager.getSettings());
    });

    // Load integration statuses
    fetch('/api/email/status').then((r) => r.json()).then(setEmailStatus).catch(() => {});
    fetch('/api/whatsapp/status').then((r) => r.json()).then(setWhatsappStatus).catch(() => {});
    fetch('/api/connectors/status').then((r) => r.json()).then((data) => {
      setConnectorStatus(data);
      if (data.tokens) {
        setGithubPat(data.tokens.githubPat || '');
        setNotionKey(data.tokens.notionApiKey || '');
        setTelegramToken(data.tokens.telegramBotToken || '');
        setTelegramChatId(data.tokens.telegramChatId || '');
      }
    }).catch(() => {});

    // Load contacts
    fetch('/api/contacts').then((r) => r.json()).then((d) => setContacts(d.contacts || [])).catch(() => {});

    // Load memories
    fetch('/api/memory').then((r) => r.json()).then((d) => {
      setMemoriesList(d.memories || []);
      setMemoriesCount((d.memories || []).length);
    }).catch(() => {});

    // Load providers & logs
    setProviders(providerManager.getProviders());
    setLogs(logger.getLogs().slice(0, 30));

    return () => {
      unsubSkills();
      unsubSafety();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // -------------------------------------------------------------------
  // HANDLERS
  // -------------------------------------------------------------------

  const handleSaveEmailSettings = async () => {
    try {
      const res = await fetch('/api/email/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user: emailUser, pass: emailPass }),
      });
      const data = await res.json();
      if (data.success) {
        setEmailStatus(data.status);
        stateManager.notify('Email credentials updated!', 'success');
      }
    } catch (e: any) {
      stateManager.notify('Failed to save email settings: ' + e.message, 'error');
    }
  };

  const handleSendTestEmail = async () => {
    if (!testEmailTo) {
      stateManager.notify('Please specify recipient email', 'warning');
      return;
    }
    setIsSendingEmail(true);
    try {
      const res = await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: testEmailTo, subject: testEmailSubject, body: testEmailBody }),
      });
      const data = await res.json();
      if (data.success) {
        stateManager.notify('Test email sent successfully!', 'success');
      } else {
        stateManager.notify(data.message || 'Email delivery notice', 'warning');
      }
    } catch (e: any) {
      stateManager.notify('Email send failed: ' + e.message, 'error');
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleFetchWhatsAppQR = async () => {
    try {
      const res = await fetch('/api/whatsapp/qr');
      const data = await res.json();
      setQrCodeData(data.qr);
      stateManager.notify('Scan pairing QR code in WhatsApp Linked Devices', 'info');
    } catch (e: any) {
      stateManager.notify('Failed to generate WhatsApp QR', 'error');
    }
  };

  const handlePairWhatsAppPhone = async () => {
    if (!pairingPhone) return;
    try {
      const res = await fetch('/api/whatsapp/pair', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: pairingPhone }),
      });
      const data = await res.json();
      setWhatsappStatus(data.status);
      stateManager.notify(`WhatsApp linked to ${pairingPhone}!`, 'success');
    } catch (e: any) {
      stateManager.notify('WhatsApp pairing failed: ' + e.message, 'error');
    }
  };

  const handleSendWhatsAppTest = async () => {
    if (!whatsappTo || !whatsappMsg) return;
    setIsSendingWhatsApp(true);
    try {
      const res = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: whatsappTo, message: whatsappMsg }),
      });
      const data = await res.json();
      if (data.success) {
        stateManager.notify('WhatsApp message delivered!', 'success');
      } else {
        stateManager.notify(data.message || 'WhatsApp notice', 'warning');
      }
    } catch (e: any) {
      stateManager.notify('WhatsApp error: ' + e.message, 'error');
    } finally {
      setIsSendingWhatsApp(false);
    }
  };

  const handleSaveConnectorTokens = async () => {
    try {
      const res = await fetch('/api/connectors/tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ githubPat, notionApiKey: notionKey, telegramBotToken: telegramToken, telegramChatId }),
      });
      const data = await res.json();
      setConnectorStatus(data.status);
      stateManager.notify('Connector access tokens securely saved!', 'success');
    } catch (e: any) {
      stateManager.notify('Failed to save connector tokens: ' + e.message, 'error');
    }
  };

  const handleSendTelegramTest = async () => {
    if (!telegramTestText) return;
    setIsSendingTelegram(true);
    try {
      const res = await fetch('/api/connectors/telegram/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId: telegramChatId, text: telegramTestText }),
      });
      const data = await res.json();
      if (data.success) {
        stateManager.notify('Telegram test message dispatched!', 'success');
      } else {
        stateManager.notify(data.message || 'Telegram notice', 'warning');
      }
    } catch (e: any) {
      stateManager.notify('Telegram dispatch failed: ' + e.message, 'error');
    } finally {
      setIsSendingTelegram(false);
    }
  };

  const handleAddContact = async () => {
    if (!newContactName) return;
    try {
      const res = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newContactName,
          phone: newContactPhone,
          email: newContactEmail,
          relationship: newContactRelation,
          is_emergency_contact: newContactEmergency,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setContacts([...contacts, data.contact]);
        setNewContactName('');
        setNewContactPhone('');
        setNewContactEmail('');
        stateManager.notify('Contact registered successfully!', 'success');
      }
    } catch (e: any) {
      stateManager.notify('Failed to add contact', 'error');
    }
  };

  const handleDeleteContact = async (id: string) => {
    try {
      await fetch(`/api/contacts/${id}`, { method: 'DELETE' });
      setContacts(contacts.filter((c) => c.id !== id));
      stateManager.notify('Contact removed', 'info');
    } catch (e) {
      stateManager.notify('Failed to delete contact', 'error');
    }
  };

  const handleExportBackup = async () => {
    setIsExporting(true);
    try {
      const res = await fetch('/api/backup/export');
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mery_companion_backup_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      stateManager.notify('Encrypted backup exported cleanly! (API keys excluded for security)', 'success');
    } catch (e: any) {
      stateManager.notify('Backup export failed: ' + e.message, 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const handleRestoreFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsRestoring(true);
    try {
      const text = await file.text();
      const backupJson = JSON.parse(text);
      const res = await fetch('/api/backup/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(backupJson),
      });
      const result = await res.json();
      if (result.success) {
        setRestoreMessage(`Restored successfully: ${result.importedMemories} memories, ${result.importedSettings} settings.`);
        stateManager.notify('Backup restored successfully!', 'success');
      } else {
        setRestoreMessage('Restore notice: ' + (result.error || 'Check file format'));
      }
    } catch (err: any) {
      setRestoreMessage('Invalid backup file: ' + err.message);
      stateManager.notify('Restore error: ' + err.message, 'error');
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <div
      id="unified-settings-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="unified-settings-modal"
        className="flex flex-col w-full max-w-5xl h-[90vh] bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden text-neutral-200"
      >
        {/* MODAL HEADER */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-neutral-100 flex items-center gap-2">
                System & Companion Control Center
                <span className="px-2 py-0.5 text-xs font-normal rounded-full bg-neutral-800 text-neutral-400 border border-neutral-700">
                  Unified Settings
                </span>
              </h2>
              <p className="text-xs text-neutral-400">
                Configure integrations, install specialist skills, safety protocols, and voice orchestration.
              </p>
            </div>
          </div>
          <button
            id="btn-close-unified-settings"
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* MAIN BODY: 2-COLUMN NAVIGATION */}
        <div className="flex flex-1 overflow-hidden">
          {/* LEFT SIDEBAR NAVIGATION */}
          <div className="w-64 border-r border-neutral-800 bg-neutral-950/40 p-3 flex flex-col gap-1 overflow-y-auto">
            <button
              id="tab-btn-integrations"
              onClick={() => setActiveTab('integrations')}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors text-left ${
                activeTab === 'integrations'
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60'
              }`}
            >
              <Plug className="w-4 h-4 shrink-0" />
              <span>Integrations</span>
            </button>

            <button
              id="tab-btn-personas"
              onClick={() => setActiveTab('personas')}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors text-left ${
                activeTab === 'personas'
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60'
              }`}
            >
              <UserCheck className="w-4 h-4 shrink-0" />
              <span>Personas & Identity</span>
            </button>

            <button
              id="tab-btn-productivity"
              onClick={() => setActiveTab('productivity')}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors text-left ${
                activeTab === 'productivity'
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60'
              }`}
            >
              <BookOpen className="w-4 h-4 shrink-0" />
              <span>Productivity & Workspaces</span>
            </button>

            <button
              id="tab-btn-handoff"
              onClick={() => setActiveTab('handoff')}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors text-left ${
                activeTab === 'handoff'
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60'
              }`}
            >
              <Smartphone className="w-4 h-4 shrink-0" />
              <span>PC ⇄ Phone Handoff</span>
            </button>

            <button
              id="tab-btn-skills"
              onClick={() => setActiveTab('skills')}
              className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors text-left ${
                activeTab === 'skills'
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60'
              }`}
            >
              <div className="flex items-center gap-3">
                <Sparkles className="w-4 h-4 shrink-0" />
                <span>Skill Store</span>
              </div>
              <span className="px-1.5 py-0.2 text-[10px] rounded bg-purple-500/20 text-purple-300 font-mono">
                {skills.filter((s) => s.enabled).length} ON
              </span>
            </button>

            <button
              id="tab-btn-safety"
              onClick={() => setActiveTab('safety')}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors text-left ${
                activeTab === 'safety'
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60'
              }`}
            >
              <Shield className="w-4 h-4 shrink-0" />
              <span>Safety & Access</span>
            </button>

            <button
              id="tab-btn-telephony"
              onClick={() => setActiveTab('telephony')}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors text-left ${
                activeTab === 'telephony'
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60'
              }`}
            >
              <PhoneCall className="w-4 h-4 shrink-0" />
              <span>Incoming Calls</span>
            </button>

            <button
              id="tab-btn-voice"
              onClick={() => setActiveTab('voice')}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors text-left ${
                activeTab === 'voice'
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60'
              }`}
            >
              <Volume2 className="w-4 h-4 shrink-0" />
              <span>Voice & Speech</span>
            </button>

            <button
              id="tab-btn-memory"
              onClick={() => setActiveTab('memory')}
              className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors text-left ${
                activeTab === 'memory'
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60'
              }`}
            >
              <div className="flex items-center gap-3">
                <Database className="w-4 h-4 shrink-0" />
                <span>Memory Engine</span>
              </div>
              <span className="px-1.5 py-0.2 text-[10px] rounded bg-neutral-800 text-neutral-400 font-mono">
                {memoriesCount}
              </span>
            </button>

            <button
              id="tab-btn-backup"
              onClick={() => setActiveTab('backup')}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors text-left ${
                activeTab === 'backup'
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60'
              }`}
            >
              <Download className="w-4 h-4 shrink-0" />
              <span>Backup & Restore</span>
            </button>

            <button
              id="tab-btn-providers"
              onClick={() => setActiveTab('providers')}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors text-left ${
                activeTab === 'providers'
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60'
              }`}
            >
              <Key className="w-4 h-4 shrink-0" />
              <span>API Keys & Logs</span>
            </button>
          </div>

          {/* RIGHT CONTENT PANEL */}
          <div className="flex-1 p-6 overflow-y-auto bg-neutral-900/60">
            {/* ------------------------------------------------------------- */}
            {/* TAB: PERSONAS & IDENTITY */}
            {/* ------------------------------------------------------------- */}
            {activeTab === 'personas' && <PersonasSettingsPanel />}

            {/* ------------------------------------------------------------- */}
            {/* TAB: PRODUCTIVITY & WORKSPACES */}
            {/* ------------------------------------------------------------- */}
            {activeTab === 'productivity' && <ProductivitySettingsPanel />}

            {/* ------------------------------------------------------------- */}
            {/* TAB: PC ⇄ PHONE HANDOFF */}
            {/* ------------------------------------------------------------- */}
            {activeTab === 'handoff' && <HandoffSettingsPanel onSyncState={onSyncState} />}

            {/* ------------------------------------------------------------- */}
            {/* TAB 1: INTEGRATIONS */}
            {/* ------------------------------------------------------------- */}
            {activeTab === 'integrations' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-neutral-100">External Integrations</h3>
                    <p className="text-xs text-neutral-400">
                      Real external services configured modularly. Mery acts as your voice-driven executive dispatcher.
                    </p>
                  </div>
                  {/* Sub-tabs */}
                  <div className="flex items-center p-1 bg-neutral-950 border border-neutral-800 rounded-xl">
                    <button
                      onClick={() => setIntegrationSubTab('email')}
                      className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
                        integrationSubTab === 'email' ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:text-neutral-200'
                      }`}
                    >
                      <Mail className="w-3.5 h-3.5" /> Email
                    </button>
                    <button
                      onClick={() => setIntegrationSubTab('whatsapp')}
                      className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
                        integrationSubTab === 'whatsapp' ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:text-neutral-200'
                      }`}
                    >
                      <MessageSquare className="w-3.5 h-3.5" /> WhatsApp
                    </button>
                    <button
                      onClick={() => setIntegrationSubTab('connectors')}
                      className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
                        integrationSubTab === 'connectors' ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:text-neutral-200'
                      }`}
                    >
                      <Plug className="w-3.5 h-3.5" /> Connectors
                    </button>
                  </div>
                </div>

                {/* EMAIL SUBTAB */}
                {integrationSubTab === 'email' && (
                  <div className="space-y-4">
                    <div className="p-4 rounded-xl border border-neutral-800 bg-neutral-950/60 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-2.5 h-2.5 rounded-full ${emailStatus.configured ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                          <span className="text-sm font-semibold text-neutral-200">
                            {emailStatus.configured ? `Connected (${emailStatus.user})` : 'SMTP Not Configured'}
                          </span>
                        </div>
                        <span className="text-xs text-neutral-400">Gmail / Standard SMTP (TLS 587 / SSL 465)</span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-neutral-400 block mb-1">Email / Username</label>
                          <input
                            type="email"
                            placeholder="your.email@gmail.com"
                            value={emailUser}
                            onChange={(e) => setEmailUser(e.target.value)}
                            className="w-full px-3 py-2 text-sm bg-neutral-900 border border-neutral-800 rounded-lg text-neutral-200 focus:outline-none focus:border-purple-500"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-neutral-400 block mb-1">App Password (16-character)</label>
                          <input
                            type="password"
                            placeholder="••••••••••••••••"
                            value={emailPass}
                            onChange={(e) => setEmailPass(e.target.value)}
                            className="w-full px-3 py-2 text-sm bg-neutral-900 border border-neutral-800 rounded-lg text-neutral-200 focus:outline-none focus:border-purple-500"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end">
                        <button
                          onClick={handleSaveEmailSettings}
                          className="px-4 py-2 text-xs font-semibold rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 transition-colors"
                        >
                          Save SMTP Credentials
                        </button>
                      </div>
                    </div>

                    {/* Test Email Box */}
                    <div className="p-4 rounded-xl border border-neutral-800 bg-neutral-950/30 space-y-3">
                      <h4 className="text-xs font-semibold text-neutral-300 uppercase tracking-wider">Test Email Dispatch</h4>
                      <div className="space-y-2">
                        <input
                          type="email"
                          placeholder="Recipient address (e.g. test@example.com)"
                          value={testEmailTo}
                          onChange={(e) => setTestEmailTo(e.target.value)}
                          className="w-full px-3 py-2 text-sm bg-neutral-900 border border-neutral-800 rounded-lg text-neutral-200"
                        />
                        <input
                          type="text"
                          placeholder="Subject"
                          value={testEmailSubject}
                          onChange={(e) => setTestEmailSubject(e.target.value)}
                          className="w-full px-3 py-2 text-sm bg-neutral-900 border border-neutral-800 rounded-lg text-neutral-200"
                        />
                        <textarea
                          placeholder="Email body text"
                          rows={2}
                          value={testEmailBody}
                          onChange={(e) => setTestEmailBody(e.target.value)}
                          className="w-full px-3 py-2 text-sm bg-neutral-900 border border-neutral-800 rounded-lg text-neutral-200"
                        />
                      </div>
                      <button
                        onClick={handleSendTestEmail}
                        disabled={isSendingEmail}
                        className="px-4 py-2 text-xs font-semibold rounded-lg bg-purple-600 hover:bg-purple-500 text-white flex items-center gap-2 disabled:opacity-50"
                      >
                        <Send className="w-3.5 h-3.5" />
                        {isSendingEmail ? 'Sending...' : 'Send Test Email'}
                      </button>
                    </div>
                  </div>
                )}

                {/* WHATSAPP SUBTAB */}
                {integrationSubTab === 'whatsapp' && (
                  <div className="space-y-4">
                    <div className="p-4 rounded-xl border border-neutral-800 bg-neutral-950/60 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-2.5 h-2.5 rounded-full ${whatsappStatus.connected ? 'bg-emerald-400' : 'bg-neutral-600'}`} />
                          <span className="text-sm font-semibold text-neutral-200">
                            {whatsappStatus.connected ? `Linked: ${whatsappStatus.phoneNumber}` : 'WhatsApp Session Disconnected'}
                          </span>
                        </div>
                        <span className="text-xs text-neutral-400">Web Pairing Protocol</span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <p className="text-xs text-neutral-400">
                            Pair your WhatsApp account by phone number or QR code scan to enable Mery to send updates, summarize group threads, and auto-reply.
                          </p>
                          <div className="flex gap-2">
                            <input
                              type="tel"
                              placeholder="+91 98765 43210"
                              value={pairingPhone}
                              onChange={(e) => setPairingPhone(e.target.value)}
                              className="flex-1 px-3 py-2 text-sm bg-neutral-900 border border-neutral-800 rounded-lg text-neutral-200"
                            />
                            <button
                              onClick={handlePairWhatsAppPhone}
                              className="px-3 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg"
                            >
                              Pair
                            </button>
                          </div>
                          <button
                            onClick={handleFetchWhatsAppQR}
                            className="px-3 py-1.5 text-xs text-neutral-300 hover:text-white bg-neutral-800 rounded-lg flex items-center gap-1.5"
                          >
                            <Smartphone className="w-3.5 h-3.5" /> Show QR Code
                          </button>
                        </div>

                        {qrCodeData && (
                          <div className="flex flex-col items-center justify-center p-3 bg-white rounded-xl text-black">
                            <p className="text-[10px] font-mono mb-1 text-neutral-600">Scan via WhatsApp Linked Devices</p>
                            <div className="w-32 h-32 bg-neutral-100 flex items-center justify-center border border-neutral-300 rounded font-mono text-[10px] p-2 text-center break-all">
                              {qrCodeData.slice(0, 48)}...
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* WhatsApp Test Message */}
                    <div className="p-4 rounded-xl border border-neutral-800 bg-neutral-950/30 space-y-3">
                      <h4 className="text-xs font-semibold text-neutral-300 uppercase tracking-wider">Send WhatsApp Message via Mery</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          type="text"
                          placeholder="Contact Name or +91 98765..."
                          value={whatsappTo}
                          onChange={(e) => setWhatsappTo(e.target.value)}
                          className="px-3 py-2 text-sm bg-neutral-900 border border-neutral-800 rounded-lg text-neutral-200"
                        />
                        <input
                          type="text"
                          placeholder="Message content..."
                          value={whatsappMsg}
                          onChange={(e) => setWhatsappMsg(e.target.value)}
                          className="px-3 py-2 text-sm bg-neutral-900 border border-neutral-800 rounded-lg text-neutral-200"
                        />
                      </div>
                      <button
                        onClick={handleSendWhatsAppTest}
                        disabled={isSendingWhatsApp}
                        className="px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-2 disabled:opacity-50"
                      >
                        <Send className="w-3.5 h-3.5" />
                        {isSendingWhatsApp ? 'Sending...' : 'Send WhatsApp Message'}
                      </button>
                    </div>
                  </div>
                )}

                {/* CONNECTORS SUBTAB */}
                {integrationSubTab === 'connectors' && (
                  <div className="space-y-4">
                    <div className="p-4 rounded-xl border border-neutral-800 bg-neutral-950/60 space-y-4">
                      <h4 className="text-sm font-semibold text-neutral-200">Productivity Connectors</h4>

                      <div className="space-y-3">
                        <div>
                          <label className="text-xs text-neutral-400 block mb-1">GitHub Personal Access Token (PAT)</label>
                          <input
                            type="password"
                            placeholder="ghp_..."
                            value={githubPat}
                            onChange={(e) => setGithubPat(e.target.value)}
                            className="w-full px-3 py-2 text-sm bg-neutral-900 border border-neutral-800 rounded-lg text-neutral-200"
                          />
                        </div>

                        <div>
                          <label className="text-xs text-neutral-400 block mb-1">Notion Internal Integration Secret</label>
                          <input
                            type="password"
                            placeholder="ntn_..."
                            value={notionKey}
                            onChange={(e) => setNotionKey(e.target.value)}
                            className="w-full px-3 py-2 text-sm bg-neutral-900 border border-neutral-800 rounded-lg text-neutral-200"
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs text-neutral-400 block mb-1">Telegram Bot Token</label>
                            <input
                              type="password"
                              placeholder="123456:ABC-DEF..."
                              value={telegramToken}
                              onChange={(e) => setTelegramToken(e.target.value)}
                              className="w-full px-3 py-2 text-sm bg-neutral-900 border border-neutral-800 rounded-lg text-neutral-200"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-neutral-400 block mb-1">Telegram Default Chat ID</label>
                            <input
                              type="text"
                              placeholder="e.g. 987654321"
                              value={telegramChatId}
                              onChange={(e) => setTelegramChatId(e.target.value)}
                              className="w-full px-3 py-2 text-sm bg-neutral-900 border border-neutral-800 rounded-lg text-neutral-200"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-between items-center pt-2">
                        <span className="text-[11px] text-neutral-500 font-mono">
                          Webhook: POST /api/telegram/webhook
                        </span>
                        <button
                          onClick={handleSaveConnectorTokens}
                          className="px-4 py-2 text-xs font-semibold rounded-lg bg-purple-600 hover:bg-purple-500 text-white"
                        >
                          Save Connector Tokens
                        </button>
                      </div>
                    </div>

                    {/* Telegram Test */}
                    <div className="p-4 rounded-xl border border-neutral-800 bg-neutral-950/30 space-y-3">
                      <h4 className="text-xs font-semibold text-neutral-300 uppercase tracking-wider">Test Telegram Bot Notification</h4>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={telegramTestText}
                          onChange={(e) => setTelegramTestText(e.target.value)}
                          className="flex-1 px-3 py-2 text-sm bg-neutral-900 border border-neutral-800 rounded-lg text-neutral-200"
                        />
                        <button
                          onClick={handleSendTelegramTest}
                          disabled={isSendingTelegram}
                          className="px-4 py-2 text-xs font-semibold rounded-lg bg-sky-600 hover:bg-sky-500 text-white flex items-center gap-1.5"
                        >
                          <Send className="w-3.5 h-3.5" /> Test Dispatch
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* TAB 2: SKILL STORE */}
            {/* ------------------------------------------------------------- */}
            {activeTab === 'skills' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-neutral-100 flex items-center gap-2">
                      Companion Skill Store
                      <span className="px-2 py-0.5 text-xs rounded-full bg-purple-500/20 text-purple-300 font-mono">
                        Modular Extensions
                      </span>
                    </h3>
                    <p className="text-xs text-neutral-400">
                      Enable specialist behaviors to tailor Mery for YouTube creation, UI engineering, Git automation, and ethical hacking.
                    </p>
                  </div>

                  {/* Search and Category Filter */}
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-neutral-400" />
                      <input
                        type="text"
                        placeholder="Search skills..."
                        value={skillSearch}
                        onChange={(e) => setSkillSearch(e.target.value)}
                        className="pl-8 pr-3 py-1.5 text-xs bg-neutral-950 border border-neutral-800 rounded-lg text-neutral-200 focus:outline-none focus:border-purple-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Category Pills */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {['all', 'creator', 'coding', 'security', 'productivity'].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3 py-1 text-xs rounded-full font-medium transition-colors uppercase tracking-wider ${
                        selectedCategory === cat
                          ? 'bg-purple-600 text-white'
                          : 'bg-neutral-950 text-neutral-400 hover:text-neutral-200 border border-neutral-800'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {/* Skills Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {skills
                    .filter((s) => selectedCategory === 'all' || s.category === selectedCategory)
                    .filter((s) => s.name.toLowerCase().includes(skillSearch.toLowerCase()) || s.description.toLowerCase().includes(skillSearch.toLowerCase()))
                    .map((skill) => (
                      <div
                        key={skill.id}
                        className={`p-4 rounded-xl border transition-all ${
                          skill.enabled
                            ? 'bg-neutral-950/80 border-purple-500/40 shadow-sm'
                            : 'bg-neutral-950/40 border-neutral-800/80 opacity-75'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-semibold text-neutral-100">{skill.name}</h4>
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-neutral-800 text-neutral-400 font-mono">
                                v{skill.version}
                              </span>
                            </div>
                            <span className="text-[11px] text-purple-400 font-medium">{skill.author}</span>
                          </div>

                          {/* Toggle Switch */}
                          <button
                            onClick={() => skillManager.toggleSkill(skill.id)}
                            className={`w-11 h-6 rounded-full p-1 transition-colors relative ${
                              skill.enabled ? 'bg-purple-600' : 'bg-neutral-800'
                            }`}
                          >
                            <div
                              className={`w-4 h-4 rounded-full bg-white transition-transform ${
                                skill.enabled ? 'translate-x-5' : 'translate-x-0'
                              }`}
                            />
                          </button>
                        </div>

                        <p className="text-xs text-neutral-400 leading-relaxed mb-3">{skill.description}</p>

                        <div className="flex items-center justify-between pt-2 border-t border-neutral-800/60 text-[11px]">
                          <div className="flex gap-1 flex-wrap">
                            {skill.tags.slice(0, 3).map((t) => (
                              <span key={t} className="px-1.5 py-0.5 rounded bg-neutral-900 text-neutral-400 border border-neutral-800">
                                #{t}
                              </span>
                            ))}
                          </div>
                          <span className="text-neutral-500 font-mono">
                            {skill.unlockedTools.length} tools unlocked
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* TAB 3: SAFETY & ACCESS */}
            {/* ------------------------------------------------------------- */}
            {activeTab === 'safety' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-neutral-100">Safety, Biometrics & Emergency Access</h3>
                  <p className="text-xs text-neutral-400">
                    Voice Guardian biometric clearance, SOS trigger dispatch, and physical tamper protection.
                  </p>
                </div>

                {/* 1. Voice Guardian */}
                <div className="p-4 rounded-xl border border-neutral-800 bg-neutral-950/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <UserCheck className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-neutral-200">Voice Guardian (Biometric Clearance)</h4>
                        <p className="text-xs text-neutral-400">
                          Requires enrolled voice verification before executing sensitive tools (wipe, emails, posts).
                        </p>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={safetySettings.voiceGuardianEnabled}
                      onChange={(e) => safetyManager.updateSettings({ voiceGuardianEnabled: e.target.checked })}
                      className="w-4 h-4 accent-purple-600 rounded"
                    />
                  </div>

                  <div className="pt-2">
                    <label className="text-xs text-neutral-400 block mb-1">Enrolled Passphrase Verification</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={safetySettings.voiceGuardianPassphrase}
                        onChange={(e) => safetyManager.updateSettings({ voiceGuardianPassphrase: e.target.value })}
                        className="flex-1 px-3 py-1.5 text-xs bg-neutral-900 border border-neutral-800 rounded-lg text-neutral-200"
                      />
                      <button
                        onClick={() => safetyManager.enrollVoiceGuardian(safetySettings.voiceGuardianPassphrase)}
                        className="px-3 py-1.5 text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg"
                      >
                        Re-enroll Voice
                      </button>
                    </div>
                  </div>
                </div>

                {/* 2. Emergency SOS */}
                <div className="p-4 rounded-xl border border-neutral-800 bg-neutral-950/60 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">
                        <ShieldAlert className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-neutral-200">Emergency SOS System</h4>
                        <p className="text-xs text-neutral-400">
                          Detects distress keywords (&quot;save me&quot;, &quot;help me&quot;, &quot;બચાવો&quot;, &quot;મદદ કરો&quot;) and dispatches high-priority alerts.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => safetyManager.triggerEmergencySOS('Manual SOS Test Triggered by User')}
                        className="px-3 py-1 text-xs font-semibold bg-rose-600/80 hover:bg-rose-500 text-white rounded-lg"
                      >
                        Test SOS
                      </button>
                      <input
                        type="checkbox"
                        checked={safetySettings.emergencySosEnabled}
                        onChange={(e) => safetyManager.updateSettings({ emergencySosEnabled: e.target.checked })}
                        className="w-4 h-4 accent-purple-600 rounded"
                      />
                    </div>
                  </div>

                  {/* Registered Emergency Contacts */}
                  <div className="space-y-3 pt-2">
                    <h5 className="text-xs font-semibold text-neutral-300 uppercase tracking-wider">Emergency Contacts</h5>
                    <div className="space-y-2">
                      {contacts.map((c) => (
                        <div key={c.id} className="flex items-center justify-between p-2.5 rounded-lg bg-neutral-900 border border-neutral-800">
                          <div>
                            <span className="text-xs font-semibold text-neutral-200">{c.name}</span>
                            <span className="text-[10px] text-neutral-400 ml-2">({c.relationship})</span>
                            <div className="text-[11px] text-neutral-400">{c.phone || c.email}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            {c.isEmergencyContact && (
                              <span className="text-[10px] px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-mono">
                                SOS PRIORITY
                              </span>
                            )}
                            <button
                              onClick={() => handleDeleteContact(c.id)}
                              className="p-1.5 text-neutral-500 hover:text-rose-400"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Add Contact Form */}
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 pt-2">
                      <input
                        type="text"
                        placeholder="Contact Name"
                        value={newContactName}
                        onChange={(e) => setNewContactName(e.target.value)}
                        className="px-2.5 py-1.5 text-xs bg-neutral-900 border border-neutral-800 rounded-lg text-neutral-200"
                      />
                      <input
                        type="tel"
                        placeholder="Phone Number"
                        value={newContactPhone}
                        onChange={(e) => setNewContactPhone(e.target.value)}
                        className="px-2.5 py-1.5 text-xs bg-neutral-900 border border-neutral-800 rounded-lg text-neutral-200"
                      />
                      <input
                        type="email"
                        placeholder="Email Address"
                        value={newContactEmail}
                        onChange={(e) => setNewContactEmail(e.target.value)}
                        className="px-2.5 py-1.5 text-xs bg-neutral-900 border border-neutral-800 rounded-lg text-neutral-200"
                      />
                      <button
                        onClick={handleAddContact}
                        className="px-3 py-1.5 text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg flex items-center justify-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add Contact
                      </button>
                    </div>
                  </div>
                </div>

                {/* 3. Touch Guard & Motion Sensors */}
                <div className="p-4 rounded-xl border border-neutral-800 bg-neutral-950/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        <Radio className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-neutral-200">Touch Guard (Physical Tamper Defense)</h4>
                        <p className="text-xs text-neutral-400">
                          Detects physical movement or pick-up via accelerometer sensors while armed.
                        </p>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={safetySettings.touchGuardEnabled}
                      onChange={(e) => safetyManager.updateSettings({ touchGuardEnabled: e.target.checked })}
                      className="w-4 h-4 accent-purple-600 rounded"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <span className="text-xs text-neutral-400">Sensor Sensitivity:</span>
                    <div className="flex gap-1.5">
                      {(['low', 'medium', 'high'] as const).map((s) => (
                        <button
                          key={s}
                          onClick={() => safetyManager.updateSettings({ touchGuardSensitivity: s })}
                          className={`px-3 py-1 text-xs rounded-lg uppercase tracking-wider font-mono ${
                            safetySettings.touchGuardSensitivity === s
                              ? 'bg-amber-600 text-white'
                              : 'bg-neutral-900 text-neutral-400 border border-neutral-800'
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* TAB 4: TELEPHONY & CALLS */}
            {/* ------------------------------------------------------------- */}
            {activeTab === 'telephony' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-neutral-100 flex items-center gap-2">
                    Incoming Call Handling & Voice Call Experience
                    <span className="px-2 py-0.5 text-xs rounded-full bg-blue-500/20 text-blue-300 font-mono">
                      Capacitor Native / Voice Dispatch
                    </span>
                  </h3>
                  <p className="text-xs text-neutral-400">
                    Mery announces incoming calls vocally and provides a full-duplex, immersive phone-call companion experience.
                  </p>
                </div>

                {/* Immersive Phone-Call Mode Toggle Card */}
                <div className="p-4 rounded-xl border border-sky-500/30 bg-gradient-to-r from-sky-950/40 via-blue-950/25 to-neutral-950/60 space-y-3">
                  <div className="flex items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <PhoneCall className="w-4 h-4 text-sky-400" />
                        <h4 className="text-sm font-semibold text-neutral-100">
                          Immersive Phone-Call Mode
                        </h4>
                        <span className="px-2 py-0.5 text-[10px] font-mono rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30">
                          HOLOGRAM ORB ONLY
                        </span>
                      </div>
                      <p className="text-xs text-neutral-300 leading-relaxed max-w-xl">
                        When enabled, completely hides the chat bar and visual UI elements, leaving only the hologram orb for a fully immersive, &apos;phone-call&apos; style AI experience.
                      </p>
                    </div>

                    <button
                      type="button"
                      role="switch"
                      aria-checked={localImmersiveCallMode}
                      onClick={() => handleToggleImmersiveMode(!localImmersiveCallMode)}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        localImmersiveCallMode ? 'bg-sky-500' : 'bg-neutral-800'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          localImmersiveCallMode ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-sky-500/15 text-[11px]">
                    <span className="text-neutral-400">
                      Display Experience:
                    </span>
                    <span className={`font-medium ${localImmersiveCallMode ? 'text-sky-400 font-semibold' : 'text-neutral-400'}`}>
                      {localImmersiveCallMode
                        ? '✨ Immersive Phone-Call Mode Active (Hologram Orb Only)'
                        : 'Standard UI (Full Dashboard & Inline Chat Input)'}
                    </span>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-neutral-800 bg-neutral-950/60 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-semibold text-neutral-200">Runtime Telephony Bridge</h4>
                      <p className="text-xs text-neutral-400">
                        {telephonyBridge.getIsNativeSupported()
                          ? 'Native Android / Capacitor Telephony Plugin Active'
                          : 'Web Sandbox Mode (Use simulator below to test voice announcements)'}
                      </p>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-xs font-mono bg-neutral-800 text-neutral-300 border border-neutral-700">
                      {telephonyBridge.getIsNativeSupported() ? 'NATIVE OK' : 'BROWSER PREVIEW'}
                    </span>
                  </div>

                  <div className="p-3 bg-neutral-900 border border-neutral-800 rounded-xl space-y-2">
                    <p className="text-xs text-neutral-300 font-medium">Test Call Simulator</p>
                    <p className="text-xs text-neutral-400">
                      Simulate an incoming phone call to test Mery&apos;s vocal notification and voice commands (&quot;Accept&quot; / &quot;Reject&quot; or &quot;ઉપાડ&quot; / &quot;કાપી નાખ&quot;).
                    </p>
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => telephonyBridge.simulateIncomingCall('Priya Sharma', '+91 98251 98765')}
                        className="px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-lg flex items-center gap-2"
                      >
                        <PhoneCall className="w-3.5 h-3.5" /> Simulate Incoming Call
                      </button>
                    </div>
                  </div>
                </div>

                {/* Call History */}
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold text-neutral-300 uppercase tracking-wider">Recent Call Activity</h4>
                  <div className="space-y-2">
                    {telephonyBridge.getCallLog().length === 0 ? (
                      <p className="text-xs text-neutral-500 italic p-3 bg-neutral-950 rounded-lg">No incoming calls recorded in this session.</p>
                    ) : (
                      telephonyBridge.getCallLog().map((call, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-neutral-950 border border-neutral-800 rounded-lg">
                          <div>
                            <div className="text-xs font-semibold text-neutral-200">{call.callerName}</div>
                            <div className="text-[11px] text-neutral-400">{call.phoneNumber} • {call.timestamp}</div>
                          </div>
                          <span className={`text-[10px] px-2 py-0.5 rounded font-mono uppercase ${
                            call.status === 'accepted' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-neutral-800 text-neutral-400'
                          }`}>
                            {call.status}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* TAB 5: VOICE & SPEECH */}
            {/* ------------------------------------------------------------- */}
            {activeTab === 'voice' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-neutral-100">Voice Synthesis & Speech Intelligence</h3>
                  <p className="text-xs text-neutral-400">
                    Configure pitch, rate, wake-word detection, language alignment, and immersive voice call mode.
                  </p>
                </div>

                {/* Immersive Phone-Call Mode Toggle Card */}
                <div className="p-4 rounded-xl border border-sky-500/30 bg-gradient-to-r from-sky-950/40 via-blue-950/25 to-neutral-950/60 space-y-3">
                  <div className="flex items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <PhoneCall className="w-4 h-4 text-sky-400" />
                        <h4 className="text-sm font-semibold text-neutral-100">
                          Immersive Phone-Call Mode
                        </h4>
                        <span className="px-2 py-0.5 text-[10px] font-mono rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30">
                          HOLOGRAM ORB ONLY
                        </span>
                      </div>
                      <p className="text-xs text-neutral-300 leading-relaxed max-w-xl">
                        Completely hides the chat bar, dashboard widgets, telemetry docks, and visual UI elements, leaving only the glowing hologram orb for a fully immersive, voice-native &apos;phone-call&apos; AI experience.
                      </p>
                    </div>

                    <button
                      type="button"
                      role="switch"
                      aria-checked={localImmersiveCallMode}
                      onClick={() => handleToggleImmersiveMode(!localImmersiveCallMode)}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        localImmersiveCallMode ? 'bg-sky-500' : 'bg-neutral-800'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          localImmersiveCallMode ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-sky-500/15 text-[11px]">
                    <span className="text-neutral-400">
                      Display Experience:
                    </span>
                    <span className={`font-medium ${localImmersiveCallMode ? 'text-sky-400 font-semibold' : 'text-neutral-400'}`}>
                      {localImmersiveCallMode
                        ? '✨ Immersive Phone-Call Mode Active (Hologram Orb Only)'
                        : 'Standard UI (Full Dashboard & Inline Chat Input)'}
                    </span>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-neutral-800 bg-neutral-950/60 space-y-4">
                  <div>
                    <label className="text-xs text-neutral-400 block mb-1">Spoken Language Mode</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'gu-IN', label: 'ગુજરાતી (Standard Gujarati)' },
                        { id: 'hi-IN', label: 'हिंदी (Hindi)' },
                        { id: 'en-US', label: 'English (US)' },
                      ].map((lang) => (
                        <button
                          key={lang.id}
                          onClick={() => {
                            setCurrentLanguage(lang.id as any);
                            stateManager.setLanguage(lang.id as any);
                          }}
                          className={`p-2.5 rounded-xl border text-xs font-medium text-center transition-colors ${
                            currentLanguage === lang.id
                              ? 'bg-purple-600 border-purple-500 text-white'
                              : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                          }`}
                        >
                          {lang.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <div>
                      <div className="flex justify-between text-xs text-neutral-400 mb-1">
                        <span>Speech Rate</span>
                        <span className="font-mono">{voiceSettings.speed}x</span>
                      </div>
                      <input
                        type="range"
                        min="0.75"
                        max="1.5"
                        step="0.05"
                        value={voiceSettings.speed}
                        onChange={(e) => {
                          const speed = parseFloat(e.target.value);
                          setVoiceSettings({ ...voiceSettings, speed });
                          providerManager.updateVoiceSettings({ speed });
                        }}
                        className="w-full accent-purple-600"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-xs text-neutral-400 mb-1">
                        <span>Pitch Modulation</span>
                        <span className="font-mono">{voiceSettings.pitch}</span>
                      </div>
                      <input
                        type="range"
                        min="0.8"
                        max="1.3"
                        step="0.05"
                        value={voiceSettings.pitch}
                        onChange={(e) => {
                          const pitch = parseFloat(e.target.value);
                          setVoiceSettings({ ...voiceSettings, pitch });
                          providerManager.updateVoiceSettings({ pitch });
                        }}
                        className="w-full accent-purple-600"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      onClick={() => {
                        const testPhrase =
                          currentLanguage === 'gu-IN'
                            ? 'નમસ્તે! હું મેરી છું, તમારી પર્સનલ સાથી.'
                            : "Hello! I am Mery, your voice companion.";
                        voiceService.speakBrowserVoice(
                          testPhrase,
                          () => {},
                          () => {},
                          { pitch: voiceSettings.pitch, rate: voiceSettings.speed }
                        );
                      }}
                      className="px-4 py-2 text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white rounded-lg flex items-center gap-2"
                    >
                      <Volume2 className="w-3.5 h-3.5" /> Test Voice Output
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* TAB 6: MEMORY ENGINE */}
            {/* ------------------------------------------------------------- */}
            {activeTab === 'memory' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-neutral-100">Persistent SQLite Memory</h3>
                    <p className="text-xs text-neutral-400">
                      Zero data-loss storage preserving your profile, goals, preferences, and conversations.
                    </p>
                  </div>
                  <div className="text-xs text-neutral-400 font-mono">
                    Total Facts: <span className="text-purple-400 font-semibold">{memoriesCount}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-neutral-400" />
                    <input
                      type="text"
                      placeholder="Filter stored memory facts..."
                      value={memoryFilter}
                      onChange={(e) => setMemoryFilter(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 text-xs bg-neutral-950 border border-neutral-800 rounded-lg text-neutral-200"
                    />
                  </div>
                </div>

                <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                  {memoriesList
                    .filter((m) =>
                      m.key?.toLowerCase().includes(memoryFilter.toLowerCase()) ||
                      m.value?.toLowerCase().includes(memoryFilter.toLowerCase())
                    )
                    .map((m, idx) => (
                      <div key={idx} className="p-3 bg-neutral-950 border border-neutral-800 rounded-xl space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-purple-300 font-mono">{m.key}</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-neutral-800 text-neutral-400 font-mono">
                            {m.category || 'general'}
                          </span>
                        </div>
                        <p className="text-xs text-neutral-300">{m.value}</p>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* TAB 7: BACKUP & RESTORE */}
            {/* ------------------------------------------------------------- */}
            {activeTab === 'backup' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-neutral-100">Zero-Loss Backup & Restore</h3>
                  <p className="text-xs text-neutral-400">
                    Export your complete companion memory, settings, contacts, and logs as a portable JSON archive.
                    (Sensitive API keys are excluded for security).
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Export */}
                  <div className="p-5 rounded-xl border border-neutral-800 bg-neutral-950/60 space-y-4 flex flex-col justify-between">
                    <div>
                      <div className="p-2 w-fit rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-3">
                        <Download className="w-5 h-5" />
                      </div>
                      <h4 className="text-sm font-semibold text-neutral-200 mb-1">Export Data Archive</h4>
                      <p className="text-xs text-neutral-400">
                        Downloads an export file containing all memories, SQLite facts, contacts, and preferences.
                      </p>
                    </div>

                    <button
                      onClick={handleExportBackup}
                      disabled={isExporting}
                      className="w-full py-2.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <Download className="w-3.5 h-3.5" />
                      {isExporting ? 'Exporting...' : 'Export Backup JSON'}
                    </button>
                  </div>

                  {/* Restore */}
                  <div className="p-5 rounded-xl border border-neutral-800 bg-neutral-950/60 space-y-4 flex flex-col justify-between">
                    <div>
                      <div className="p-2 w-fit rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 mb-3">
                        <Upload className="w-5 h-5" />
                      </div>
                      <h4 className="text-sm font-semibold text-neutral-200 mb-1">Restore from Backup</h4>
                      <p className="text-xs text-neutral-400">
                        Upload an existing JSON archive to import and restore facts and preferences into MERY.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <label className="w-full py-2.5 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-lg flex items-center justify-center gap-2 cursor-pointer">
                        <Upload className="w-3.5 h-3.5" />
                        {isRestoring ? 'Restoring...' : 'Select Backup File'}
                        <input
                          type="file"
                          accept=".json,application/json"
                          onChange={handleRestoreFile}
                          className="hidden"
                        />
                      </label>
                      {restoreMessage && (
                        <p className="text-[11px] text-neutral-300 font-mono text-center">{restoreMessage}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* TAB 8: API KEYS & LOGS */}
            {/* ------------------------------------------------------------- */}
            {activeTab === 'providers' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-neutral-100">API Providers & Diagnostics</h3>
                  <p className="text-xs text-neutral-400">
                    Verify connection health, latency, and keys for Gemini, Web Search, and Audio engines.
                  </p>
                </div>

                <div className="space-y-3">
                  {providers.map((p) => {
                    const isConfigured = p.status === 'connected' || Boolean(p.apiKey);
                    return (
                      <div key={p.id} className="p-3 bg-neutral-950 border border-neutral-800 rounded-xl space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-neutral-200">{p.name}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded bg-neutral-900 text-neutral-400 font-mono">
                              {p.category}
                            </span>
                          </div>
                          <span className={`text-[11px] font-mono ${isConfigured ? 'text-emerald-400' : 'text-neutral-500'}`}>
                            {isConfigured ? 'Configured' : 'Not Set'}
                          </span>
                        </div>
                        <p className="text-xs text-neutral-400">{p.freeTierAvailable || p.name}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
