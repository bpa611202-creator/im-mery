import React, { useState, useEffect, useRef } from 'react';
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
import { ScreenAllowModal } from './components/ScreenAllowModal';
import { AgentDevStudioModal } from './components/AgentDevStudioModal';
import { AnimeAvatar3D } from './components/AnimeAvatar3D';
import { liveSession } from './modules/LiveSession';
import { voiceService } from './utils/audio';
import { systemController } from './utils/systemController';
import { activityMonitor } from './utils/activityMonitor';
import { proactiveEngine } from './utils/proactiveEngine';
import { emotionEngine } from './utils/emotionEngine';
import { providerManager } from './utils/providerManager';
import { logger } from './utils/logger';
import { toolManager } from './modules/ToolManager';
import { stateManager } from './modules/StateManager';
import { screenShareService } from './modules/ScreenShareService';
import { memoryService } from './memory/MemoryService';
import { memoryManager } from './modules/MemoryManager';
import { cameraService } from './modules/CameraService';
import { locationService } from './utils/locationService';
import { detectSpokenLanguage } from './utils/languageDetector';
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
    text: 'Active in system with voice-native interaction.',
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
  const [isScreenAllowOpen, setIsScreenAllowOpen] = useState(false);
  const [screenAllowReason, setScreenAllowReason] = useState<string | null>(null);
  const [isAgentDevOpen, setIsAgentDevOpen] = useState(false);
  const [resonance, setResonance] = useState(96);
  // Chat text visibility configuration (showChatText = false by default for voice-first experience)
  const [showChatText, setShowChatText] = useState<boolean>(() => {
    try {
      return localStorage.getItem('mery_show_chat_text') === 'true';
    } catch {
      return false;
    }
  });

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

  // Sync screen share allow modal handler
  useEffect(() => {
    screenShareService.setAllowModalHandler((reason) => {
      setScreenAllowReason(reason || null);
      setIsScreenAllowOpen(true);
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

  // Sync stateManager voice states to hologramState for reactive 3D animation
  useEffect(() => {
    const unsubState = stateManager.onStateChange((st) => {
      if (st === 'speaking') setHologramState('speaking');
      else if (st === 'listening') setHologramState('listening');
      else if (st === 'connecting') setHologramState('thinking');
      else setHologramState('idle');
    });

    const unsubConv = stateManager.onConversationStateChange((conv) => {
      if (conv === 'SPEAKING') setHologramState('speaking');
      else if (conv === 'EVALUATING_TURN' || conv === 'RESPONDING') setHologramState('thinking');
      else if (conv === 'USER_SPEAKING' || conv === 'LISTENING') setHologramState('listening');
    });

    return () => {
      unsubState();
      unsubConv();
    };
  }, []);

  // FIX: keep the on-screen spoken subtitle in sync with real-time LIVE voice replies too.
  // Previously only speakResponse() (typed messages) and the greeting ever called
  // setMerySpokenSubtitle, so live-voice replies from Gemini Live never updated the caption —
  // it stayed frozen on whatever text was last set (usually the greeting).
  useEffect(() => {
    const unsubLiveCaption = liveSession.onTranscript((text, role) => {
      if (role === 'model' && text && text.trim()) {
        setMerySpokenSubtitle(text);
      }
    });
    return () => unsubLiveCaption();
  }, []);

  // Sync spoken language with voiceService
  useEffect(() => {
    voiceService.setLanguage(stateManager.getLanguage());
    const unsubLang = stateManager.onLanguageChange((lang) => {
      voiceService.setLanguage(lang);
    });
    return () => unsubLang();
  }, []);

  // Save messages to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('mery_chat_messages', JSON.stringify(messages));
    } catch {}
  }, [messages]);

  // Synchronize memories with persistent MemoryManager
  useEffect(() => {
    memoryManager.initialize().then((all) => {
      if (all && all.length > 0) {
        setMemories(
          all.map((item) => ({
            id: item.id,
            text: item.content || item.value || `${item.key}: ${item.value}`,
            category: (item.category as MemoryCategory) || 'user_preference',
            createdAt: new Date(item.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' }),
          }))
        );
      }
    });

    const unsubMem = memoryManager.subscribe(() => {
      const all = memoryManager.getAllMemories();
      setMemories(
        all.map((item) => ({
          id: item.id,
          text: item.content || item.value || `${item.key}: ${item.value}`,
          category: (item.category as MemoryCategory) || 'user_preference',
          createdAt: new Date(item.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' }),
        }))
      );
    });

    return () => unsubMem();
  }, []);

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

        // Language detection & authoritative state synchronization
        const detected = detectSpokenLanguage(finalText, stateManager.getLanguage());
        console.log('[LANGUAGE] detected:', detected.detectedLang, `(${detected.reason})`);
        stateManager.setActiveLanguage(detected.detectedLang);
        console.log('[LANGUAGE] active:', stateManager.getLanguage());

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
          { pitch: 1.0, rate: 1.0 }
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
      onRecognitionStateChange: (recState) => {
        const current = hologramStateRef.current;
        if (recState === 'listening' && current !== 'speaking' && current !== 'thinking') {
          stateManager.setState('listening');
          stateManager.setAIStatus('LISTENING');
          setHologramState('listening');
        } else if (recState === 'idle' && current !== 'speaking' && current !== 'thinking') {
          stateManager.setAIStatus('IDLE');
          setHologramState('idle');
        }
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
        const activeLang = stateManager.getLanguage() || 'gu-IN';
        console.log('[LANGUAGE] active (speakResponse):', activeLang);
        const res = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: msg.content, language: activeLang }),
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
    const naturalPitch = Math.min(1.04, Math.max(0.96, (voiceMod?.pitch || 1.0) * (voiceSettings?.pitch || 1.0)));
    const naturalRate = Math.min(1.08, Math.max(0.92, (voiceMod?.rate || 1.0) * (voiceSettings?.speed || 1.0)));
    const adjustedParams = {
      pitch: naturalPitch,
      rate: naturalRate,
      volume: voiceMod?.volume ?? 1.0,
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

  // Proactive Voice Greeting on Mic Start
  const handleStartVoiceSession = async () => {
    // 0. Audio Cleanup: Stop any lingering audio or speech before starting
    liveSession.stopAllAudio();
    liveSession.setGreetingActive(true);

    // 1. Establish connection to Gemini Live session link
    const connected = await liveSession.connect();
    if (!connected) {
      console.warn('[Voice Session] Live API session offline, starting Browser Full-Duplex Engine...');
      startFullDuplexEngine();
    }

    // 2. Select authentic voice greeting based on active language
    const lang = stateManager.getLanguage();
    const isGujarati = lang === 'gu-IN';
    const greetingText = isGujarati
      ? "હું મેરી છું. સિસ્ટમ ઓનલાઇન છે અને હું સાંભળી રહી છું. આજે આપણો શું પ્લાન છે?"
      : "I'm MERY. Systems online and listening. What's on our agenda today?";

    // 3. Update hologram, subtitle, and live transcripts in real-time
    stateManager.setState('speaking');
    setHologramState('speaking');
    setMerySpokenSubtitle(greetingText);
    liveSession.dispatchTranscript(greetingText, 'model');

    const greetingMsg: ChatMessage = {
      id: `msg_greeting_${Date.now()}`,
      role: 'model',
      content: greetingText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages((prev) => [...prev, greetingMsg]);

    // 4. Vocalize introduction with warm, friendly female demeanor
    voiceService.speakBrowserVoice(
      greetingText,
      () => {
        // Hologram & state react to speaking
        stateManager.setState('speaking');
        setHologramState('speaking');
      },
      () => {
        // Finished greeting speech
        liveSession.setGreetingActive(false);
        // Smoothly transition to listening with acoustic chime
        voiceService.playAcousticChime('listen_start');
        stateManager.setState('listening');
        setHologramState('listening');
      },
      { pitch: 1.0, rate: 1.0 }
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
        if (payload?.text || payload?.value) {
          const text = payload.text || `${payload.key}: ${payload.value}`;
          const cat = (payload.category as MemoryCategory) || 'user_preference';
          memoryService.save({ text, category: cat });
          handleAddMemory(text, cat);
        }
        break;
      case 'GET_WEATHER':
        locationService.getWeather(payload?.city).then((w) => {
          stateManager.notify(`Weather: ${w.locationName} ${w.temperature}°C, ${w.condition}`, 'success');
        });
        break;
      case 'GET_LOCATION':
        locationService
          .getLocationWithFallback()
          .then((geo) => {
            stateManager.notify(`Location: ${geo.displayName}`, 'success');
          })
          .catch((err) => {
            console.warn('[App] Location notice:', err);
          });
        break;
      case 'GET_NEARBY_PLACES':
        if (payload?.query) {
          locationService.searchNearby(payload.query).then((places) => {
            stateManager.notify(`Found ${places.length} places for "${payload.query}"`, 'info');
          });
        }
        break;
      case 'ACTIVATE_CAMERA':
        cameraService.startCamera(payload?.facing || 'environment');
        break;
      case 'CAPTURE_VISION':
        cameraService.captureSingleFrame();
        stateManager.notify('Visual snapshot captured', 'info');
        break;
      case 'SEND_NOTIFICATION':
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(payload?.title || 'MERY', { body: payload?.body || '' });
        } else {
          stateManager.notify(`${payload?.title || 'MERY'}: ${payload?.body || ''}`, 'info');
        }
        break;
      case 'FORGET_MEMORY':
        if (payload?.keyOrId) {
          const all = memoryManager.getAllMemories();
          const m = all.find((item) => item.id === payload.keyOrId || item.key.toLowerCase() === payload.keyOrId.toLowerCase());
          if (m) memoryManager.removeMemory(m.id);
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

    // Detect language and synchronize active language
    const detected = detectSpokenLanguage(text, stateManager.getLanguage());
    stateManager.setActiveLanguage(detected.detectedLang);
    console.log('[LANGUAGE] detected:', detected.detectedLang);
    console.log('[LANGUAGE] active:', stateManager.getLanguage());
    console.log('[LANGUAGE] AI:', stateManager.getLanguage());

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
          language: stateManager.getLanguage(),
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
          screenSnapshot: screenShareService.isSharing()
            ? (screenShareService.getLatestSnapshot() || screenShareService.captureSingleFrame() || undefined)
            : undefined,
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
        content: "I'm right here with you. Mind sharing that with me again?",
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
    const key = `item_${Date.now().toString(36)}`;
    memoryManager.addMemory(category, key, text, text, 'preference', 0.90);
  };

  const handleDeleteMemory = (id: string) => {
    memoryManager.removeMemory(id);
  };

  return (
    <div className="h-[100dvh] max-h-[100dvh] w-full bg-[#080809] text-white flex flex-col selection:bg-[#00ff66] selection:text-[#080809] relative overflow-hidden font-sans">
      {/* Toast Notification HUD */}
      {toast && (
        <div className="fixed top-14 right-6 z-50 px-4 py-2 bg-[#080809]/90 border border-[#00ff66]/40 text-xs text-white shadow-2xl backdrop-blur-xl flex items-center gap-2 animate-fade-in font-telemetry">
          <span
            className={`w-2 h-2 rounded-full ${
              toast.type === 'error'
                ? 'bg-rose-400'
                : toast.type === 'warning'
                ? 'bg-amber-400'
                : toast.type === 'success'
                ? 'bg-[#00ff66]'
                : 'bg-[#00ff66]'
            }`}
          />
          <span>{toast.message}</span>
        </div>
      )}

      {/* Main Experience Stage (Variation 11: Mobile Neural Interface) */}
      <div className="flex-1 min-h-0 w-full flex flex-col relative z-10">
        <VoiceOrbStage
          onOpenSettings={() => setIsApiSettingsOpen(true)}
          onOpenTools={() => setIsToolNexusOpen(true)}
          onOpenTranscript={() => setIsTranscriptOpen(true)}
          onOpenAgentDev={() => setIsAgentDevOpen(true)}
          onOpenMemory={() => setIsMemoryOpen(true)}
          onOpenSystemControl={() => setIsSystemControlOpen(true)}
          onOpenActivity={() => setIsActivityOpen(true)}
          onOpenEmotion={() => setIsEmotionOpen(true)}
          voiceEnabled={!voiceMuted}
          onToggleVoice={() => setVoiceMuted(!voiceMuted)}
          onStartVoiceSession={handleStartVoiceSession}
          onSendMessage={handleSendMessage}
          isThinking={isThinking}
          messageCount={messages.length}
          showChatText={showChatText}
          onToggleChatText={() =>
            setShowChatText((prev) => {
              const next = !prev;
              try {
                localStorage.setItem('mery_show_chat_text', String(next));
              } catch {}
              return next;
            })
          }
          messages={messages}
          onPlayVoice={speakResponse}
          playingMessageId={playingMessageId}
        >
          <AnimeAvatar3D
            state={hologramState}
            emotion={currentEmotion}
            accentColor="#00ff66"
            onStartSession={handleStartVoiceSession}
            onClick={async () => {
              const st = stateManager.getState();
              if (st === 'disconnected') {
                await handleStartVoiceSession();
              } else if (st === 'speaking') {
                liveSession.handleUserInterrupt();
              } else {
                liveSession.disconnect();
              }
            }}
          />
        </VoiceOrbStage>
      </div>

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

      {/* Safety Confirmation Modal */}
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

      {/* Screen Sharing Permission & Allow Guide Modal */}
      <ScreenAllowModal
        isOpen={isScreenAllowOpen}
        onClose={() => {
          setIsScreenAllowOpen(false);
          setScreenAllowReason(null);
        }}
        reason={screenAllowReason}
      />

      {/* All-Type Agent Development Studio Modal */}
      <AgentDevStudioModal
        isOpen={isAgentDevOpen}
        onClose={() => setIsAgentDevOpen(false)}
      />
    </div>
  );
}