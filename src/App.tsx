import React, { useState, useEffect, useRef } from 'react';
import { AuroraHologram } from './components/AuroraHologram';
import { MeryStatusBar } from './components/MeryStatusBar';
import { VoiceSubtitleStage } from './components/VoiceSubtitleStage';
import { VoiceActionNexus } from './components/VoiceActionNexus';
import { VoiceOrbStage } from './components/VoiceOrbStage';
import { ToolNexusDrawer } from './components/ToolNexusDrawer';
import { TranscriptDrawer } from './components/TranscriptDrawer';
import { MemoryDashboard } from './components/MemoryDashboard';
import { MeryIdentityModal } from './components/MeryIdentityModal';
import { SystemControlDashboard } from './components/SystemControlDashboard';
import { ActivityAwarenessPanel } from './components/ActivityAwarenessPanel';
import { EmotionRadarModal } from './components/EmotionRadarModal';
import { SafetyConfirmModal } from './components/SafetyConfirmModal';
import { ApiManagementModal } from './components/ApiManagementModal';
import { MissingKeyModal } from './components/MissingKeyModal';
import { voiceService } from './utils/audio';
import { systemController } from './utils/systemController';
import { activityMonitor } from './utils/activityMonitor';
import { proactiveEngine } from './utils/proactiveEngine';
import { emotionEngine } from './utils/emotionEngine';
import { providerManager } from './utils/providerManager';
import { logger } from './utils/logger';
import { toolManager } from './modules/ToolManager';
import { stateManager } from './modules/StateManager';
import { memoryService } from './memory/MemoryService';
import {
  ChatMessage,
  EmotionType,
  MeryMemory,
  MemoryCategory,
  SafetyActionRequest,
  MissingKeyProtocol,
  AcousticSignals,
} from './types';

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: 'm-init-1',
    role: 'model',
    content: "Hey, I'm MERY. What's going on today?",
    timestamp: 'Just now',
    emotion: 'warm',
  },
];

const INITIAL_MEMORIES: MeryMemory[] = [
  {
    id: 'mem-1',
    text: 'Enjoys deep voice conversations and genuine companionship.',
    category: 'observation',
    createdAt: 'Initial Sync',
  },
  {
    id: 'mem-2',
    text: 'Active in M4 luxury system with voice-native interaction.',
    category: 'insight',
    createdAt: 'System Bootstrap',
  },
  {
    id: 'mem-3',
    text: 'Prefers dark ambiance and focuses best with 432Hz ambient rain.',
    category: 'user_preference',
    createdAt: 'Initial Sync',
  },
];

export default function App() {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem('mery_chat_messages');
      return saved ? JSON.parse(saved) : INITIAL_MESSAGES;
    } catch {
      return INITIAL_MESSAGES;
    }
  });

  const [memories, setMemories] = useState<MeryMemory[]>(() => {
    try {
      const saved = localStorage.getItem('mery_memories');
      return saved ? JSON.parse(saved) : INITIAL_MEMORIES;
    } catch {
      return INITIAL_MEMORIES;
    }
  });

  const [currentEmotion, setCurrentEmotion] = useState<EmotionType>('warm');
  const [hologramState, setHologramState] = useState<'idle' | 'listening' | 'thinking' | 'speaking'>('idle');
  const [userLiveTranscript, setUserLiveTranscript] = useState<string>('');
  const [merySpokenSubtitle, setMerySpokenSubtitle] = useState<string>(
    "Hey, I'm MERY. What's on your mind today?"
  );

  const [isListening, setIsListening] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [voiceMuted, setVoiceMuted] = useState(false);
  const [fullDuplexActive, setFullDuplexActive] = useState(false);
  const [wakeWordMode, setWakeWordMode] = useState(false);
  const [isWokenUp, setIsWokenUp] = useState(true);
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);

  // Modals & Panels
  const [activeView, setActiveView] = useState<'live_orb' | 'hologram'>('live_orb');
  const [isToolNexusOpen, setIsToolNexusOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: string } | null>(null);
  const [isTranscriptOpen, setIsTranscriptOpen] = useState(false);
  const [isMemoryOpen, setIsMemoryOpen] = useState(false);
  const [isIdentityOpen, setIsIdentityOpen] = useState(false);
  const [isSystemControlOpen, setIsSystemControlOpen] = useState(false);
  const [isActivityOpen, setIsActivityOpen] = useState(false);
  const [isEmotionOpen, setIsEmotionOpen] = useState(false);
  const [isApiSettingsOpen, setIsApiSettingsOpen] = useState(false);
  const [missingKeyProtocol, setMissingKeyProtocol] = useState<MissingKeyProtocol | null>(null);
  const [safetyRequest, setSafetyRequest] = useState<SafetyActionRequest | null>(null);
  const [resonance, setResonance] = useState(96);

  const fullDuplexRef = useRef(fullDuplexActive);
  fullDuplexRef.current = fullDuplexActive;

  const wakeWordRef = useRef(wakeWordMode);
  wakeWordRef.current = wakeWordMode;

  const hologramStateRef = useRef(hologramState);
  hologramStateRef.current = hologramState;

  const isThinkingRef = useRef(isThinking);
  isThinkingRef.current = isThinking;

  // Sync toolManager safety handler with confirmation modal
  useEffect(() => {
    toolManager.setSafetyHandler((req) => {
      setSafetyRequest({
        id: req.id,
        actionType: 'wipe_cache',
        title: req.title,
        description: req.description,
        onConfirm: req.onConfirm,
        onCancel: req.onCancel,
      });
    });
  }, []);

  // Sync toast notifications from stateManager
  useEffect(() => {
    const unsub = stateManager.onNotification((msg, type) => {
      setToast({ message: msg, type: type || 'info' });
      setTimeout(() => {
        setToast((current) => (current?.message === msg ? null : current));
      }, 4000);
    });
    return () => unsub();
  }, []);

  // Sync missing key protocol trigger with provider manager
  useEffect(() => {
    providerManager.setMissingKeyHandler((protocol) => {
      setMissingKeyProtocol(protocol);
    });
  }, []);

  // Sync safety handler with system controller
  useEffect(() => {
    systemController.setSafetyHandler((req) => {
      setSafetyRequest(req);
    });
  }, []);

  // Sync emotion engine dominant state to UI
  useEffect(() => {
    const unsub = emotionEngine.subscribe((st) => {
      setCurrentEmotion(st.dominant);
    });
    return unsub;
  }, []);

  // Save messages to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('mery_chat_messages', JSON.stringify(messages));
    } catch {}
  }, [messages]);

  // Save memories to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('mery_memories', JSON.stringify(memories));
    } catch {}
  }, [memories]);

  // Setup Proactive Engine spontaneous initiator
  useEffect(() => {
    proactiveEngine.setTriggerHandler((thought, emotion) => {
      const proactiveMsg: ChatMessage = {
        id: `m-proactive-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        role: 'model',
        content: thought,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        emotion,
        proactiveTrigger: true,
      };

      setMessages((prev) => [...prev, proactiveMsg]);
      speakResponse(proactiveMsg);
    });
  }, [voiceMuted]);

  // Start Full Duplex Voice Engine
  const startFullDuplexEngine = () => {
    setFullDuplexActive(true);
    setIsWokenUp(!wakeWordRef.current);
    voiceService.playAcousticChime('listen_start');

    const started = voiceService.startFullDuplex({
      wakeWordEnabled: wakeWordRef.current,
      onInterimSpeech: (transcript) => {
        setUserLiveTranscript(transcript);
        setHologramState('listening');
      },
      onSpeechComplete: (finalText, analysis) => {
        setUserLiveTranscript(finalText);
        // Handle natural spontaneous short reactions
        if (analysis?.decisionMode === 'SHORT_REACTION' && analysis.reactionText) {
          const userMsg: ChatMessage = {
            id: `u-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            role: 'user',
            content: finalText.trim(),
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          };
          const reactMsg: ChatMessage = {
            id: `m-react-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            role: 'model',
            content: analysis.reactionText,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            emotion: analysis.detectedEmotion || 'excited',
          };
          setMessages((prev) => [...prev, userMsg, reactMsg]);
          speakResponse(reactMsg);
          return;
        }
        handleSendMessage(finalText, analysis?.acousticSignals);
      },
      onBackchannel: (backchannelText) => {
        // Natural, subtle conversational backchanneling (e.g. "Hmm...", "Mhm...", "Right...")
        voiceService.speakBrowserVoice(
          backchannelText,
          () => {
            setHologramState('listening');
          },
          () => {},
          { pitch: 1.08, rate: 1.05 }
        );
      },
      onBargeIn: () => {
        // User interrupted MERY while she was speaking!
        setPlayingMessageId(null);
        setHologramState('listening');
      },
      onWakeWordDetected: (wakePhrase, remaining) => {
        setIsWokenUp(true);
        setHologramState('listening');
        if (!remaining.trim()) {
          // User said only "Hey MERY" or "MERY"
          handleSendMessage("Hey MERY.");
        }
      },
      onRecognitionStateChange: (state) => {
        setHologramState((current) => {
          if (state === 'listening' && current !== 'speaking' && current !== 'thinking') {
            return 'idle';
          }
          return current;
        });
      },
      onError: (err) => {
        console.warn('Speech engine advisory:', err);
        if (err === 'not-allowed' || err === 'service-not-allowed') {
          setFullDuplexActive(false);
          setHologramState('idle');
        }
      },
    });

    if (!started) {
      setFullDuplexActive(false);
    }
  };

  const stopFullDuplexEngine = () => {
    voiceService.stopFullDuplex();
    setFullDuplexActive(false);
    setHologramState('idle');
    setPlayingMessageId(null);
    voiceService.playAcousticChime('listen_stop');
  };

  const handleToggleFullDuplex = () => {
    if (fullDuplexActive) {
      stopFullDuplexEngine();
    } else {
      startFullDuplexEngine();
    }
  };

  const handleToggleWakeWordMode = () => {
    const nextMode = !wakeWordMode;
    setWakeWordMode(nextMode);
    wakeWordRef.current = nextMode;
    setIsWokenUp(!nextMode);
    voiceService.updateFullDuplexConfig({ wakeWordEnabled: nextMode });
    voiceService.setWokenUp(!nextMode);
  };

  // One-time gesture listener to activate full-duplex immediately on first page interaction
  useEffect(() => {
    const handleFirstGesture = () => {
      if (!fullDuplexRef.current) {
        startFullDuplexEngine();
      }
    };

    window.addEventListener('click', handleFirstGesture, { once: true });
    window.addEventListener('touchstart', handleFirstGesture, { once: true });

    return () => {
      window.removeEventListener('click', handleFirstGesture);
      window.removeEventListener('touchstart', handleFirstGesture);
    };
  }, []);

  // Interrupt Speech
  const handleInterruptSpeech = () => {
    voiceService.stopAudio();
    voiceService.playAcousticChime('interruption');
    setPlayingMessageId(null);
    setHologramState('idle');
  };

  // Vocalize Response (Voice output)
  const speakResponse = async (msg: ChatMessage) => {
    if (voiceMuted) {
      setHologramState('idle');
      return;
    }

    setPlayingMessageId(msg.id);
    setHologramState('speaking');
    setMerySpokenSubtitle(msg.content);
    voiceService.playAcousticChime('mery_speaking');

    let isFinished = false;
    const onFinishSpeaking = () => {
      if (isFinished) return;
      isFinished = true;
      setPlayingMessageId(null);
      setHologramState((current) => {
        if (current === 'speaking') {
          return 'idle';
        }
        return current;
      });
    };

    const voiceMod = emotionEngine.getVoiceModulation();

    try {
      const voiceSettings = providerManager.getVoiceSettings();
      const providers = providerManager.getProviders();

      // 1. ElevenLabs Provider with Emotion-Aware prosody
      if (voiceSettings.provider === 'elevenlabs') {
        const elevenProv = providers.find((p) => p.id === 'elevenlabs');
        try {
          const res = await fetch('/api/tts/elevenlabs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              text: msg.content,
              voiceId: elevenProv?.voiceId || '21m00Tcm4TlvDq8ikWAM',
              apiKey: elevenProv?.apiKey,
              stability: voiceMod.stability,
              similarityBoost: voiceMod.similarityBoost,
              style: voiceMod.style,
              speed: voiceMod.rate,
            }),
          });
          const data = await res.json();
          if (res.ok && data?.audioBase64) {
            logger.log('INFO', 'tts', `Synthesized speech via ElevenLabs (${elevenProv?.voiceId || 'Rachel'}, stability=${voiceMod.stability}, style=${voiceMod.style})`);
            await voiceService.playEncodedAudio(data.audioBase64);
            onFinishSpeaking();
            return;
          } else if (data?.missingKeyProtocol) {
            providerManager.triggerMissingKeyProtocol(data.missingKeyProtocol);
          }
        } catch (err: any) {
          logger.log('WARNING', 'tts', `ElevenLabs generation error, using fallback: ${err?.message}`);
        }
      }

      // 2. Cartesia Provider with Emotion-Aware delivery tone & speed
      if (voiceSettings.provider === 'cartesia') {
        const cartesiaProv = providers.find((p) => p.id === 'cartesia');
        try {
          const res = await fetch('/api/tts/cartesia', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              text: msg.content,
              voiceId: cartesiaProv?.voiceId || 'a0e998e3-18a4-4bd6-8347-cc3907f3213c',
              apiKey: cartesiaProv?.apiKey,
              speed: voiceMod.rate,
              deliveryTone: voiceMod.deliveryTone,
            }),
          });
          const data = await res.json();
          if (res.ok && data?.audioBase64) {
            logger.log('INFO', 'tts', `Synthesized speech via Cartesia Sonic (tone=${voiceMod.deliveryTone})`);
            await voiceService.playEncodedAudio(data.audioBase64);
            onFinishSpeaking();
            return;
          } else if (data?.missingKeyProtocol) {
            providerManager.triggerMissingKeyProtocol(data.missingKeyProtocol);
          }
        } catch (err: any) {
          logger.log('WARNING', 'tts', `Cartesia generation error, using fallback: ${err?.message}`);
        }
      }

      // 3. Try Gemini TTS server endpoint
      if (voiceSettings.provider === 'gemini_tts' || voiceSettings.provider === 'local_tts') {
        const res = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: msg.content }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data?.audioBase64 && !data?.fallback) {
            await voiceService.playGeminiAudio(data.audioBase64, data.sampleRate || 24000);
            onFinishSpeaking();
            return;
          }
        }
      }
    } catch {
      // If network is offline or server unreachable, smoothly proceed to native voice
    }

    // High quality natural humanoid browser voice with multimodal emotional prosody modulation
    const voiceSettings = providerManager.getVoiceSettings();
    const adjustedParams = {
      pitch: voiceMod.pitch * voiceSettings.pitch,
      rate: voiceMod.rate * voiceSettings.speed,
      volume: voiceMod.volume,
    };
    logger.log('INFO', 'tts', `Vocalizing response via Native Humanoid Engine (pitch=${adjustedParams.pitch.toFixed(2)}, rate=${adjustedParams.rate.toFixed(2)}, tone=${voiceMod.deliveryTone})`);
    voiceService.speakBrowserVoice(
      msg.content,
      () => {
        setHologramState('speaking');
      },
      () => {
        onFinishSpeaking();
      },
      adjustedParams
    );
  };

  // Execute system action dispatched by MERY
  const executeSystemAction = async (action: { type: string; payload: any }) => {
    const { type, payload } = action;
    logger.log('INFO', 'system', `Executing dispatched action [${type}]`, payload);
    switch (type) {
      case 'OPEN_APP':
        if (payload?.app) systemController.launchApp(payload.app);
        break;
      case 'CLOSE_APP':
        if (payload?.app) systemController.closeApp(payload.app);
        break;
      case 'PLAY_MEDIA':
        systemController.playMedia(payload?.track);
        break;
      case 'PAUSE_MEDIA':
        systemController.pauseMedia();
        break;
      case 'SET_VOLUME':
        if (typeof payload?.level === 'number') systemController.setVolume(payload.level);
        break;
      case 'SET_BRIGHTNESS':
        if (typeof payload?.level === 'number') systemController.setBrightness(payload.level);
        break;
      case 'CREATE_REMINDER':
        if (payload?.title) systemController.addReminder(payload.title, `In ${payload.minutes || 30} mins`, payload.minutes || 30);
        break;
      case 'CREATE_NOTE':
        if (payload?.title) systemController.addNote(payload.title, payload.content || '');
        break;
      case 'SEARCH_WEB':
        if (payload?.query) {
          systemController.searchWeb(payload.query);
          // Real search fetch from /api/search
          fetch('/api/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: payload.query }),
          })
            .then((r) => r.json())
            .then((searchData) => {
              logger.log('INFO', 'search', `Web search retrieved for "${payload.query}" via ${searchData.provider || 'Web'}`, {
                sources: searchData.sources?.length,
                timeMs: searchData.searchTimeMs,
              });
            })
            .catch((e) => logger.log('WARNING', 'search', `Search execution warning: ${e?.message}`));
        }
        break;
      case 'CREATE_FILE':
        if (payload?.name) systemController.createFile(payload.name, 'document', payload.content || '');
        break;
      case 'DELETE_FILE':
        if (payload?.name) {
          const files = systemController.getFiles();
          const target = files.find((f) => f.name.toLowerCase().includes(payload.name.toLowerCase()));
          if (target) systemController.deleteFileWithSafety(target.id);
        }
        break;
      case 'TOGGLE_DEVICE':
        if (payload?.name) {
          const devices = systemController.getSmartDevices();
          const d = devices.find((dev) => dev.name.toLowerCase().includes(payload.name.toLowerCase()));
          if (d) systemController.toggleSmartDevice(d.id);
        }
        break;
      case 'SAVE_MEMORY':
        if (payload?.text) {
          memoryService.save({ text: payload.text, category: payload.category });
          handleAddMemory(payload.text, payload.category as MemoryCategory);
        }
        break;
      default:
        break;
    }
  };

  // Send Message (Voice or Quiet text)
  const handleSendMessage = async (text: string, acoustic?: AcousticSignals) => {
    if (!text.trim() || isThinkingRef.current) return;

    setUserLiveTranscript('');
    const userMsg: ChatMessage = {
      id: `u-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      role: 'user',
      content: text.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setIsThinking(true);
    setHologramState('thinking');

    // Multimodal emotional intelligence estimation
    const actCtx = activityMonitor.getContext();
    const emoAnalysis = emotionEngine.processMultimodalInput(
      text,
      acoustic,
      newHistory,
      { timeOfDay: actCtx.timeOfDay, focusMinutes: actCtx.focusMinutes }
    );

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newHistory.map((m) => ({ role: m.role, content: m.content })),
          userNote: memories.length > 0 ? memories.map((m) => m.text).join('; ') : undefined,
          emotionalContext: {
            primary: emoAnalysis.userEmotion.primary,
            confidence: emoAnalysis.userEmotion.confidence,
            intensity: emoAnalysis.userEmotion.intensity,
            trend: emoAnalysis.userEmotion.trend,
            userConcern: emoAnalysis.userEmotion.userConcern,
            topicContext: emoAnalysis.userEmotion.topicContext,
            strategy: emoAnalysis.strategy,
          },
        }),
      });

      let data: any = null;
      try {
        data = await res.json();
      } catch {
        data = null;
      }

      let responseContent = "Hey, MERY here. I'm right here with you.";
      let emotion: EmotionType = 'warm';

      if (data?.content) {
        responseContent = data.content;
      } else if (data?.companionResponse) {
        responseContent = data.companionResponse;
      }

      if (
        data?.emotion &&
        ['warm', 'curious', 'playful', 'thoughtful', 'supportive', 'inspired', 'concerned', 'excited'].includes(data.emotion)
      ) {
        emotion = data.emotion as EmotionType;
        emotionEngine.setDominantEmotion(emotion);
      }

      setCurrentEmotion(emotion);
      setResonance((prev) => Math.min(prev + 1, 99));

      const meryMsg: ChatMessage = {
        id: `m-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        role: 'model',
        content: responseContent,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        emotion,
        actionExecuted: data?.action ? { type: data.action.type, details: JSON.stringify(data.action.payload) } : undefined,
      };

      setMessages((prev) => [...prev, meryMsg]);
      setIsThinking(false);

      if (data?.retrievedMemories && data.retrievedMemories.length > 0) {
        logger.log(
          'INFO',
          'memory',
          `MERY recalled ${data.retrievedMemories.length} persistent long-term memories via hybrid ranker: ${data.retrievedMemories.map((m: any) => m.normalizedKey).join(', ')}`
        );
      }

      // Execute Action if server parsed one
      if (data?.action) {
        executeSystemAction(data.action);
      }

      // Auto-extract memory observation if meaningful and user expressed preference or goal
      const lower = text.toLowerCase();
      if (lower.includes('i love') || lower.includes('i prefer') || lower.includes('my goal') || lower.includes('i like')) {
        handleAddMemory(text, 'user_preference');
      }

      // Voice is default: always speak response
      speakResponse(meryMsg);
    } catch (error) {
      console.warn('Chat request notice:', error);
      setIsThinking(false);
      setHologramState('idle');

      const fallbackMsg: ChatMessage = {
        id: `m-err-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        role: 'model',
        content: "I'm right here with you in M4. Mind sharing that with me again?",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        emotion: 'supportive',
      };
      setMessages((prev) => [...prev, fallbackMsg]);
      speakResponse(fallbackMsg);
    }
  };

  // Proactive check-in when tapping Hologram core or via activity panel
  const handleTriggerProactive = async () => {
    if (hologramState === 'speaking') {
      handleInterruptSpeech();
      return;
    }
    if (hologramState === 'listening') {
      setHologramState('idle');
      return;
    }

    setHologramState('thinking');
    await proactiveEngine.triggerManualInitiation(messages.slice(-3).map((m) => m.content));
  };

  // Clear Chat History
  const handleClearChat = () => {
    voiceService.stopAudio();
    setPlayingMessageId(null);
    setHologramState('idle');
    setMessages([
      {
        id: `m-reset-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        role: 'model',
        content: "Hey, I'm MERY. Ready for a clean slate. What's on your mind?",
        timestamp: 'Just now',
        emotion: 'warm',
      },
    ]);
    setMerySpokenSubtitle("Hey, I'm MERY. Ready for a clean slate. What's on your mind?");
  };

  const handleAddMemory = (text: string, category: MemoryCategory = 'user_preference') => {
    const newMem: MeryMemory = {
      id: `mem-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      text,
      category,
      createdAt: 'Just now',
    };
    setMemories((prev) => [newMem, ...prev]);
  };

  const handleDeleteMemory = (id: string) => {
    setMemories((prev) => prev.filter((m) => m.id !== id));
  };

  return (
    <div className="min-h-screen bg-[#07060D] text-[#F3EFFA] flex flex-col selection:bg-[#9D7BFF]/30 selection:text-white relative overflow-x-hidden">
      {/* Aurora Rose Ambient Background Glows */}
      <div className="fixed top-0 left-1/4 w-96 h-96 rounded-full bg-[#9D7BFF]/12 blur-[120px] pointer-events-none" />
      <div className="fixed top-1/3 right-10 w-96 h-96 rounded-full bg-[#E7B7A5]/12 blur-[130px] pointer-events-none" />
      <div className="fixed bottom-10 left-10 w-80 h-80 rounded-full bg-[#C6A0FF]/10 blur-[140px] pointer-events-none" />

      {/* Toast Notification HUD */}
      {toast && (
        <div className="fixed top-16 right-4 z-50 px-4 py-2 rounded-2xl bg-slate-900/90 border border-purple-500/40 text-xs text-white shadow-2xl backdrop-blur-xl flex items-center gap-2 animate-fade-in">
          <span
            className={`w-2 h-2 rounded-full ${
              toast.type === 'error'
                ? 'bg-rose-400'
                : toast.type === 'warning'
                ? 'bg-amber-400'
                : toast.type === 'success'
                ? 'bg-emerald-400'
                : 'bg-cyan-400'
            }`}
          />
          <span>{toast.message}</span>
        </div>
      )}

      {/* M4 Status Bar */}
      <MeryStatusBar
        resonance={resonance}
        emotion={currentEmotion}
        voiceEnabled={!voiceMuted}
        onToggleVoice={() => setVoiceMuted(!voiceMuted)}
        onOpenMemory={() => setIsMemoryOpen(true)}
        onOpenIdentity={() => setIsIdentityOpen(true)}
        onOpenSystemControl={() => setIsSystemControlOpen(true)}
        onOpenActivity={() => setIsActivityOpen(true)}
        onOpenEmotion={() => setIsEmotionOpen(true)}
        onOpenApiSettings={() => setIsApiSettingsOpen(true)}
      />

      {/* View Mode Selector */}
      <div className="w-full flex justify-center py-2 px-4 z-20">
        <div className="inline-flex items-center p-1 rounded-2xl bg-slate-900/80 border border-white/10 backdrop-blur-lg shadow-lg">
          <button
            id="view_live_orb_btn"
            onClick={() => setActiveView('live_orb')}
            className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              activeView === 'live_orb'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Live Voice Orb (Gemini Live)
          </button>
          <button
            id="view_hologram_btn"
            onClick={() => setActiveView('hologram')}
            className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              activeView === 'hologram'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Holographic Console
          </button>
        </div>
      </div>

      {/* Primary Experience Stage */}
      {activeView === 'live_orb' ? (
        <main className="flex-1 flex flex-col justify-center max-w-4xl w-full mx-auto relative z-10 px-2 sm:px-4">
          <VoiceOrbStage
            onOpenSettings={() => setIsApiSettingsOpen(true)}
            onOpenTools={() => setIsToolNexusOpen(true)}
          />
        </main>
      ) : (
        <main className="flex-1 flex flex-col justify-between max-w-4xl w-full mx-auto relative z-10 px-2 sm:px-4">
          {/* Holographic Presence Core */}
          <section aria-label="MERY Holographic Presence" className="pt-2">
            <AuroraHologram
              state={hologramState}
              emotion={currentEmotion}
              onClickPrompt={handleTriggerProactive}
              isAudioPlaying={Boolean(playingMessageId)}
            />
          </section>

          {/* Live Spoken Subtitles & Feedback Stage */}
          <section aria-label="Spoken Subtitles">
            <VoiceSubtitleStage
              state={hologramState}
              emotion={currentEmotion}
              userLiveTranscript={userLiveTranscript}
              merySpokenSubtitle={merySpokenSubtitle}
              onOpenHistory={() => setIsTranscriptOpen(true)}
              messageCount={messages.length}
              fullDuplexActive={fullDuplexActive}
              wakeWordMode={wakeWordMode}
            />
          </section>

          {/* Primary Voice Action Nexus (Centerpiece Control Hub) */}
          <section aria-label="Voice Interaction Hub">
            <VoiceActionNexus
              state={hologramState}
              emotion={currentEmotion}
              fullDuplexActive={fullDuplexActive}
              onToggleFullDuplex={handleToggleFullDuplex}
              wakeWordMode={wakeWordMode}
              onToggleWakeWordMode={handleToggleWakeWordMode}
              isWokenUp={isWokenUp}
              onInterruptSpeech={handleInterruptSpeech}
              onTriggerSpokenPrompt={(prompt) => handleSendMessage(prompt)}
              onOpenTextInput={() => setIsTranscriptOpen(true)}
              voiceMuted={voiceMuted}
              onToggleVoiceMuted={() => setVoiceMuted(!voiceMuted)}
              onStartFullDuplex={startFullDuplexEngine}
            />
          </section>
        </main>
      )}

      {/* Supporting Conversation History & Quiet Mode Drawer */}
      <TranscriptDrawer
        isOpen={isTranscriptOpen}
        onClose={() => setIsTranscriptOpen(false)}
        messages={messages}
        onPlayVoice={speakResponse}
        playingMessageId={playingMessageId}
        onSendMessage={handleSendMessage}
        onClearChat={handleClearChat}
        isThinking={isThinking}
      />

      {/* MERY Persistent Memory Subsystem Dashboard (SQLite + Vector Index) */}
      <MemoryDashboard
        isOpen={isMemoryOpen}
        onClose={() => setIsMemoryOpen(false)}
        resonance={resonance}
      />

      {/* Identity & Mission Modal */}
      <MeryIdentityModal
        isOpen={isIdentityOpen}
        onClose={() => setIsIdentityOpen(false)}
      />

      {/* System Control Dashboard */}
      <SystemControlDashboard
        isOpen={isSystemControlOpen}
        onClose={() => setIsSystemControlOpen(false)}
        onNotifyMeryAction={(act) => {
          // Speak quick acknowledgment
          handleSendMessage(`MERY, status report on: ${act}`);
        }}
      />

      {/* Activity Awareness & Proactive Panel */}
      <ActivityAwarenessPanel
        isOpen={isActivityOpen}
        onClose={() => setIsActivityOpen(false)}
        onTriggerProactive={handleTriggerProactive}
      />

      {/* Emotional Resonance Radar */}
      <EmotionRadarModal
        isOpen={isEmotionOpen}
        onClose={() => setIsEmotionOpen(false)}
        onSetDominantEmotion={(emo) => {
          emotionEngine.setDominantEmotion(emo);
          setCurrentEmotion(emo);
        }}
      />

      {/* M4 Safety Confirmation Modal */}
      <SafetyConfirmModal
        request={safetyRequest}
        onClose={() => setSafetyRequest(null)}
      />

      {/* API & External Provider Integrations Modal */}
      <ApiManagementModal
        isOpen={isApiSettingsOpen}
        onClose={() => setIsApiSettingsOpen(false)}
      />

      {/* Modular Tool Nexus & Telemetry Drawer */}
      <ToolNexusDrawer
        isOpen={isToolNexusOpen}
        onClose={() => setIsToolNexusOpen(false)}
      />

      {/* Protocol Missing Key Modal */}
      <MissingKeyModal
        protocol={missingKeyProtocol}
        onClose={() => setMissingKeyProtocol(null)}
        onOpenApiSettings={() => setIsApiSettingsOpen(true)}
      />
    </div>
  );
}

