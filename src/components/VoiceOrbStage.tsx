import React, { useEffect, useState, useRef } from 'react';
import {
  Sparkles,
  Zap,
  MicOff,
  Send,
  SlidersHorizontal,
  Database,
  MessageSquare,
  Cpu,
  Globe,
  Search,
  Clock,
  Shield,
  Monitor,
  Languages,
  Volume2,
  VolumeX,
  Camera,
  CameraOff,
} from 'lucide-react';
import { AssistantState, ConversationState, ToolExecutionRecord, AIStatus, ChatMessage } from '../types';
import { stateManager, SpokenLanguage } from '../modules/StateManager';
import { audioStreamer } from '../modules/AudioStreamer';
import { liveSession } from '../modules/LiveSession';
import { screenShareService } from '../modules/ScreenShareService';
import { cameraService } from '../modules/CameraService';
import { voiceService } from '../utils/audio';

interface VoiceOrbStageProps {
  onOpenSettings: () => void;
  onOpenTools: () => void;
  onOpenTranscript?: () => void;
  onOpenAgentDev?: () => void;
  onStartVoiceSession?: () => Promise<void> | void;
  onOpenMemory?: () => void;
  onOpenSystemControl?: () => void;
  onOpenActivity?: () => void;
  onOpenEmotion?: () => void;
  voiceEnabled?: boolean;
  onToggleVoice?: () => void;
  onSendMessage?: (text: string) => void;
  isThinking?: boolean;
  messageCount?: number;
  visualMode?: 'avatar' | 'hologram';
  onToggleVisualMode?: () => void;
  children?: React.ReactNode;
  showChatText?: boolean;
  onToggleChatText?: () => void;
  messages?: ChatMessage[];
  onPlayVoice?: (msg: ChatMessage) => void;
  playingMessageId?: string | null;
}

export const VoiceOrbStage: React.FC<VoiceOrbStageProps> = ({
  onOpenSettings,
  onOpenTools,
  onOpenTranscript,
  onOpenAgentDev,
  onStartVoiceSession,
  onOpenMemory,
  onOpenSystemControl,
  onOpenActivity,
  onOpenEmotion,
  voiceEnabled = true,
  onToggleVoice,
  onSendMessage,
  isThinking = false,
  messageCount = 0,
  visualMode = 'avatar',
  onToggleVisualMode,
  children,
  showChatText,
  onToggleChatText,
  messages = [],
  onPlayVoice,
  playingMessageId,
}) => {
  const [internalShowChatText, setInternalShowChatText] = useState<boolean>(() => {
    try {
      return localStorage.getItem('mery_show_chat_text') === 'true';
    } catch {
      return false; // Default: false (voice-first clean UI)
    }
  });

  const isChatVisible = showChatText !== undefined ? showChatText : internalShowChatText;

  const toggleChatVisibility = () => {
    if (onToggleChatText) {
      onToggleChatText();
    } else {
      setInternalShowChatText((prev) => {
        const next = !prev;
        try {
          localStorage.setItem('mery_show_chat_text', String(next));
        } catch {}
        return next;
      });
    }
  };

  const [state, setState] = useState<AssistantState>(stateManager.getState());
  const [, setConvState] = useState<ConversationState>(stateManager.getConversationState());
  const [isMuted, setIsMuted] = useState<boolean>(stateManager.getIsMuted());
  const [activeTool, setActiveTool] = useState<ToolExecutionRecord | null>(
    stateManager.getActiveTool()
  );
  const [latency, setLatency] = useState<number>(stateManager.getLatency());
  const [language, setLanguage] = useState<SpokenLanguage>(stateManager.getLanguage());
  const [latestTranscript, setLatestTranscript] = useState<{ text: string; role: 'model' | 'user' } | null>(null);
  const [isSharingScreen, setIsSharingScreen] = useState<boolean>(screenShareService.isSharing());
  const [inlineChatText, setInlineChatText] = useState('');
  const [aiStatus, setAiStatus] = useState<AIStatus>(stateManager.getAIStatus());
  const [isCameraActive, setIsCameraActive] = useState<boolean>(cameraService.isCameraActive());
  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);

  // Subscribe to real-time session state
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

    const interval = setInterval(() => {
      setLatency(stateManager.getLatency());
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
      clearInterval(interval);
    };
  }, []);

  const handleTogglePower = async () => {
    if (state === 'disconnected') {
      if (onStartVoiceSession) {
        await onStartVoiceSession();
      } else {
        liveSession.stopAllAudio();
        liveSession.setGreetingActive(true);
        const connected = await liveSession.connect();
        if (connected) {
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
            { pitch: 1.04, rate: 0.96 }
          );
        } else {
          liveSession.setGreetingActive(false);
        }
      }
    } else {
      liveSession.disconnect();
    }
  };

  const handleToggleLanguage = (newLang?: SpokenLanguage) => {
    let next = newLang;
    if (!next) {
      if (language === 'gu-IN') next = 'hi-IN';
      else if (language === 'hi-IN') next = 'en-US';
      else next = 'gu-IN';
    }
    stateManager.setActiveLanguage(next);
    if (liveSession.isConnected()) {
      const prompt =
        next === 'gu-IN'
          ? 'કૃપા કરીને હવેથી મારી સાથે ગુજરાતીમાં વાત કરો. (Please speak in Gujarati now.)'
          : next === 'hi-IN'
          ? 'कृपया अब से मुझसे हिंदी में बात करें। (Please speak in Hindi now.)'
          : 'Please converse with me in English now.';
      liveSession.sendTextMessage(prompt);
    }
  };

  const handleInlineSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inlineChatText.trim() || isThinking) return;
    if (onSendMessage) {
      onSendMessage(inlineChatText.trim());
    } else if (liveSession.isConnected()) {
      liveSession.sendTextMessage(inlineChatText.trim());
    }
    setInlineChatText('');
  };

  const getStatusDotClass = () => {
    switch (aiStatus) {
      case 'SPEAKING':
        return 'bg-[#00ff66] shadow-[0_0_12px_#00ff66] animate-pulse';
      case 'LISTENING':
        return 'bg-[#00ff66] shadow-[0_0_10px_#00ff66]';
      case 'THINKING':
        return 'bg-amber-400 shadow-[0_0_12px_#f59e0b] animate-pulse';
      case 'SEARCHING':
        return 'bg-cyan-400 shadow-[0_0_12px_#06b6d4] animate-pulse';
      case 'ANALYZING':
        return 'bg-fuchsia-400 shadow-[0_0_12px_#e879f9] animate-pulse';
      case 'COMPLETED':
        return 'bg-emerald-400 shadow-[0_0_10px_#10b981]';
      case 'ERROR':
        return 'bg-rose-500 shadow-[0_0_12px_#f43f5e] animate-bounce';
      case 'IDLE':
      default:
        return 'bg-[#00ff66]/50';
    }
  };

  const telemetryStatus =
    state === 'speaking'
      ? 'AUDIO_STREAM_ACTIVE'
      : state === 'listening'
      ? (isMuted ? 'MIC_MUTED_STATE' : 'LISTENING_ACTIVE')
      : isThinking
      ? 'NEURAL_SYNTHESIS'
      : state === 'connecting'
      ? 'SYNCING_CORE'
      : 'SYSTEM_READY_STATE';

  return (
    <div className="w-full h-full flex flex-col justify-between relative overflow-hidden select-none">
      {/* Top HUD Pill (Variation 11) */}
      <div
        className="top-hud"
        onClick={onOpenSettings}
        title="MERY Core Status - Click for System Config"
      >
        <div className={`status-dot ${getStatusDotClass()}`} />
        <div className="hud-text">
          MERY // STATUS: {aiStatus} // {latency > 0 ? latency : 28}MS
        </div>
      </div>

      {/* Hero Main Area (Variation 11) */}
      <main className="flex-1 flex flex-col justify-center items-center relative pt-12 sm:pt-14 pb-2 px-4">
        {/* Mode Indicator: I'M MERY (Top Left) */}
        <div className="absolute top-5 left-5 sm:top-6 sm:left-8 flex flex-col items-start gap-1 z-20">
          <div className="mode-indicator">I'M MERY</div>
          <span className="font-telemetry text-[9px] tracking-[0.25em] text-[#00ff66]/70 uppercase">
            NEURAL COMPANION
          </span>
        </div>

        {/* Camera Live Viewfinder Window */}
        {isCameraActive && (
          <div className="absolute top-16 right-4 sm:top-18 sm:right-8 z-30 flex flex-col items-end gap-1.5 animate-fadeIn">
            <div className="relative rounded-2xl overflow-hidden border border-[#00ff66]/40 shadow-[0_0_20px_rgba(0,255,102,0.2)] bg-black/80 backdrop-blur-md">
              <video
                ref={videoPreviewRef}
                autoPlay
                playsInline
                muted
                className="w-36 h-28 sm:w-44 sm:h-32 object-cover"
              />
              <div className="absolute top-1.5 left-2 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#00ff66] animate-pulse" />
                <span className="text-[9px] font-telemetry tracking-wider text-[#00ff66] uppercase">
                  {cameraService.getFacingMode() === 'user' ? 'Front' : 'Rear'}
                </span>
              </div>
              <div className="absolute bottom-1.5 right-1.5 flex items-center gap-1">
                <button
                  onClick={() => cameraService.switchCamera()}
                  className="px-1.5 py-0.5 rounded bg-black/60 hover:bg-black/90 text-white/80 hover:text-white text-[8px] font-telemetry cursor-pointer border border-white/10"
                  title="Flip camera"
                >
                  Flip
                </button>
                <button
                  onClick={() => cameraService.stopCamera()}
                  className="px-1.5 py-0.5 rounded bg-rose-950/60 hover:bg-rose-900 text-rose-300 text-[8px] font-telemetry cursor-pointer border border-rose-800/40"
                  title="Stop camera"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Top-Right Accessory Utility Bar */}
        <div className="absolute top-4 right-4 sm:top-6 sm:right-8 flex items-center gap-1.5 sm:gap-2 z-20">
          {/* Visual Mode Toggle: 3D Anime Avatar vs Hologram */}
          {onToggleVisualMode && (
            <div className="flex items-center bg-white/[0.04] border border-white/[0.06] p-0.5 rounded-full backdrop-blur-md">
              <button
                id="btn_mode_avatar"
                onClick={() => visualMode !== 'avatar' && onToggleVisualMode()}
                className={`px-2.5 py-1 rounded-full text-[9px] font-telemetry tracking-wider uppercase transition-all cursor-pointer ${
                  visualMode === 'avatar'
                    ? 'bg-[#00ff66] text-[#080809] font-bold shadow-[0_0_12px_rgba(0,255,102,0.4)]'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                Anime
              </button>
              <button
                id="btn_mode_hologram"
                onClick={() => visualMode !== 'hologram' && onToggleVisualMode()}
                className={`px-2.5 py-1 rounded-full text-[9px] font-telemetry tracking-wider uppercase transition-all cursor-pointer ${
                  visualMode === 'hologram'
                    ? 'bg-[#00ff66] text-[#080809] font-bold shadow-[0_0_12px_rgba(0,255,102,0.4)]'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                Hologram
              </button>
            </div>
          )}

          {/* Language Cycle Toggle (GU -> HI -> EN) */}
          <button
            id="btn_toggle_language_dock"
            onClick={() => handleToggleLanguage()}
            className="px-2.5 py-1 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-white/80 hover:text-white text-[9px] font-telemetry flex items-center gap-1 transition-colors cursor-pointer"
            title={`Language: ${
              language === 'gu-IN' ? 'Gujarati (ગુજરાતી)' : language === 'hi-IN' ? 'Hindi (हिंदी)' : 'English'
            } - Click to cycle`}
          >
            <Languages className="w-3 h-3 text-[#00ff66]" />
            <span className="font-semibold text-[#00ff66]">
              {language === 'gu-IN' ? 'GU' : language === 'hi-IN' ? 'HI' : 'EN'}
            </span>
          </button>

          {/* Chat Text Visibility Toggle (showChatText = false by default) */}
          <button
            id="btn_toggle_chat_text"
            onClick={toggleChatVisibility}
            className={`px-2.5 py-1 rounded-full border text-[9px] font-telemetry flex items-center gap-1 transition-all cursor-pointer ${
              isChatVisible
                ? 'bg-[#00ff66]/15 border-[#00ff66]/50 text-[#00ff66] shadow-[0_0_8px_rgba(0,255,102,0.25)]'
                : 'bg-white/[0.04] hover:bg-white/[0.08] border-white/[0.06] text-white/50 hover:text-white'
            }`}
            title={isChatVisible ? 'Hide Chat Timeline (Voice Mode)' : 'Show Chat Timeline on Screen'}
          >
            <MessageSquare className="w-3 h-3 text-[#00ff66]" />
            <span>Chat: {isChatVisible ? 'ON' : 'OFF'}</span>
          </button>

          {/* Voice Audio Mute Toggle */}
          {onToggleVoice && (
            <button
              id="btn-toggle-voice"
              onClick={onToggleVoice}
              className="p-1.5 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-white/70 hover:text-white transition-colors cursor-pointer"
              title={voiceEnabled ? 'Mute Audio Output' : 'Enable Audio Output'}
            >
              {voiceEnabled ? (
                <Volume2 className="w-3.5 h-3.5 text-[#00ff66]" />
              ) : (
                <VolumeX className="w-3.5 h-3.5 text-white/40" />
              )}
            </button>
          )}

          {/* Full Chat Log Drawer Trigger */}
          {onOpenTranscript && (
            <button
              id="btn_expand_chat_box"
              onClick={onOpenTranscript}
              className="px-2.5 py-1 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-white/70 hover:text-white text-[9px] font-telemetry flex items-center gap-1 transition-colors cursor-pointer"
              title="Expand Full Neural Chat Box Console"
            >
              <MessageSquare className="w-3 h-3 text-[#00ff66]" />
              <span>[{messageCount || 0}]</span>
            </button>
          )}
        </div>

        {/* Right-side Vertical Telemetry (Variation 11) */}
        <div className="absolute right-4 sm:right-6 top-1/2 -translate-y-1/2 hidden md:flex flex-col gap-6 pointer-events-none z-10">
          <div className="vertical-telemetry">
            {telemetryStatus}
          </div>
        </div>

        {/* Central Viz Container (Variation 11) */}
        <div className="viz-container my-auto">
          <div className="orb-hologram" />

          {/* 3D Canvas Rig */}
          <div className="w-full h-full relative z-10 flex items-center justify-center">
            {children}
          </div>

          {/* Spoken Subtitle & Live Transcript (Variation 11) */}
          <div
            className="spoken-transcript"
            id="spoken_subtitle_display_container"
          >
            {latestTranscript ? (
              <span className="text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
                "{latestTranscript.text}"
              </span>
            ) : (
              <span className="text-white/85 drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
                I'm Mery. Tap the pulse or type below to synchronize.
              </span>
            )}
          </div>
        </div>

        {/* Active Tool or Screen Vision Notification Banner */}
        {(isSharingScreen || activeTool) && (
          <div className="absolute bottom-2 max-w-sm w-[90%] z-20">
            {isSharingScreen ? (
              <div
                id="active_screen_pill"
                className="px-3 py-1 rounded-full bg-[#00ff66]/10 border border-[#00ff66]/40 backdrop-blur-md flex items-center justify-between text-xs w-full shadow-[0_0_15px_rgba(0,255,102,0.15)]"
              >
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#00ff66] animate-pulse" />
                  <span className="text-[#00ff66] font-telemetry tracking-wider text-[10px] uppercase">
                    Vision: Active
                  </span>
                </div>
                <button
                  id="btn_stop_screen_pill"
                  onClick={() => screenShareService.stopScreenShare()}
                  className="text-[10px] text-rose-400 hover:text-rose-300 font-semibold underline cursor-pointer"
                >
                  Stop
                </button>
              </div>
            ) : activeTool ? (
              <div
                id="active_tool_pill"
                className="px-3 py-1 rounded-full bg-black/60 border border-white/10 backdrop-blur-md flex items-center gap-2 text-xs w-full"
              >
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
      </main>

      {/* Visual Chat Timeline (Visible ONLY when isChatVisible = true; hidden by default for voice-first experience) */}
      {isChatVisible && messages && messages.length > 0 && (
        <div
          id="inline_chat_timeline_panel"
          className="mx-4 sm:mx-8 mb-2 rounded-2xl bg-black/85 border border-[#00ff66]/30 backdrop-blur-xl p-3 shadow-2xl z-20 transition-all duration-300 animate-fadeIn"
        >
          <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-white/10 text-[10px] font-telemetry">
            <span className="text-[#00ff66] font-semibold tracking-wider uppercase">MERY CONVERSATION TIMELINE</span>
            <div className="flex items-center gap-2">
              <span className="text-white/40">[{messages.length} msgs]</span>
              <button
                id="btn_collapse_inline_chat"
                onClick={toggleChatVisibility}
                className="hover:text-white text-[9px] cursor-pointer text-white/60 bg-white/5 px-2 py-0.5 rounded-md hover:bg-white/10"
              >
                Hide
              </button>
            </div>
          </div>
          <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
            {messages.slice(-6).map((msg) => {
              const isUser = msg.role === 'user';
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col text-xs ${isUser ? 'items-end' : 'items-start'}`}
                >
                  <div className="flex items-center gap-1.5 text-[9px] font-telemetry mb-0.5 text-white/40">
                    <span className={isUser ? 'text-white/70' : 'text-[#00ff66]'}>
                      {isUser ? 'YOU' : 'MERY'}
                    </span>
                    {msg.timestamp && <span>· {msg.timestamp}</span>}
                  </div>
                  <div
                    className={`px-3 py-1.5 rounded-xl max-w-[85%] break-words ${
                      isUser
                        ? 'bg-[#00ff66]/15 border border-[#00ff66]/30 text-white rounded-tr-none'
                        : 'bg-white/5 border border-white/10 text-white/90 rounded-tl-none'
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Bottom Control Cluster (Variation 11) */}
      <div className="bottom-cluster">
        {/* Chat Bar (Variation 11) */}
        <form className="chat-bar" onSubmit={handleInlineSubmit}>
          <input
            type="text"
            id="hud_inline_chat_input"
            value={inlineChatText}
            onChange={(e) => setInlineChatText(e.target.value)}
            placeholder={isThinking ? 'Synthesizing response..._' : 'Neural transmission..._'}
            disabled={isThinking}
          />
          <button
            id="btn_hud_inline_chat_send"
            type="submit"
            disabled={!inlineChatText.trim() || isThinking}
            style={{ background: 'none', border: 'none', color: 'var(--accent)' }}
            className="cursor-pointer transition-transform active:scale-90 disabled:opacity-30 disabled:cursor-not-allowed"
            title="Transmit neural message to MERY"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
            </svg>
          </button>
        </form>

        {/* Action Row: 3-column Grid (Variation 11) */}
        <div className="action-row">
          {/* Left: Memory Utility Button */}
          <button
            className="utility-btn"
            id="btn_open_memory_hud"
            onClick={onOpenMemory}
            title="Open Permanent Memory Subsystem"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2v10m0 0l-3-3m3 3l3-3M5 22h14" />
            </svg>
            <span>Memory</span>
          </button>

          {/* Center: Mic Trigger (72px Circular Button with Green Aura) */}
          <button
            className={`mic-trigger ${state === 'speaking' || state === 'listening' ? 'active-mic' : ''}`}
            id="btn_dock_center_mic_connect"
            onClick={state === 'speaking' ? () => liveSession.handleUserInterrupt() : handleTogglePower}
            title={
              state === 'disconnected'
                ? 'Push to Synchronize'
                : state === 'speaking'
                ? 'Tap to Interrupt Speech'
                : 'Disconnect Live Voice Session'
            }
          >
            {state === 'connecting' ? (
              <Sparkles className="w-7 h-7 text-[#080809] animate-spin" />
            ) : state === 'speaking' ? (
              <Zap className="w-7 h-7 text-[#080809] fill-current animate-pulse" />
            ) : isMuted ? (
              <MicOff className="w-7 h-7 text-[#080809]" />
            ) : (
              <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3zM5 10v2a7 7 0 0 0 14 0v-2h-2v2a5 5 0 0 1-10 0v-2H5zM11 19v3h2v-3h-2z" />
              </svg>
            )}
          </button>

          {/* Right: Config Utility Button */}
          <button
            className="utility-btn"
            id="btn_open_config_hud"
            onClick={onOpenSettings}
            title="Open System Configuration & API Keys"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1V15a2 2 0 0 1-2-2 2 2 0 0 1 2-2v-.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2v.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
            <span>Config</span>
          </button>
        </div>

        {/* Quick Access Bar for Secondary Utilities (Tools, Screen Vision, Agent Dev, System Control) */}
        <div className="mt-3 pt-2 border-t border-white/[0.04] flex items-center justify-between text-[10px] font-telemetry text-white/50 px-1">
          <button
            id="btn_tools_shortcut"
            onClick={onOpenTools}
            className="hover:text-[#00ff66] flex items-center gap-1 transition-colors cursor-pointer"
            title="System Tools Nexus"
          >
            <Zap className="w-3 h-3 text-[#00ff66]" />
            <span>Tools</span>
          </button>
          {onOpenSystemControl && (
            <button
              id="btn_system_control_shortcut"
              onClick={onOpenSystemControl}
              className="hover:text-[#00ff66] flex items-center gap-1 transition-colors cursor-pointer"
              title="System Control Dashboard"
            >
              <SlidersHorizontal className="w-3 h-3" />
              <span>Control</span>
            </button>
          )}
          <button
            id="btn_dock_screen_share"
            onClick={async () => {
              if (isSharingScreen) {
                screenShareService.stopScreenShare();
              } else {
                const started = await screenShareService.startScreenShare();
                if (!started && screenShareService.isInIframe()) {
                  screenShareService.requestAllowModal();
                }
              }
            }}
            className={`flex items-center gap-1 transition-colors cursor-pointer ${
              isSharingScreen ? 'text-[#00ff66] font-bold' : 'hover:text-[#00ff66]'
            }`}
            title="Toggle Visual Screen Vision"
          >
            <Monitor className={`w-3 h-3 ${isSharingScreen ? 'text-[#00ff66]' : ''}`} />
            <span>Vision</span>
          </button>
          <button
            id="btn_dock_camera"
            onClick={async () => {
              if (isCameraActive) {
                cameraService.stopCamera();
              } else {
                await cameraService.startCamera('user');
              }
            }}
            className={`flex items-center gap-1 transition-colors cursor-pointer ${
              isCameraActive ? 'text-[#00ff66] font-bold' : 'hover:text-[#00ff66]'
            }`}
            title="Toggle Live Camera Mode"
          >
            {isCameraActive ? <Camera className="w-3 h-3 text-[#00ff66]" /> : <CameraOff className="w-3 h-3" />}
            <span>Camera</span>
          </button>
          {onOpenAgentDev && (
            <button
              id="btn_agents_shortcut"
              onClick={onOpenAgentDev}
              className="hover:text-[#00ff66] flex items-center gap-1 transition-colors cursor-pointer"
              title="Agent Dev Studio"
            >
              <Cpu className="w-3 h-3" />
              <span>Studio</span>
            </button>
          )}
          {onOpenEmotion && (
            <button
              id="btn_emotion_shortcut"
              onClick={onOpenEmotion}
              className="hover:text-[#00ff66] flex items-center gap-1 transition-colors cursor-pointer"
              title="Emotion Radar"
            >
              <Sparkles className="w-3 h-3" />
              <span>Radar</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
