import React, { useEffect, useRef, useState } from 'react';
import {
  Mic,
  MicOff,
  Power,
  Sparkles,
  Zap,
  Globe,
  Search,
  CheckCircle2,
  Clock,
  Radio,
  Sliders,
  Shield,
  Volume2,
  VolumeX,
  Languages,
} from 'lucide-react';
import { AssistantState, ConversationState, ToolExecutionRecord, TurnTakingAnalysis } from '../types';
import { stateManager, SpokenLanguage } from '../modules/StateManager';
import { audioStreamer } from '../modules/AudioStreamer';
import { audioPlayer } from '../modules/AudioPlayer';
import { liveSession } from '../modules/LiveSession';

interface VoiceOrbStageProps {
  onOpenSettings: () => void;
  onOpenTools: () => void;
}

export const VoiceOrbStage: React.FC<VoiceOrbStageProps> = ({
  onOpenSettings,
  onOpenTools,
}) => {
  const [state, setState] = useState<AssistantState>(stateManager.getState());
  const [convState, setConvState] = useState<ConversationState>(stateManager.getConversationState());
  const [analysis, setAnalysis] = useState<TurnTakingAnalysis | null>(stateManager.getLastAnalysis());
  const [isMuted, setIsMuted] = useState<boolean>(stateManager.getIsMuted());
  const [activeTool, setActiveTool] = useState<ToolExecutionRecord | null>(
    stateManager.getActiveTool()
  );
  const [latency, setLatency] = useState<number>(stateManager.getLatency());
  const [language, setLanguage] = useState<SpokenLanguage>(stateManager.getLanguage());

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Subscribe to state changes
  useEffect(() => {
    const unsubState = stateManager.onStateChange((newState) => {
      setState(newState);
    });

    const unsubConv = stateManager.onConversationStateChange((newConvState, newAnalysis) => {
      setConvState(newConvState);
      if (newAnalysis) setAnalysis(newAnalysis);
    });

    const unsubTool = stateManager.onToolUpdate((tool) => {
      setActiveTool(tool);
    });

    const unsubLang = stateManager.onLanguageChange((newLang) => {
      setLanguage(newLang);
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
      clearInterval(interval);
    };
  }, []);

  // Real-time canvas audio visualizer loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let phase = 0;

    const render = () => {
      animationFrameRef.current = requestAnimationFrame(render);
      phase += 0.05;

      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      let freqData: Uint8Array;
      let isInput = false;

      if (state === 'speaking') {
        freqData = audioPlayer.getFrequencyData();
      } else if (state === 'listening' && !isMuted) {
        freqData = audioStreamer.getFrequencyData();
        isInput = true;
      } else {
        freqData = new Uint8Array(32);
      }

      const barCount = 32;
      const barWidth = (width / barCount) * 0.7;
      const spacing = (width / barCount) * 0.3;
      const centerY = height / 2;

      for (let i = 0; i < barCount; i++) {
        const val = freqData[i] || 0;
        const normalized = val / 255;
        // Idle gentle wave breathing if active but silent
        const idleWave =
          state === 'listening' || state === 'connecting'
            ? Math.sin(phase + i * 0.3) * 6
            : 0;

        const barHeight = Math.max(3, normalized * (height * 0.42) + idleWave);
        const x = i * (barWidth + spacing) + spacing / 2;

        const grad = ctx.createLinearGradient(0, centerY - barHeight, 0, centerY + barHeight);
        if (state === 'speaking') {
          grad.addColorStop(0, 'rgba(236, 72, 153, 0.85)'); // Rose/Pink
          grad.addColorStop(0.5, 'rgba(168, 85, 247, 0.95)'); // Purple
          grad.addColorStop(1, 'rgba(59, 130, 246, 0.85)'); // Blue
        } else if (state === 'listening') {
          grad.addColorStop(0, 'rgba(147, 51, 234, 0.8)');
          grad.addColorStop(1, 'rgba(6, 182, 212, 0.85)');
        } else if (state === 'connecting') {
          grad.addColorStop(0, 'rgba(14, 165, 233, 0.8)');
          grad.addColorStop(1, 'rgba(99, 102, 241, 0.8)');
        } else {
          grad.addColorStop(0, 'rgba(100, 116, 139, 0.25)');
          grad.addColorStop(1, 'rgba(71, 85, 105, 0.1)');
        }

        ctx.fillStyle = grad;

        // Rounded bar top and bottom
        const radius = barWidth / 2;
        ctx.beginPath();
        ctx.roundRect(x, centerY - barHeight, barWidth, barHeight * 2, radius);
        ctx.fill();
      }
    };

    render();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [state, isMuted]);

  const handleOrbClick = async () => {
    if (state === 'disconnected') {
      await liveSession.connect();
    } else if (state === 'speaking') {
      // Instant user tap-to-interrupt
      liveSession.handleUserInterrupt();
    } else if (state === 'listening') {
      // Tap while listening toggles mute or disconnect option
      stateManager.notify('Listening to you — speak naturally', 'info');
    }
  };

  const handleTogglePower = async () => {
    if (state === 'disconnected') {
      await liveSession.connect();
    } else {
      liveSession.disconnect();
    }
  };

  const handleToggleMute = () => {
    const nextMute = !isMuted;
    audioStreamer.setMuted(nextMute);
    stateManager.setMuted(nextMute);
    setIsMuted(nextMute);
  };

  const handleToggleLanguage = (newLang?: SpokenLanguage) => {
    const next = newLang || (language === 'gu-IN' ? 'en-US' : 'gu-IN');
    stateManager.setLanguage(next);
    if (liveSession.isConnected()) {
      const prompt =
        next === 'gu-IN'
          ? 'કૃપા કરીને હવેથી મારી સાથે ગુજરાતીમાં વાત કરો. (Please speak in Gujarati now.)'
          : 'Please converse with me in English now.';
      liveSession.sendTextMessage(prompt);
    }
  };

  const handleQuickPrompt = async (prompt: string, lang: SpokenLanguage) => {
    stateManager.setLanguage(lang);
    if (!liveSession.isConnected()) {
      const connected = await liveSession.connect();
      if (connected) {
        setTimeout(() => {
          liveSession.sendTextMessage(prompt);
        }, 600);
      }
    } else {
      liveSession.sendTextMessage(prompt);
    }
  };

  return (
    <div
      id="voice_orb_stage"
      className="relative flex flex-col items-center justify-between w-full h-full max-w-4xl mx-auto px-4 py-6 select-none"
    >
      {/* Top Status HUD */}
      <div
        id="top_status_hud"
        className="w-full flex items-center justify-between px-4 py-2.5 rounded-2xl bg-slate-900/60 backdrop-blur-xl border border-white/10 shadow-2xl z-20"
      >
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                state === 'speaking'
                  ? 'bg-rose-400 animate-pulse'
                  : state === 'listening'
                  ? 'bg-emerald-400 animate-ping'
                  : state === 'connecting'
                  ? 'bg-cyan-400 animate-spin'
                  : 'bg-slate-500'
              }`}
            />
            <span
              className={`absolute w-2.5 h-2.5 rounded-full ${
                state === 'speaking'
                  ? 'bg-rose-400'
                  : state === 'listening'
                  ? 'bg-emerald-400'
                  : state === 'connecting'
                  ? 'bg-cyan-400'
                  : 'bg-slate-500'
              }`}
            />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-semibold tracking-wider text-slate-300 uppercase">
              MERY Live Link
            </span>
            <span className="text-[11px] text-slate-400">
              {state === 'speaking' && 'MERY is speaking'}
              {state === 'listening' && 'Listening (PCM16 16kHz)'}
              {state === 'connecting' && 'Establishing Link...'}
              {state === 'disconnected' && 'Standby / Offline'}
            </span>
          </div>
        </div>

        {/* Live Metrics & Quick Actions */}
        <div className="flex items-center gap-2">
          {/* Gujarati / English Spoken Language Toggle */}
          <button
            id="btn_toggle_language"
            onClick={() => handleToggleLanguage()}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
              language === 'gu-IN'
                ? 'bg-gradient-to-r from-amber-500/25 to-purple-600/25 text-amber-200 border-amber-400/40 shadow-md shadow-amber-500/10'
                : 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/10'
            }`}
            title="Toggle Live Language: ગુજરાતી (Gujarati) / English"
          >
            <Languages className="w-3.5 h-3.5 text-amber-400" />
            <span className="tracking-wide">
              {language === 'gu-IN' ? 'ગુજરાતી (GU)' : 'English (EN)'}
            </span>
          </button>

          {state !== 'disconnected' && (
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] text-slate-300">
              <Radio className="w-3 h-3 text-cyan-400 animate-pulse" />
              <span>{latency}ms</span>
            </div>
          )}

          <button
            id="open_tools_btn"
            onClick={onOpenTools}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs transition-colors border border-white/5"
            title="Tool & Action Nexus"
          >
            <Zap className="w-3.5 h-3.5 text-purple-400" />
            <span className="hidden sm:inline">Tools</span>
          </button>

          <button
            id="open_settings_btn"
            onClick={onOpenSettings}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs transition-colors border border-white/5"
            title="API & Voice Configuration"
          >
            <Sliders className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Settings</span>
          </button>
        </div>
      </div>

      {/* Active Tool Execution Pill (Animated) */}
      {activeTool && (
        <div
          id="active_tool_pill"
          className="mt-3 px-4 py-2 rounded-full bg-purple-950/80 border border-purple-500/40 backdrop-blur-md flex items-center gap-2 shadow-lg shadow-purple-950/50 animate-bounce"
        >
          {activeTool.name === 'openWebsite' && <Globe className="w-4 h-4 text-cyan-400 animate-spin" />}
          {activeTool.name === 'searchWeb' && <Search className="w-4 h-4 text-amber-400 animate-pulse" />}
          {activeTool.name === 'getSystemStatus' && <Clock className="w-4 h-4 text-emerald-400" />}
          {activeTool.name === 'executeDangerousAction' && <Shield className="w-4 h-4 text-rose-400 animate-pulse" />}
          {activeTool.status === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          ) : (
            <Sparkles className="w-4 h-4 text-purple-400 animate-spin" />
          )}
          <span className="text-xs text-purple-100 font-medium">
            {activeTool.status === 'running' && `Executing ${activeTool.name}...`}
            {activeTool.status === 'success' && `Completed ${activeTool.name}`}
            {activeTool.status === 'failed' && `Failed ${activeTool.name}`}
          </span>
        </div>
      )}

      {/* Central Voice Orb Presence */}
      <div
        id="central_presence_container"
        className="relative flex flex-col items-center justify-center my-auto py-8"
      >
        {/* Multi-layered Animated Glow Rings */}
        <div className="relative flex items-center justify-center">
          {/* Outermost Pulsing Ambient Field */}
          <div
            className={`absolute w-72 h-72 sm:w-88 sm:h-88 rounded-full blur-3xl transition-all duration-700 pointer-events-none ${
              state === 'speaking'
                ? 'bg-gradient-to-tr from-rose-500/30 via-purple-500/30 to-blue-500/30 scale-125 animate-pulse'
                : state === 'listening'
                ? 'bg-gradient-to-tr from-purple-600/20 via-cyan-500/20 to-emerald-500/20 scale-105'
                : state === 'connecting'
                ? 'bg-cyan-500/25 scale-110 animate-spin'
                : 'bg-slate-700/10 scale-90'
            }`}
          />

          {/* Secondary Harmonic Ring */}
          <div
            className={`absolute w-56 h-56 sm:w-72 sm:h-72 rounded-full border border-white/10 transition-all duration-500 pointer-events-none ${
              state === 'speaking'
                ? 'border-rose-400/40 scale-110 shadow-lg shadow-rose-500/20'
                : state === 'listening'
                ? 'border-purple-400/30 scale-100 shadow-lg shadow-purple-500/20 animate-pulse'
                : state === 'connecting'
                ? 'border-cyan-400/40 animate-ping'
                : 'border-white/5'
            }`}
          />

          {/* The Main Voice Orb Button */}
          <button
            id="mery_voice_orb_interactive"
            onClick={handleOrbClick}
            className={`group relative w-48 h-48 sm:w-60 sm:h-60 rounded-full flex flex-col items-center justify-center cursor-pointer transition-all duration-500 focus:outline-none focus:ring-4 focus:ring-purple-500/30 ${
              state === 'speaking'
                ? 'bg-gradient-to-br from-purple-900/90 via-rose-900/80 to-indigo-950/90 shadow-2xl shadow-rose-600/40 hover:scale-105 active:scale-95 border-2 border-rose-400/60'
                : state === 'listening'
                ? 'bg-gradient-to-br from-slate-900/90 via-purple-950/80 to-cyan-950/90 shadow-2xl shadow-purple-600/30 hover:scale-105 active:scale-95 border-2 border-cyan-400/40'
                : state === 'connecting'
                ? 'bg-gradient-to-br from-slate-900/90 via-cyan-950/80 to-blue-950/90 shadow-2xl shadow-cyan-500/30 border-2 border-cyan-400/60'
                : 'bg-gradient-to-br from-slate-900/90 via-slate-800/80 to-slate-950/90 shadow-xl shadow-black/60 hover:scale-105 active:scale-95 border-2 border-white/10'
            }`}
            title={
              state === 'disconnected'
                ? 'Click to Connect MERY'
                : state === 'speaking'
                ? 'Click to Interrupt MERY'
                : 'Listening to you'
            }
          >
            {/* Morphing Inner Glow Canvas/Disc */}
            <div
              className={`absolute inset-3 rounded-full opacity-70 blur-md transition-all duration-700 ${
                state === 'speaking'
                  ? 'bg-gradient-to-tr from-pink-500 via-rose-400 to-indigo-400 animate-pulse'
                  : state === 'listening'
                  ? 'bg-gradient-to-tr from-cyan-400 via-purple-500 to-indigo-500'
                  : state === 'connecting'
                  ? 'bg-gradient-to-tr from-cyan-400 to-blue-600 animate-spin'
                  : 'bg-slate-700/40'
              }`}
            />

            {/* Core Icon & Status Text */}
            <div className="relative z-10 flex flex-col items-center justify-center text-center px-4">
              {state === 'disconnected' && (
                <>
                  <Power className="w-10 h-10 sm:w-12 sm:h-12 text-slate-300 mb-2 group-hover:text-white transition-colors" />
                  <span className="text-sm sm:text-base font-semibold text-white tracking-wide">
                    Connect MERY
                  </span>
                  <span className="text-[11px] text-slate-400 mt-1">
                    Tap to start live voice
                  </span>
                </>
              )}

              {state === 'connecting' && (
                <>
                  <Sparkles className="w-10 h-10 sm:w-12 sm:h-12 text-cyan-300 animate-spin mb-2" />
                  <span className="text-sm sm:text-base font-semibold text-cyan-200">
                    Linking...
                  </span>
                  <span className="text-[11px] text-cyan-300/70 mt-1">
                    Quantum Live Audio
                  </span>
                </>
              )}

              {state === 'listening' && (
                <>
                  {isMuted ? (
                    <MicOff className="w-10 h-10 sm:w-12 sm:h-12 text-amber-400 mb-2 animate-pulse" />
                  ) : (
                    <Mic className="w-10 h-10 sm:w-12 sm:h-12 text-cyan-300 mb-2 animate-bounce" />
                  )}
                  <span className="text-sm sm:text-base font-semibold text-white tracking-wide">
                    {isMuted
                      ? 'Muted'
                      : convState === 'USER_SPEAKING'
                      ? 'You Speaking...'
                      : convState === 'WAITING_FOR_CONTINUATION'
                      ? 'Holding Floor...'
                      : convState === 'SILENT'
                      ? 'Comfortable Silence'
                      : convState === 'BACKCHANNELING'
                      ? 'Listening...'
                      : 'Listening...'}
                  </span>
                  <span className="text-[11px] text-slate-300 mt-1">
                    {isMuted
                      ? 'Tap unmute below'
                      : convState === 'WAITING_FOR_CONTINUATION'
                      ? 'Take your time, finishing thought'
                      : convState === 'SILENT'
                      ? 'Deep focus & silence respected'
                      : 'Speak naturally like with a friend'}
                  </span>
                </>
              )}

              {state === 'speaking' && (
                <>
                  <Volume2 className="w-10 h-10 sm:w-12 sm:h-12 text-rose-300 mb-2 animate-pulse" />
                  <span className="text-sm sm:text-base font-semibold text-white tracking-wide">
                    MERY Speaking
                  </span>
                  <span className="text-[11px] text-rose-200/90 mt-1 font-medium bg-rose-950/60 px-2 py-0.5 rounded-full border border-rose-500/30">
                    Tap or speak to interrupt
                  </span>
                </>
              )}
            </div>
          </button>
        </div>

        {/* Human Conversation Mode Active State Badge */}
        <div
          id="human_mode_state_pill"
          className="flex items-center gap-2 mt-5 px-3 py-1 rounded-full bg-slate-900/80 border border-white/10 text-[11px] text-slate-300 backdrop-blur-md shadow-lg"
        >
          <span
            className={`w-2 h-2 rounded-full ${
              convState === 'USER_SPEAKING'
                ? 'bg-cyan-400 animate-ping'
                : convState === 'WAITING_FOR_CONTINUATION'
                ? 'bg-purple-400 animate-pulse'
                : convState === 'SILENT'
                ? 'bg-emerald-400'
                : state === 'speaking'
                ? 'bg-rose-400 animate-pulse'
                : 'bg-indigo-400'
            }`}
          />
          <span className="font-medium text-white/90">Human Conversation Mode</span>
          <span className="text-slate-600">•</span>
          <span className="text-cyan-400 font-mono tracking-tight">
            {convState === 'USER_SPEAKING' && 'Active speech'}
            {convState === 'WAITING_FOR_CONTINUATION' && 'Waiting for continuation'}
            {convState === 'BACKCHANNELING' && 'Backchanneling'}
            {convState === 'SILENT' && 'Comfortable silence'}
            {convState === 'EVALUATING_TURN' && 'Evaluating turn'}
            {convState === 'INTERRUPTED' && 'Barge-in honored'}
            {convState === 'SPEAKING' && 'Vocalizing'}
            {(convState === 'LISTENING' || convState === 'IDLE') && 'Continuous session'}
          </span>
        </div>

        {/* Real-time Waveform Canvas Visualizer */}
        <div className="w-full max-w-xs sm:max-w-md h-16 mt-6 flex items-center justify-center">
          <canvas
            ref={canvasRef}
            width={340}
            height={64}
            className="w-full h-full"
          />
        </div>

        {/* Quick Conversational Gujarati Sparks & Starter Chips */}
        <div
          id="live_language_quick_chips"
          className="flex flex-wrap items-center justify-center gap-2 mt-4 px-2 max-w-xl z-10"
        >
          <button
            onClick={() => handleQuickPrompt('ગુજરાતીમાં બોલો', 'gu-IN')}
            className="px-3 py-1.5 rounded-full text-xs font-medium bg-amber-500/15 hover:bg-amber-500/25 text-amber-200 border border-amber-500/35 backdrop-blur-md transition-all active:scale-95 shadow-md flex items-center gap-1.5"
            title="Ask MERY to speak in Gujarati"
          >
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>ગુજરાતીમાં બોલો</span>
          </button>
          <button
            onClick={() => handleQuickPrompt('કેમ છો, મેરી? તમારી સાથે વાત કરીને આનંદ થયો.', 'gu-IN')}
            className="px-3 py-1.5 rounded-full text-xs font-medium bg-purple-500/15 hover:bg-purple-500/25 text-purple-200 border border-purple-500/35 backdrop-blur-md transition-all active:scale-95 shadow-md"
            title="Friendly Gujarati greeting"
          >
            <span>કેમ છો, મેરી?</span>
          </button>
          <button
            onClick={() => handleQuickPrompt('આજનો દિવસ કેવો રહેશે? મને કહો.', 'gu-IN')}
            className="px-3 py-1.5 rounded-full text-xs font-medium bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-200 border border-cyan-500/35 backdrop-blur-md transition-all active:scale-95 shadow-md"
            title="Ask how the day will be in Gujarati"
          >
            <span>આજનો દિવસ કેવો રહેશે?</span>
          </button>
          <button
            onClick={() => handleQuickPrompt('Let’s converse in English now.', 'en-US')}
            className="px-2.5 py-1.5 rounded-full text-[11px] font-medium bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 backdrop-blur-md transition-all active:scale-95"
            title="Switch back to English conversation"
          >
            <span>English</span>
          </button>
        </div>
      </div>

      {/* Bottom Glassmorphic Control Dock */}
      <div
        id="bottom_control_dock"
        className="w-full flex items-center justify-between px-5 py-3 rounded-2xl bg-slate-900/70 backdrop-blur-xl border border-white/10 shadow-2xl z-20"
      >
        {/* Power Connect/Disconnect */}
        <button
          id="dock_power_toggle"
          onClick={handleTogglePower}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium transition-all ${
            state === 'disconnected'
              ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/30'
              : 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30'
          }`}
        >
          <Power className="w-4 h-4" />
          <span>{state === 'disconnected' ? 'Start Session' : 'Disconnect'}</span>
        </button>

        {/* Interrupt Button (Visible when speaking) */}
        {state === 'speaking' && (
          <button
            id="dock_interrupt_btn"
            onClick={() => liveSession.handleUserInterrupt()}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-semibold transition-all animate-pulse"
          >
            <Zap className="w-4 h-4 text-amber-400" />
            <span>Interrupt MERY</span>
          </button>
        )}

        {/* Mute Mic Toggle */}
        <div className="flex items-center gap-2">
          {state !== 'disconnected' && (
            <button
              id="dock_mute_toggle"
              onClick={handleToggleMute}
              className={`p-2.5 rounded-xl border text-xs transition-all ${
                isMuted
                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                  : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-300'
              }`}
              title={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
            >
              {isMuted ? <MicOff className="w-4 h-4 text-amber-400" /> : <Mic className="w-4 h-4 text-slate-300" />}
            </button>
          )}

          {/* Master Volume Indicator */}
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-300 text-xs">
            <Volume2 className="w-4 h-4 text-purple-400" />
            <span>24kHz PCM</span>
          </div>
        </div>
      </div>
    </div>
  );
};
