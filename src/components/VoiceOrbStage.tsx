import React, { useEffect, useState, useRef } from 'react';
import {
  Sparkles,
  Zap,
  Mic,
  MicOff,
  Send,
  SlidersHorizontal,
  Database,
  Smile,
  Settings,
  User,
  Volume2,
  VolumeX,
  Camera,
  Globe,
  Search,
  Clock,
  Shield,
  Monitor,
  PhoneCall,
  PhoneOff,
  Minimize2,
  Radio,
} from 'lucide-react';
import { EmojiPickerPopover } from './EmojiPickerPopover';
import { AvatarControlsModal } from './AvatarControlsModal';
import { ToolsSheet } from './ToolsSheet';
import { AssistantState, ConversationState, ToolExecutionRecord, AIStatus, ChatMessage, EmotionType } from '../types';
import { stateManager, SpokenLanguage } from '../modules/StateManager';
import { liveSession } from '../modules/LiveSession';
import { screenShareService } from '../modules/ScreenShareService';
import { cameraService } from '../modules/CameraService';
import { voiceService } from '../utils/audio';
import { CameraFramingMode } from './AnimeAvatar3D';
import { motion, AnimatePresence } from 'motion/react';
import { getEmotionMeta, emotionEngine } from '../utils/emotionEngine';
import { HomeDashboardWidgets } from './HomeDashboardWidgets';
import { AuroraHologram } from './AuroraHologram';

interface VoiceOrbStageProps {
  onOpenSettings: () => void;
  onOpenTools: () => void;
  onOpenTranscript?: () => void;
  onOpenAgentDev?: () => void;
  onOpenSkillStore?: () => void;
  onStartVoiceSession?: () => Promise<void> | void;
  onStopVoiceSession?: () => void;
  onInterruptSpeech?: () => void;
  isVoiceActive?: boolean;
  onOpenMemory?: () => void;
  onOpenSystemControl?: () => void;
  onOpenActivity?: () => void;
  onOpenEmotion?: () => void;
  onOpenJournal?: () => void;
  onOpenDocuments?: () => void;
  onOpenWhiteboard?: () => void;
  onOpenStudySettings?: () => void;
  voiceEnabled?: boolean;
  onToggleVoice?: () => void;
  wakeWordEnabled?: boolean;
  onToggleWakeWord?: () => void;
  onSendMessage?: (text: string) => void;
  isThinking?: boolean;
  messageCount?: number;
  children?: React.ReactNode;
  showChatText?: boolean;
  onToggleChatText?: () => void;
  messages?: ChatMessage[];
  onPlayVoice?: (msg: ChatMessage) => void;
  playingMessageId?: string | null;
  currentEmotion?: EmotionType;
  immersiveCallMode?: boolean;
  onToggleImmersiveCallMode?: (enabled: boolean) => void;
}

export const VoiceOrbStage: React.FC<VoiceOrbStageProps> = ({
  onOpenSettings,
  onOpenTools,
  onOpenTranscript,
  onOpenAgentDev,
  onOpenSkillStore,
  onStartVoiceSession,
  onStopVoiceSession,
  onInterruptSpeech,
  isVoiceActive = false,
  onOpenMemory,
  onOpenSystemControl,
  onOpenActivity,
  onOpenEmotion,
  onOpenJournal,
  onOpenDocuments,
  onOpenWhiteboard,
  onOpenStudySettings,
  voiceEnabled = true,
  onToggleVoice,
  wakeWordEnabled = false,
  onToggleWakeWord,
  onSendMessage,
  isThinking = false,
  messageCount = 0,
  children,
  showChatText,
  onToggleChatText,
  messages = [],
  currentEmotion: propCurrentEmotion,
  immersiveCallMode: propImmersiveCallMode,
  onToggleImmersiveCallMode,
}) => {
  const [state, setState] = useState<AssistantState>(stateManager.getState());
  const [, setConvState] = useState<ConversationState>(stateManager.getConversationState());
  const [isMuted, setIsMuted] = useState<boolean>(stateManager.getIsMuted());
  const [activeTool, setActiveTool] = useState<ToolExecutionRecord | null>(stateManager.getActiveTool());
  const [language, setLanguage] = useState<SpokenLanguage>(stateManager.getLanguage());
  const [latestTranscript, setLatestTranscript] = useState<{ text: string; role: 'model' | 'user' } | null>(null);
  const [isSharingScreen, setIsSharingScreen] = useState<boolean>(screenShareService.isSharing());
  const [inlineChatText, setInlineChatText] = useState('');
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const inlineChatInputRef = useRef<HTMLInputElement | null>(null);
  const emojiTriggerRef = useRef<HTMLButtonElement | null>(null);
  const [aiStatus, setAiStatus] = useState<AIStatus>(stateManager.getAIStatus());

  // Camera state & PIP viewfinder
  const [isCameraActive, setIsCameraActive] = useState<boolean>(cameraService.isCameraActive());
  const [cameraFitMode, setCameraFitMode] = useState<'contain' | 'cover'>('contain');
  const [isCameraExpanded, setIsCameraExpanded] = useState<boolean>(false);
  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);

  // Avatar & Tools Modals state
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState<boolean>(false);
  const [isToolsSheetOpen, setIsToolsSheetOpen] = useState<boolean>(false);
  const [avatarFraming, setAvatarFraming] = useState<CameraFramingMode>('portrait');
  const [usingCustomVRM, setUsingCustomVRM] = useState<boolean>(false);
  const [customVRMTitle, setCustomVRMTitle] = useState<string>('');
  const [currentEmotion, setCurrentEmotion] = useState<EmotionType>(() => {
    return propCurrentEmotion || emotionEngine.getState().dominant || 'warm';
  });

  // Immersive Phone-Call Mode state (with prop sync and localStorage)
  const [immersiveCallMode, setImmersiveCallMode] = useState<boolean>(() => {
    if (typeof propImmersiveCallMode === 'boolean') return propImmersiveCallMode;
    try {
      return localStorage.getItem('mery_immersive_call_mode') === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (typeof propImmersiveCallMode === 'boolean') {
      setImmersiveCallMode(propImmersiveCallMode);
    }
  }, [propImmersiveCallMode]);

  useEffect(() => {
    const handleImmersiveModeChange = (e: any) => {
      if (typeof e.detail?.enabled === 'boolean') {
        setImmersiveCallMode(e.detail.enabled);
      }
    };
    window.addEventListener('mery-immersive-call-mode-change', handleImmersiveModeChange);
    return () => window.removeEventListener('mery-immersive-call-mode-change', handleImmersiveModeChange);
  }, []);

  // Call duration counter for phone-call HUD
  const [callDurationSeconds, setCallDurationSeconds] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (immersiveCallMode && (isVoiceActive || state === 'listening' || state === 'speaking' || isThinking)) {
      interval = setInterval(() => {
        setCallDurationSeconds((prev) => prev + 1);
      }, 1000);
    } else if (!immersiveCallMode) {
      setCallDurationSeconds(0);
    }
    return () => clearInterval(interval);
  }, [immersiveCallMode, isVoiceActive, state, isThinking]);

  const formatCallDuration = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleExitImmersiveMode = () => {
    setImmersiveCallMode(false);
    try {
      localStorage.setItem('mery_immersive_call_mode', 'false');
      window.dispatchEvent(
        new CustomEvent('mery-immersive-call-mode-change', { detail: { enabled: false } })
      );
    } catch {}
    onToggleImmersiveCallMode?.(false);
  };

  const handleToggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    stateManager.setMuted(nextMuted);
    if (nextMuted) {
      voiceService.stopAudio();
    }
  };

  // 'Current State' Badge emotion tooltip state & handlers
  const [isStateTooltipOpen, setIsStateTooltipOpen] = useState<boolean>(false);
  const tooltipTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnterStateBadge = () => {
    if (tooltipTimeoutRef.current) clearTimeout(tooltipTimeoutRef.current);
    setIsStateTooltipOpen(true);
  };

  const handleMouseLeaveStateBadge = () => {
    tooltipTimeoutRef.current = setTimeout(() => {
      setIsStateTooltipOpen(false);
    }, 120);
  };

  // Sync emotion with props and emotionEngine
  useEffect(() => {
    if (propCurrentEmotion) {
      setCurrentEmotion(propCurrentEmotion);
    }
  }, [propCurrentEmotion]);

  useEffect(() => {
    const unsubEmotion = emotionEngine.subscribe((st) => {
      if (st.dominant) {
        setCurrentEmotion(st.dominant);
      }
    });
    return unsubEmotion;
  }, []);

  // Dismiss tooltip on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('#current-state-badge')) {
        setIsStateTooltipOpen(false);
      }
    };
    if (isStateTooltipOpen) {
      window.addEventListener('click', handleOutsideClick);
    }
    return () => {
      window.removeEventListener('click', handleOutsideClick);
    };
  }, [isStateTooltipOpen]);

  const currentEmotionMeta = getEmotionMeta(currentEmotion);

  // Internal chat timeline visibility
  const [internalShowChatText, setInternalShowChatText] = useState<boolean>(() => {
    try {
      return localStorage.getItem('mery_show_chat_text') === 'true';
    } catch {
      return false;
    }
  });
  const isChatVisible = showChatText !== undefined ? showChatText : internalShowChatText;

  // Subscriptions to live engine
  useEffect(() => {
    const unsubState = stateManager.onStateChange((newState) => {
      setState(newState);
      if (newState === 'disconnected') {
        setLatestTranscript(null);
      }
    });

    const unsubConv = stateManager.onConversationStateChange((newConvState) => {
      setConvState(newConvState);
    });

    const unsubTool = stateManager.onToolUpdate((tool) => {
      setActiveTool(tool);
    });

    const unsubLang = stateManager.onLanguageChange((newLang) => {
      setLanguage(newLang);
    });

    const unsubTranscript = liveSession.onTranscript((text, role) => {
      setLatestTranscript({ text, role });
    });

    const unsubScreen = screenShareService.subscribe(() => {
      setIsSharingScreen(screenShareService.isSharing());
    });

    const unsubAIStatus = stateManager.onAIStatusChange((newStatus) => {
      setAiStatus(newStatus);
    });

    const unsubCamera = cameraService.subscribe(() => {
      const active = cameraService.isCameraActive();
      setIsCameraActive(active);
      if (active && videoPreviewRef.current) {
        const stream = cameraService.getStream();
        if (stream && videoPreviewRef.current.srcObject !== stream) {
          videoPreviewRef.current.srcObject = stream;
        }
      }
    });

    // Listen for avatar state broadcasts from AnimeAvatar3D
    const handleAvatarStatusChange = (e: any) => {
      if (e?.detail) {
        if (e.detail.cameraFraming) setAvatarFraming(e.detail.cameraFraming);
        if (e.detail.usingCustomVRM !== undefined) setUsingCustomVRM(e.detail.usingCustomVRM);
        if (e.detail.customVRMTitle) setCustomVRMTitle(e.detail.customVRMTitle);
      }
    };

    const handleOpenAvatarControls = () => {
      setIsAvatarModalOpen(true);
    };

    window.addEventListener('avatar-status-change', handleAvatarStatusChange);
    window.addEventListener('open-avatar-controls', handleOpenAvatarControls);

    const interval = setInterval(() => {
      setIsMuted(stateManager.getIsMuted());
    }, 1000);

    return () => {
      unsubState();
      unsubConv();
      unsubTool();
      unsubLang();
      unsubTranscript();
      unsubScreen();
      unsubAIStatus();
      unsubCamera();
      window.removeEventListener('avatar-status-change', handleAvatarStatusChange);
      window.removeEventListener('open-avatar-controls', handleOpenAvatarControls);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const unsubBarcode = cameraService.onBarcodeDetected((result) => {
      cameraService.stopBarcodeScanning();
      if (onSendMessage) {
        onSendMessage(`I scanned a QR/barcode code (${result.format}): ${result.rawValue}`);
      }
    });
    return () => unsubBarcode();
  }, [onSendMessage]);

  const handleTogglePower = async () => {
    if (state === 'disconnected' && !isVoiceActive) {
      if (onStartVoiceSession) {
        await onStartVoiceSession();
      } else {
        liveSession.stopAllAudio();
        liveSession.setGreetingActive(true);
        await liveSession.connect();
        const lang = stateManager.getLanguage();
        const isGujarati = lang === 'gu-IN';
        const greetingText = isGujarati
          ? 'હું મેરી છું. સિસ્ટમ ઓનલાઇન છે અને હું સાંભળી રહી છું. આજે આપણો શું પ્લાન છે?'
          : "I'm MERY. Systems online and listening. What's on our agenda today?";

        stateManager.setState('speaking');
        setLatestTranscript({ text: greetingText, role: 'model' });
        liveSession.dispatchTranscript(greetingText, 'model');

        voiceService.speakBrowserVoice(
          greetingText,
          () => {
            stateManager.setState('speaking');
          },
          () => {
            liveSession.setGreetingActive(false);
            voiceService.playAcousticChime('listen_start');
            stateManager.setState('listening');
          },
          { pitch: 1.0, rate: 1.0 }
        );
      }
    } else {
      if (onStopVoiceSession) {
        onStopVoiceSession();
      }
      liveSession.disconnect();
      stateManager.setState('disconnected');
    }
  };

  const handleInlineSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inlineChatText.trim() || isThinking) return;
    setIsEmojiPickerOpen(false);
    if (onSendMessage) {
      onSendMessage(inlineChatText.trim());
    } else if (liveSession.isConnected()) {
      liveSession.sendTextMessage(inlineChatText.trim());
    }
    setInlineChatText('');
  };

  const handleInsertEmoji = (emoji: string) => {
    const input = inlineChatInputRef.current;
    if (!input) {
      setInlineChatText((prev) => prev + emoji);
      return;
    }
    const start = input.selectionStart ?? inlineChatText.length;
    const end = input.selectionEnd ?? inlineChatText.length;
    const nextText = inlineChatText.slice(0, start) + emoji + inlineChatText.slice(end);
    setInlineChatText(nextText);
    requestAnimationFrame(() => {
      input.focus();
      const newPos = start + emoji.length;
      input.setSelectionRange(newPos, newPos);
    });
  };

  // Human-readable status indicator
  const getStatusLabel = () => {
    if (state === 'speaking') return 'Speaking...';
    if (state === 'listening') {
      if (isMuted) return 'Muted';
      return 'Listening...';
    }
    if (isThinking || aiStatus === 'THINKING') return 'Thinking...';
    if (state === 'connecting') return 'Connecting...';
    if (aiStatus === 'SEARCHING') return 'Searching...';
    return 'Ready';
  };

  const getStatusDotColor = () => {
    if (state === 'speaking') return 'bg-[#00ff66] shadow-[0_0_12px_#00ff66] animate-pulse';
    if (state === 'listening') return 'bg-[#00ff66] shadow-[0_0_10px_#00ff66]';
    if (isThinking || aiStatus === 'THINKING') return 'bg-amber-400 shadow-[0_0_12px_#f59e0b] animate-pulse';
    if (state === 'connecting') return 'bg-cyan-400 animate-spin';
    return 'bg-[#00ff66]/70';
  };

  return (
    <div className="w-full h-full flex flex-col justify-between relative overflow-hidden select-none bg-[#080809]">
      {/* ============================================================
          1. COMPACT MOBILE-FIRST HEADER
          Safe-area aware, clean, non-overlapping
          ============================================================ */}
      {/* ============================================================
          1. HEADER (Adaptive: Minimal Phone-Call HUD vs Full Header)
          Safe-area aware, clean, non-overlapping
          ============================================================ */}
      {immersiveCallMode ? (
        <header className="w-full z-40 pt-[max(0.75rem,env(safe-area-inset-top))] px-4 sm:px-6 flex items-center justify-between h-14 shrink-0 border-b border-white/[0.06] bg-black/40 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="absolute w-4 h-4 rounded-full bg-emerald-400/30 animate-ping" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-brand text-sm sm:text-base font-black tracking-wider text-white">MERY</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 font-mono border border-sky-500/30">
                  PHONE CALL
                </span>
              </div>
              <div className="text-[10px] font-mono text-white/50 flex items-center gap-1.5">
                <span>
                  {state === 'speaking'
                    ? 'Speaking'
                    : state === 'listening'
                    ? 'Listening'
                    : isThinking || state === 'connecting'
                    ? 'Thinking'
                    : 'Connected'}
                </span>
                <span>•</span>
                <span className="text-emerald-400 font-semibold">{formatCallDuration(callDurationSeconds)}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Settings Trigger */}
            <button
              type="button"
              onClick={onOpenSettings}
              className="p-2 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-white/70 hover:text-white transition-all cursor-pointer active:scale-95"
              title="System Configuration & API Keys"
            >
              <Settings className="w-4 h-4" />
            </button>

            {/* Exit Immersive Phone-Call Mode */}
            <button
              type="button"
              onClick={handleExitImmersiveMode}
              className="px-3 py-1.5 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-white/90 hover:text-white text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
              title="Exit Immersive Phone-Call Mode"
            >
              <Minimize2 className="w-3.5 h-3.5 text-sky-400" />
              <span className="text-[11px]">Exit Call Mode</span>
            </button>
          </div>
        </header>
      ) : (
        <header className="w-full z-40 pt-[max(0.75rem,env(safe-area-inset-top))] px-4 sm:px-6 flex items-center justify-between h-14 shrink-0 border-b border-white/[0.04]">
          {/* Left: Brand Identity & Subtitle */}
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-2">
              <span className="font-brand text-lg font-black tracking-wider text-white">MERY</span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#00ff66] shadow-[0_0_8px_#00ff66]" />
            </div>
            <span className="hidden sm:inline-block text-[10px] font-telemetry tracking-widest text-white/40 uppercase">
              AI COMPANION
            </span>
          </div>

          {/* Center: Live Status Indicator / 'Current State' Badge with subtle emotion tooltip */}
          <div
            id="current-state-badge"
            data-testid="current-state-badge"
            tabIndex={0}
            role="status"
            aria-label={`Current State: ${getStatusLabel()}. Current Emotion: ${currentEmotionMeta.fullName}`}
            onMouseEnter={handleMouseEnterStateBadge}
            onMouseLeave={handleMouseLeaveStateBadge}
            onFocus={() => setIsStateTooltipOpen(true)}
            onBlur={() => setIsStateTooltipOpen(false)}
            onClick={() => setIsStateTooltipOpen((prev) => !prev)}
            className="relative flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] hover:border-white/20 backdrop-blur-md transition-all duration-200 cursor-pointer select-none focus:outline-none focus:ring-1 focus:ring-white/20"
          >
            <span className={`w-2 h-2 rounded-full ${getStatusDotColor()}`} />
            <span className="text-[10px] sm:text-[11px] font-telemetry tracking-wider uppercase text-white/80 font-medium">
              {getStatusLabel()}
            </span>

            {/* Subtle pop-up tooltip displaying the full name of the current emotion */}
            <AnimatePresence>
              {isStateTooltipOpen && (
                <motion.div
                  id="current-state-emotion-tooltip"
                  role="tooltip"
                  initial={{ opacity: 0, y: -4, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.96 }}
                  transition={{ duration: 0.15, ease: 'easeOut' }}
                  className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-3.5 py-2.5 rounded-xl bg-[#0b0d12]/95 backdrop-blur-xl border border-white/[0.12] shadow-[0_12px_32px_rgba(0,0,0,0.65)] z-50 whitespace-nowrap pointer-events-none flex flex-col items-center gap-1 min-w-[170px]"
                >
                  {/* Pointer Caret / Up Arrow */}
                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rotate-45 bg-[#0b0d12] border-t border-l border-white/[0.12]" />

                  {/* Sub-label */}
                  <div className="flex items-center gap-1.5 text-[9px] font-telemetry uppercase tracking-wider text-white/45">
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: currentEmotionMeta.color }}
                    />
                    <span>Current Emotion</span>
                  </div>

                  {/* Emotion Full Name */}
                  <div className="text-xs font-semibold text-white tracking-wide flex items-center gap-1.5">
                    <span>{currentEmotionMeta.fullName}</span>
                  </div>

                  {/* Subtle Description */}
                  <div className="text-[9.5px] text-white/50 font-normal leading-tight text-center max-w-[210px]">
                    {currentEmotionMeta.description}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Right: Quick Avatar Mode & Settings Access */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Avatar / Framing Control Button */}
            <button
              id="btn_header_avatar_controls"
              type="button"
              onClick={() => setIsAvatarModalOpen(true)}
              className="px-2.5 py-1.5 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-white/80 hover:text-white text-xs font-telemetry flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
              title="Avatar & Framing Controls"
            >
              <User className="w-3.5 h-3.5 text-[#00ff66]" />
              <span className="hidden xs:inline text-[10px] uppercase font-semibold">
                {avatarFraming === 'full_body' ? 'Full' : avatarFraming === 'face' ? 'Face' : 'Half'}
              </span>
            </button>

            {/* Skill Store Trigger */}
            {onOpenSkillStore && (
              <button
                id="btn_header_open_skills"
                type="button"
                onClick={onOpenSkillStore}
                className="p-2 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-purple-500/30 text-purple-400 hover:text-purple-300 transition-all cursor-pointer active:scale-95"
                title="Mery Skill Store (Extensions)"
              >
                <Sparkles className="w-4 h-4" />
              </button>
            )}

            {/* Settings Trigger */}
            <button
              id="btn_header_open_settings"
              type="button"
              onClick={onOpenSettings}
              className="p-2 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-white/70 hover:text-white transition-all cursor-pointer active:scale-95"
              title="System Configuration & API Keys"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </header>
      )}

      {/* ============================================================
          1.5. HOME DASHBOARD QUICK-GLANCE WIDGETS
          Weather, Mood Radar, Today Study/Reminders, Shortcuts
          (Hidden in Immersive Phone-Call Mode)
          ============================================================ */}
      {!immersiveCallMode && (
        <HomeDashboardWidgets
          onOpenJournal={() => onOpenJournal?.()}
          onOpenDocuments={() => onOpenDocuments?.()}
          onOpenWhiteboard={() => onOpenWhiteboard?.()}
          onOpenEmotionRadar={() => onOpenEmotion?.()}
          onOpenStudySettings={() => onOpenStudySettings?.()}
          currentEmotion={currentEmotion}
        />
      )}

      {/* ============================================================
          2. LIVE CAMERA PIP VIEWFINDER (If Active)
          (Hidden in Immersive Phone-Call Mode)
          ============================================================ */}
      {!immersiveCallMode && isCameraActive && (
        <div className="absolute top-16 right-4 z-40 animate-fadeIn">
          <div className="relative rounded-2xl overflow-hidden border border-[#00ff66]/40 shadow-[0_0_20px_rgba(0,255,102,0.2)] bg-black/90 backdrop-blur-md transition-all">
            <video
              ref={videoPreviewRef}
              autoPlay
              playsInline
              muted
              className={`${
                isCameraExpanded ? 'w-56 h-44 sm:w-72 sm:h-56' : 'w-36 h-28 sm:w-44 sm:h-34'
              } ${cameraFitMode === 'contain' ? 'object-contain bg-black/95' : 'object-cover'} transition-all`}
            />
            <div className="absolute top-1.5 left-2 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00ff66] animate-pulse" />
              <span className="text-[8px] font-telemetry text-[#00ff66] uppercase">Face Camera</span>
            </div>
            <div className="absolute bottom-1 right-1 flex items-center gap-1">
              <button
                onClick={() => setCameraFitMode((prev) => (prev === 'contain' ? 'cover' : 'contain'))}
                className="px-1.5 py-0.5 rounded bg-black/70 text-white/80 text-[8px] font-telemetry cursor-pointer"
              >
                {cameraFitMode === 'contain' ? 'Fit' : 'Fill'}
              </button>
              <button
                onClick={() => setIsCameraExpanded((prev) => !prev)}
                className="px-1.5 py-0.5 rounded bg-black/70 text-white/80 text-[8px] font-telemetry cursor-pointer"
              >
                {isCameraExpanded ? 'Small' : 'Expand'}
              </button>
              <button
                onClick={() => cameraService.stopCamera()}
                className="px-1.5 py-0.5 rounded bg-rose-900/80 text-rose-200 text-[8px] font-telemetry cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          3. MAIN HERO STAGE: 3D AVATAR OR HOLOGRAM ORB
          Centered, fluidly responsive, generous breathing room
          ============================================================ */}
      <main className="flex-1 w-full flex flex-col items-center justify-center min-h-0 relative px-3 sm:px-6 overflow-hidden">
        {/* Active Vision or Tool Pill (Hidden in Immersive Mode) */}
        {!immersiveCallMode && (isSharingScreen || activeTool) && (
          <div className="w-full max-w-sm mb-1 z-20">
            {isSharingScreen ? (
              <div className="px-3 py-1 rounded-full bg-[#00ff66]/10 border border-[#00ff66]/30 backdrop-blur-md flex items-center justify-between text-xs w-full">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#00ff66] animate-pulse" />
                  <span className="text-[#00ff66] font-telemetry tracking-wider text-[10px] uppercase">
                    Screen Vision: Active
                  </span>
                </div>
                <button
                  onClick={() => screenShareService.stopScreenShare()}
                  className="text-[10px] text-rose-400 hover:text-rose-300 font-semibold underline cursor-pointer"
                >
                  Stop
                </button>
              </div>
            ) : activeTool ? (
              <div className="px-3 py-1 rounded-full bg-black/60 border border-white/10 backdrop-blur-md flex items-center gap-2 text-xs w-full">
                {activeTool.name === 'openWebsite' && <Globe className="w-3 h-3 text-[#00ff66] animate-spin" />}
                {activeTool.name === 'searchWeb' && <Search className="w-3 h-3 text-amber-400 animate-pulse" />}
                {activeTool.name === 'getSystemStatus' && <Clock className="w-3 h-3 text-emerald-400" />}
                {activeTool.name === 'executeDangerousAction' && <Shield className="w-3 h-3 text-rose-400 animate-pulse" />}
                <span className="text-[10px] text-white/90 font-telemetry truncate">
                  {activeTool.name} ({activeTool.status})
                </span>
              </div>
            ) : null}
          </div>
        )}

        {/* In Immersive Phone-Call Mode: Display exclusively the Hologram Orb! */}
        {immersiveCallMode ? (
          <div className="w-full flex-1 flex flex-col items-center justify-center relative pointer-events-auto py-2">
            <AuroraHologram
              state={
                state === 'speaking'
                  ? 'speaking'
                  : state === 'listening'
                  ? 'listening'
                  : isThinking || state === 'connecting'
                  ? 'thinking'
                  : 'idle'
              }
              emotion={currentEmotion}
              isAudioPlaying={state === 'speaking' || voiceService.isSpeaking()}
              isImmersive={true}
              companionName="Mery"
              onClickPrompt={async () => {
                if (state === 'speaking') {
                  if (onInterruptSpeech) onInterruptSpeech();
                  else liveSession.handleUserInterrupt();
                } else if (state === 'disconnected' && !isVoiceActive) {
                  await onStartVoiceSession?.();
                } else {
                  if (onStopVoiceSession) onStopVoiceSession();
                  else liveSession.disconnect();
                }
              }}
            />
          </div>
        ) : (
          /* 3D Avatar Viewport: Fluid responsive container */
          <div className="w-full max-w-[min(92vw,480px)] sm:max-w-[540px] md:max-w-[620px] h-[min(50vh,440px)] sm:h-[min(56vh,520px)] relative flex items-center justify-center pointer-events-auto">
            {children}
          </div>
        )}

        {/* Spoken Subtitle & Live Conversation Transcript */}
        <div
          id="spoken_subtitle_display_container"
          className={`w-full max-w-[min(92vw,520px)] mx-auto px-4 py-2 mt-1 mb-1 rounded-2xl text-center transition-all duration-300 shadow-xl min-h-[44px] flex items-center justify-center pointer-events-none ${
            immersiveCallMode
              ? 'bg-black/40 border border-white/[0.08] backdrop-blur-md'
              : 'bg-black/65 border border-white/10 backdrop-blur-md'
          }`}
        >
          <div className="text-xs sm:text-sm font-normal leading-relaxed text-white/95">
            {latestTranscript ? (
              <span>
                <span className="text-[#00ff66] font-semibold text-[10px] uppercase font-telemetry mr-1.5">
                  {latestTranscript.role === 'user' ? 'YOU:' : 'MERY:'}
                </span>
                "{latestTranscript.text}"
              </span>
            ) : (
              <span className="text-white/65 font-light">
                {language === 'gu-IN'
                  ? 'કેમ છો! બોલો, હું સાંભળું છું...'
                  : language === 'hi-IN'
                  ? 'नमस्ते! मैं मेरी हूँ, कहिए क्या मदद करूँ?'
                  : "I'm Mery. Tap the microphone or speak to converse."}
              </span>
            )}
          </div>
        </div>
      </main>

      {/* Optional In-line Chat Timeline (Hidden in Immersive Mode) */}
      {!immersiveCallMode && isChatVisible && messages && messages.length > 0 && (
        <div className="mx-4 sm:mx-8 mb-2 rounded-2xl bg-black/85 border border-[#00ff66]/30 backdrop-blur-xl p-3 shadow-2xl z-20 transition-all max-h-36 overflow-y-auto">
          <div className="flex items-center justify-between pb-1 mb-2 border-b border-white/10 text-[10px] font-telemetry">
            <span className="text-[#00ff66] font-semibold uppercase">Chat History</span>
            <button
              onClick={() => {
                if (onToggleChatText) onToggleChatText();
                else setInternalShowChatText(false);
              }}
              className="text-white/50 hover:text-white cursor-pointer"
            >
              Hide
            </button>
          </div>
          <div className="space-y-1.5">
            {messages.slice(-4).map((msg) => (
              <div key={msg.id} className="text-xs text-white/80">
                <span className="text-[#00ff66] font-telemetry text-[10px] mr-1.5">
                  {msg.role === 'user' ? 'YOU:' : 'MERY:'}
                </span>
                {msg.content}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ============================================================
          4. BOTTOM CONTROLS CLUSTER
          In Immersive Mode: Phone-Call Controls (Mute, Talk/Interrupt, End Call)
          In Standard Mode: Chat bar, Memory dock, Dominant center mic, Tools
          ============================================================ */}
      {immersiveCallMode ? (
        <footer className="w-full max-w-md mx-auto px-6 pb-[max(1.2rem,env(safe-area-inset-bottom))] pt-2 flex flex-col items-center gap-3 z-30 shrink-0">
          {/* Phone Call Controls Dock */}
          <div className="flex items-center justify-center gap-6 sm:gap-8">
            {/* Mute / Unmute Button */}
            <button
              type="button"
              onClick={handleToggleMute}
              className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full flex flex-col items-center justify-center gap-0.5 border transition-all cursor-pointer active:scale-95 ${
                isMuted
                  ? 'bg-rose-600/90 border-rose-500 text-white shadow-[0_0_20px_rgba(244,63,94,0.4)]'
                  : 'bg-white/[0.08] hover:bg-white/[0.14] border-white/15 text-white/85 hover:text-white'
              }`}
              title={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
            >
              {isMuted ? <MicOff className="w-5 h-5 sm:w-6 sm:h-6" /> : <Mic className="w-5 h-5 sm:w-6 sm:h-6" />}
              <span className="text-[9px] font-telemetry uppercase tracking-wider">{isMuted ? 'Muted' : 'Mute'}</span>
            </button>

            {/* Center Call / Speak / Interrupt Button */}
            <button
              type="button"
              onClick={
                state === 'speaking'
                  ? () => {
                      if (onInterruptSpeech) onInterruptSpeech();
                      else liveSession.handleUserInterrupt();
                    }
                  : handleTogglePower
              }
              className={`w-18 h-18 sm:w-20 sm:h-20 rounded-full flex flex-col items-center justify-center gap-0.5 transition-all duration-300 cursor-pointer shadow-2xl active:scale-90 relative ${
                state === 'speaking'
                  ? 'bg-amber-400 text-black shadow-[0_0_35px_rgba(251,191,36,0.6)] animate-pulse'
                  : state === 'listening' || isVoiceActive
                  ? 'bg-emerald-400 text-black shadow-[0_0_40px_rgba(52,211,153,0.6)]'
                  : isThinking || state === 'connecting'
                  ? 'bg-sky-400 text-black shadow-[0_0_30px_rgba(56,189,248,0.5)]'
                  : 'bg-white text-black hover:scale-105 shadow-[0_0_25px_rgba(255,255,255,0.4)]'
              }`}
              title={
                state === 'speaking'
                  ? 'Tap to Interrupt'
                  : state === 'listening' || isVoiceActive
                  ? 'Listening... Tap to Pause'
                  : 'Tap to Connect Voice'
              }
            >
              {isThinking || state === 'connecting' ? (
                <Sparkles className="w-7 h-7 sm:w-8 sm:h-8 animate-spin" />
              ) : state === 'speaking' ? (
                <Zap className="w-7 h-7 sm:w-8 sm:h-8 fill-current" />
              ) : isMuted ? (
                <MicOff className="w-7 h-7 sm:w-8 sm:h-8 text-rose-800" />
              ) : (
                <Radio className="w-7 h-7 sm:w-8 sm:h-8 animate-pulse" />
              )}
              <span className="text-[8.5px] font-telemetry font-bold uppercase tracking-wider">
                {state === 'speaking' ? 'Interrupt' : state === 'listening' ? 'Listening' : isThinking ? 'Thinking' : 'Talk'}
              </span>
            </button>

            {/* End Call / Exit Immersive Button (Red Phone Receiver) */}
            <button
              type="button"
              onClick={() => {
                if (onStopVoiceSession) onStopVoiceSession();
                else liveSession.disconnect();
                handleExitImmersiveMode();
              }}
              className="w-14 h-14 sm:w-16 sm:h-16 rounded-full flex flex-col items-center justify-center gap-0.5 bg-rose-600 hover:bg-rose-500 active:scale-95 text-white border border-rose-400 shadow-[0_0_25px_rgba(225,29,72,0.5)] transition-all cursor-pointer"
              title="End Call & Return to Full Dashboard"
            >
              <PhoneOff className="w-5 h-5 sm:w-6 sm:h-6" />
              <span className="text-[9px] font-telemetry uppercase tracking-wider font-semibold">End Call</span>
            </button>
          </div>

          <p className="text-[10px] font-telemetry text-white/40 tracking-wider uppercase text-center mt-1">
            Voice-Native Hologram Orb • Tap orb or buttons to converse
          </p>
        </footer>
      ) : (
        <footer className="w-full max-w-lg mx-auto px-4 pb-[max(0.85rem,env(safe-area-inset-bottom))] pt-1 flex flex-col items-center gap-2.5 z-20 shrink-0">
          {/* Compact Collapsible Chat Bar */}
          <form
            className="w-full flex items-center gap-2 bg-white/[0.04] hover:bg-white/[0.06] focus-within:bg-white/[0.08] border border-white/10 focus-within:border-[#00ff66]/40 rounded-2xl px-3 py-1.5 backdrop-blur-md transition-all"
            onSubmit={handleInlineSubmit}
          >
            <input
              ref={inlineChatInputRef}
              type="text"
              id="hud_inline_chat_input"
              value={inlineChatText}
              onChange={(e) => setInlineChatText(e.target.value)}
              placeholder={
                isThinking
                  ? 'Synthesizing response...'
                  : language === 'gu-IN'
                  ? 'કાઠિયાવાડી / ગુજરાતીમાં લખો...'
                  : 'Message Mery...'
              }
              disabled={isThinking}
              className="flex-1 bg-transparent border-none text-white text-xs sm:text-sm outline-none placeholder:text-white/35 font-sans"
            />

            {/* Emoji Trigger */}
            <button
              ref={emojiTriggerRef}
              type="button"
              onClick={() => setIsEmojiPickerOpen(!isEmojiPickerOpen)}
              className="p-1 text-white/40 hover:text-[#00ff66] transition-colors cursor-pointer shrink-0"
              title="Insert emoji"
            >
              <Smile className="w-4 h-4" />
            </button>

            {/* Send Button */}
            <button
              id="btn_hud_inline_chat_send"
              type="submit"
              disabled={!inlineChatText.trim() || isThinking}
              className="p-1.5 rounded-xl bg-[#00ff66]/20 text-[#00ff66] hover:bg-[#00ff66] hover:text-black disabled:opacity-20 disabled:hover:bg-transparent disabled:hover:text-[#00ff66] transition-all cursor-pointer shrink-0"
              title="Send message"
            >
              <Send className="w-3.5 h-3.5" />
            </button>

            {/* Floating Emoji Popover */}
            <EmojiPickerPopover
              isOpen={isEmojiPickerOpen}
              onClose={() => setIsEmojiPickerOpen(false)}
              onSelectEmoji={handleInsertEmoji}
              triggerRef={emojiTriggerRef}
              accentColor="green"
              align="right"
            />
          </form>

          {/* Primary 3-Item Action Row */}
          <div className="w-full grid grid-cols-3 items-center gap-3">
            {/* Left: Memory Button */}
            <button
              id="btn_open_memory_hud"
              type="button"
              onClick={onOpenMemory}
              className="h-14 sm:h-16 rounded-2xl bg-white/[0.03] hover:bg-white/[0.08] active:scale-95 border border-white/10 hover:border-[#00ff66]/30 flex flex-col items-center justify-center gap-1 text-white/70 hover:text-white transition-all cursor-pointer backdrop-blur-md"
              title="Open Permanent Memory Subsystem"
            >
              <Database className="w-4 h-4 sm:w-5 sm:h-5 text-[#00ff66]" />
              <span className="text-[10px] font-telemetry tracking-wider uppercase font-medium">Memory</span>
            </button>

            {/* Center: Dominant Microphone Button */}
            <div className="flex justify-center">
              <button
                id="btn_dock_center_mic_connect"
                type="button"
                onClick={
                  state === 'speaking'
                    ? () => {
                        if (onInterruptSpeech) onInterruptSpeech();
                        else liveSession.handleUserInterrupt();
                      }
                    : handleTogglePower
                }
                className={`w-16 h-16 sm:w-18 sm:h-18 rounded-full flex items-center justify-center transition-all duration-300 cursor-pointer shadow-2xl active:scale-90 relative ${
                  state === 'speaking' || state === 'listening' || isVoiceActive
                    ? 'bg-[#00ff66] text-black shadow-[0_0_40px_rgba(0,255,102,0.6)] animate-pulse'
                    : state === 'connecting' || isThinking
                    ? 'bg-amber-400 text-black shadow-[0_0_30px_rgba(251,191,36,0.5)]'
                    : 'bg-white text-black hover:scale-105 hover:shadow-[0_0_30px_rgba(0,255,102,0.35)]'
                }`}
                title={
                  state === 'speaking'
                    ? 'Tap to Interrupt'
                    : state === 'listening' || isVoiceActive
                    ? 'Tap to Turn Off Microphone'
                    : 'Tap to Turn On Microphone'
                }
              >
                {state === 'connecting' || isThinking ? (
                  <Sparkles className="w-7 h-7 animate-spin" />
                ) : state === 'speaking' ? (
                  <Zap className="w-7 h-7 fill-current" />
                ) : (state === 'disconnected' && !isVoiceActive) || isMuted ? (
                  <MicOff className="w-7 h-7" />
                ) : (
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3zM5 10v2a7 7 0 0 0 14 0v-2h-2v2a5 5 0 0 1-10 0v-2H5zM11 19v3h2v-3h-2z" />
                  </svg>
                )}
              </button>
            </div>

            {/* Right: Tools & System Controls Button */}
            <button
              id="btn_open_tools_sheet"
              type="button"
              onClick={() => setIsToolsSheetOpen(true)}
              className="h-14 sm:h-16 rounded-2xl bg-white/[0.03] hover:bg-white/[0.08] active:scale-95 border border-white/10 hover:border-[#00ff66]/30 flex flex-col items-center justify-center gap-1 text-white/70 hover:text-white transition-all cursor-pointer backdrop-blur-md"
              title="Open Companion Tools & Controls"
            >
              <SlidersHorizontal className="w-4 h-4 sm:w-5 sm:h-5 text-[#00ff66]" />
              <span className="text-[10px] font-telemetry tracking-wider uppercase font-medium">Tools</span>
            </button>
          </div>
        </footer>
      )}

      {/* ============================================================
          5. EXPANDABLE MODALS & SHEETS
          Secondary controls cleanly separated from primary voice stage
          ============================================================ */}
      {/* Avatar Appearance & Framing Modal */}
      <AvatarControlsModal
        isOpen={isAvatarModalOpen}
        onClose={() => setIsAvatarModalOpen(false)}
        currentFraming={avatarFraming}
        onSelectFraming={(mode) => {
          setAvatarFraming(mode);
          window.dispatchEvent(new CustomEvent('set-avatar-framing', { detail: mode }));
        }}
        onTriggerWave={() => {
          window.dispatchEvent(new CustomEvent('trigger-avatar-wave'));
        }}
        onOpenVRMUpload={() => {
          window.dispatchEvent(new CustomEvent('open-vrm-upload'));
        }}
        onResetVRM={() => {
          window.dispatchEvent(new CustomEvent('reset-avatar-vrm'));
        }}
        usingCustomVRM={usingCustomVRM}
        customVRMTitle={customVRMTitle}
        currentEmotion={currentEmotion}
        onSelectEmotion={(emo) => {
          setCurrentEmotion(emo);
        }}
      />

      {/* Expandable Tools & Sensors Sheet */}
      <ToolsSheet
        isOpen={isToolsSheetOpen}
        onClose={() => setIsToolsSheetOpen(false)}
        onOpenSettings={onOpenSettings}
        onOpenTools={onOpenTools}
        onOpenTranscript={onOpenTranscript}
        onOpenAgentDev={onOpenAgentDev}
        onOpenSystemControl={onOpenSystemControl}
        onOpenActivity={onOpenActivity}
        onOpenEmotion={onOpenEmotion}
        voiceEnabled={voiceEnabled}
        onToggleVoice={onToggleVoice}
        messageCount={messageCount}
      />
    </div>
  );
};

export default VoiceOrbStage;
