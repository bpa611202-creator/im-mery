export type AssistantState =
  | 'disconnected'
  | 'connecting'
  | 'listening'
  | 'speaking';

// Human Conversation State Machine states
export type ConversationState =
  | 'IDLE'
  | 'LISTENING'
  | 'USER_SPEAKING'
  | 'WAITING_FOR_CONTINUATION'
  | 'EVALUATING_TURN'
  | 'BACKCHANNELING'
  | 'RESPONDING'
  | 'SPEAKING'
  | 'INTERRUPTED'
  | 'SILENT'
  | 'CONVERSATION_ENDED';

// Response Decision Engine outcome modes
export type ResponseDecisionMode =
  | 'SILENT'
  | 'BACKCHANNEL'
  | 'SHORT_REACTION'
  | 'NORMAL_RESPONSE'
  | 'FOLLOW_UP'
  | 'URGENT_RESPONSE';

export interface TurnTakingAnalysis {
  isMeaningfulSpeech: boolean;
  isThoughtIncomplete: boolean;
  continuationProbability: number; // 0 to 1
  silenceDurationMs: number;
  detectedEmotion: EmotionType;
  requiresResponse: boolean;
  decisionMode: ResponseDecisionMode;
  backchannelText?: string;
  reactionText?: string;
  reason: string;
  acousticSignals?: AcousticSignals;
}

export interface HumanConversationConfig {
  enabled: boolean;
  backchannelEnabled: boolean;
  patienceLevel: 'nimble' | 'natural' | 'patient';
  allowSilenceAsResponse: boolean;
  politeInterruptionEnabled: boolean;
}

export interface ToolCallItem {
  id?: string;
  name: string;
  args: Record<string, any>;
}

export interface ToolFunctionResponse {
  id?: string;
  name: string;
  response: Record<string, any>;
}

export interface ToolExecutionRecord {
  id: string;
  name: string;
  args: Record<string, any>;
  status: 'running' | 'success' | 'failed' | 'needs_confirmation';
  result?: any;
  timestamp: string;
}

export type UserEmotionType =
  | 'happy'
  | 'excited'
  | 'curious'
  | 'confused'
  | 'sad'
  | 'disappointed'
  | 'frustrated'
  | 'angry'
  | 'nervous'
  | 'tired'
  | 'stressed'
  | 'calm'
  | 'neutral';

export type EmotionType =
  | UserEmotionType
  | 'warm'
  | 'playful'
  | 'thoughtful'
  | 'supportive'
  | 'inspired'
  | 'concerned';

export type EmotionTrend = 'increasing' | 'decreasing' | 'stable';

export interface UserEmotionState {
  primary: UserEmotionType;
  confidence: number; // 0.0 - 1.0 (e.g., 0.82)
  intensity: number; // 0.0 - 1.0 (0.0 Neutral, 0.2 Slight, 0.5 Moderate, 0.8 Strong, 1.0 Very strong)
  duration: number; // in seconds or turns
  previousEmotion: UserEmotionType | null;
  trend: EmotionTrend;
  possibleEmotions: Record<UserEmotionType, number>;
  userConcern?: string;
  topicContext?: string;
  timestamp: number;
}

export type EmotionalResponseStrategy =
  | 'NEUTRAL'
  | 'SUPPORTIVE'
  | 'CURIOUS'
  | 'PLAYFUL'
  | 'EXCITED'
  | 'CALM'
  | 'REASSURING'
  | 'SERIOUS'
  | 'EMPATHETIC'
  | 'SOLUTION_FOCUSED';

export interface VoiceModulationConfig {
  rate: number; // 0.75 - 1.25
  pitch: number; // 0.85 - 1.25
  stability: number; // 0.3 - 0.9 (for ElevenLabs)
  style: number; // 0.0 - 0.6 (expressiveness)
  similarityBoost: number; // 0.5 - 0.9
  volume: number; // 0.0 - 1.0
  pauseDurationMs: number;
  deliveryTone: 'bright' | 'gentle' | 'energetic' | 'serious' | 'relaxed' | 'neutral';
}

export interface AcousticSignals {
  volume?: number; // 0.0 - 1.0
  speakingRateWpm?: number;
  pauseDurationMs?: number;
  hesitationCount?: number;
  pitchContour?: 'rising' | 'falling' | 'monotone' | 'varied';
}

export interface EmotionState {
  happiness: number; // 0-100
  curiosity: number; // 0-100
  excitement: number; // 0-100
  concern: number; // 0-100
  confidence: number; // 0-100
  empathy: number; // 0-100
  dominant: EmotionType;
  userEmotion?: UserEmotionState;
  responseStrategy?: EmotionalResponseStrategy;
  voiceModulation?: VoiceModulationConfig;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: string;
  emotion?: EmotionType;
  audioGenerating?: boolean;
  proactiveTrigger?: boolean;
  actionExecuted?: {
    type: string;
    details: string;
  };
}

export type MemoryCategory =
  | 'user_preference'
  | 'project_goal'
  | 'important_date'
  | 'relationship'
  | 'habit_schedule'
  | 'frequently_used_app'
  | 'favorite_thing'
  | 'observation'
  | 'insight';

export interface MeryMemory {
  id: string;
  text: string;
  category: MemoryCategory;
  createdAt: string;
  tags?: string[];
  relevanceScore?: number;
}

export type ActivityPattern =
  | 'coding'
  | 'gaming'
  | 'video_editing'
  | 'studying'
  | 'youtube'
  | 'writing'
  | 'general_browsing'
  | 'idle';

export interface ActivityContext {
  currentApp: string;
  activityPattern: ActivityPattern;
  focusMinutes: number;
  keystrokesPerMinute: number;
  mouseEventsPerMinute: number;
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'late_night';
  batteryLevel: number | null; // 0 to 100 or null
  isCharging: boolean | null;
  cpuLoadEstimate: number; // 0-100
  networkOnline: boolean;
  activeMusicTrack: string | null;
}

export interface SystemApp {
  id: string;
  name: string;
  category: 'dev' | 'creative' | 'productivity' | 'media' | 'system';
  iconName: string;
  status: 'running' | 'closed' | 'minimized';
  cpuUsage: number;
  url?: string;
}

export interface VirtualFile {
  id: string;
  name: string;
  path: string;
  size: string;
  type: 'document' | 'code' | 'audio' | 'folder';
  updatedAt: string;
  content?: string;
}

export interface SystemReminder {
  id: string;
  title: string;
  timeString: string;
  dueTimestamp: number;
  completed: boolean;
}

export interface SystemNote {
  id: string;
  title: string;
  content: string;
  updatedAt: string;
}

export interface SmartHomeDevice {
  id: string;
  name: string;
  type: 'light' | 'thermostat' | 'sound' | 'display';
  state: boolean;
  value?: string | number;
}

export interface SafetyActionRequest {
  id: string;
  actionType: 'delete_file' | 'clear_memory' | 'system_shutdown' | 'wipe_cache';
  title: string;
  description: string;
  targetId?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export interface SystemStatus {
  systemName: string;
  companionName: string;
  connectionState: 'syncing' | 'connected' | 'offline';
  resonanceScore: number;
  voiceActive: boolean;
  activeEmotion: EmotionType;
  brightness: number; // 50 to 100
  masterVolume: number; // 0 to 100
  theme: 'dark' | 'light';
  proactivityMode: 'silent' | 'gentle' | 'balanced' | 'attentive';
}

// Master API Provider & Integration Types
export type ProviderCategory = 'ai' | 'tts' | 'stt' | 'search' | 'calendar';

export type AIProviderId = 'gemini' | 'openai' | 'anthropic' | 'local_ai';
export type TTSProviderId = 'elevenlabs' | 'cartesia' | 'gemini_tts' | 'local_tts';
export type SearchProviderId = 'gemini_grounding' | 'duckduckgo' | 'tavily' | 'google_search';

export type ProviderStatus =
  | 'connected'
  | 'not_configured'
  | 'invalid_key'
  | 'quota_exceeded'
  | 'service_unavailable';

export interface ProviderConfig {
  id: string;
  name: string;
  category: ProviderCategory;
  apiKey: string; // masked in UI display
  model?: string;
  voiceId?: string;
  status: ProviderStatus;
  isPrimary: boolean;
  isFallback: boolean;
  enabled: boolean;
  latencyMs?: number;
  lastChecked?: string;
  freeTierAvailable?: string;
  getKeyUrl?: string;
  docsUrl?: string;
}

export interface VoiceSettings {
  provider: TTSProviderId;
  voiceId: string;
  speed: number; // 0.7 to 1.3
  pitch: number; // 0.8 to 1.3
  stability: number; // 0.0 to 1.0 (ElevenLabs)
  similarityBoost: number; // 0.0 to 1.0 (ElevenLabs)
  style: number; // 0.0 to 1.0
  useStreaming: boolean;
}

export interface ProactiveConfig {
  enabled: boolean;
  frequency: 'relaxed' | 'balanced' | 'frequent'; // 30m, 15m, 5m
  quietHoursEnabled: boolean;
  quietHoursStart: string; // e.g. "23:00"
  quietHoursEnd: string; // e.g. "08:00"
  allowedCategories: {
    breaks: boolean;
    deadlines: boolean;
    focus: boolean;
    celebrations: boolean;
    wellness: boolean;
  };
}

export type LogLevel = 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';

export interface StructuredLog {
  id: string;
  level: LogLevel;
  category: 'ai' | 'tts' | 'stt' | 'system' | 'safety' | 'proactive' | 'memory' | 'search';
  message: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface MissingKeyProtocol {
  feature: string;
  api: string;
  freeTierAvailable: string;
  whereToGetKey: string;
  whereToInsertKey: string;
}

export interface WebSearchResult {
  query: string;
  summary: string;
  sources: Array<{
    title: string;
    url: string;
    snippet?: string;
  }>;
  searchTimeMs: number;
}

