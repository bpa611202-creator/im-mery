import {
  AssistantState,
  AIStatus,
  ConversationState,
  EmotionType,
  ToolExecutionRecord,
  TurnTakingAnalysis,
} from '../types';

export type StateListener = (state: AssistantState) => void;
export type AIStatusListener = (status: AIStatus) => void;
export type ConversationStateListener = (convState: ConversationState, analysis?: TurnTakingAnalysis) => void;
export type VolumeListener = (userVolume: number, meryVolume: number) => void;
export type ToolListener = (tool: ToolExecutionRecord | null) => void;
export type NotificationListener = (message: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
export type SpokenLanguage = 'gu-IN' | 'hi-IN' | 'en-IN' | 'en-US' | 'auto';
export type LanguageListener = (lang: SpokenLanguage) => void;

function dispatchSafe(fn: () => void) {
  if (typeof queueMicrotask === 'function') {
    queueMicrotask(() => {
      try {
        fn();
      } catch (e) {
        console.error('Error in state listener:', e);
      }
    });
  } else {
    try {
      fn();
    } catch (e) {
      console.error('Error in state listener:', e);
    }
  }
}

export class StateManager {
  private state: AssistantState = 'disconnected';
  private aiStatus: AIStatus = 'IDLE';
  private convState: ConversationState = 'IDLE';
  private lastAnalysis: TurnTakingAnalysis | null = null;
  private userVolume: number = 0;
  private meryVolume: number = 0;
  private isMuted: boolean = false;
  private latencyMs: number = 28;
  private emotion: EmotionType = 'warm';
  private resonance: number = 98;
  private theme: 'dark' | 'light' = 'dark';
  private activeTool: ToolExecutionRecord | null = null;
  private toolHistory: ToolExecutionRecord[] = [];
  private errorMessage: string | null = null;
  private language: SpokenLanguage = (typeof window !== 'undefined' && (localStorage.getItem('mery_spoken_language') as SpokenLanguage)) || 'gu-IN';

  private stateListeners: Set<StateListener> = new Set();
  private aiStatusListeners: Set<AIStatusListener> = new Set();
  private convStateListeners: Set<ConversationStateListener> = new Set();
  private volumeListeners: Set<VolumeListener> = new Set();
  private toolListeners: Set<ToolListener> = new Set();
  private notificationListeners: Set<NotificationListener> = new Set();
  private languageListeners: Set<LanguageListener> = new Set();

  getState(): AssistantState {
    return this.state;
  }

  getAIStatus(): AIStatus {
    return this.aiStatus;
  }

  setAIStatus(status: AIStatus) {
    if (this.aiStatus === status) return;
    const oldStatus = this.aiStatus;
    this.aiStatus = status;
    console.log(`[StateManager] AIStatus: ${oldStatus} -> ${status}`);
    this.aiStatusListeners.forEach((listener) => {
      dispatchSafe(() => listener(status));
    });
  }

  onAIStatusChange(listener: AIStatusListener): () => void {
    this.aiStatusListeners.add(listener);
    return () => this.aiStatusListeners.delete(listener);
  }

  setState(newState: AssistantState) {
    if (this.state === newState) return;
    const oldState = this.state;
    this.state = newState;
    console.log(`[StateManager] Transition: ${oldState} -> ${newState}`);

    // Automatically sync AIStatus when standard states change unless overridden
    if (newState === 'speaking') {
      this.setAIStatus('SPEAKING');
    } else if (newState === 'listening') {
      this.setAIStatus('LISTENING');
    } else if (newState === 'disconnected') {
      this.setAIStatus('IDLE');
    }

    this.stateListeners.forEach((listener) => {
      dispatchSafe(() => listener(newState));
    });
  }

  getConversationState(): ConversationState {
    return this.convState;
  }

  setConversationState(newConvState: ConversationState, analysis?: TurnTakingAnalysis) {
    if (this.convState === newConvState && !analysis) return;
    const oldConvState = this.convState;
    this.convState = newConvState;
    if (analysis) {
      this.lastAnalysis = analysis;
    }
    console.log(`[StateManager] ConversationState: ${oldConvState} -> ${newConvState}`, analysis ? `(${analysis.reason})` : '');
    this.convStateListeners.forEach((listener) => {
      dispatchSafe(() => listener(newConvState, analysis || this.lastAnalysis || undefined));
    });
  }

  onConversationStateChange(listener: ConversationStateListener): () => void {
    this.convStateListeners.add(listener);
    return () => this.convStateListeners.delete(listener);
  }

  getLastAnalysis(): TurnTakingAnalysis | null {
    return this.lastAnalysis;
  }

  onStateChange(listener: StateListener): () => void {
    this.stateListeners.add(listener);
    return () => this.stateListeners.delete(listener);
  }

  updateVolumes(userVol: number, meryVol: number) {
    this.userVolume = userVol;
    this.meryVolume = meryVol;
    this.volumeListeners.forEach((l) => l(userVol, meryVol));
  }

  onVolumeUpdate(listener: VolumeListener): () => void {
    this.volumeListeners.add(listener);
    return () => this.volumeListeners.delete(listener);
  }

  getUserVolume(): number {
    return this.userVolume;
  }

  getMeryVolume(): number {
    return this.meryVolume;
  }

  setMuted(muted: boolean) {
    this.isMuted = muted;
    this.notify(muted ? 'Microphone muted' : 'Microphone unmuted', 'info');
  }

  getIsMuted(): boolean {
    return this.isMuted;
  }

  setLatency(ms: number) {
    this.latencyMs = ms;
  }

  getLatency(): number {
    return this.latencyMs;
  }

  setEmotion(emotion: EmotionType) {
    this.emotion = emotion;
  }

  getEmotion(): EmotionType {
    return this.emotion;
  }

  setResonance(val: number) {
    this.resonance = Math.max(0, Math.min(100, val));
  }

  getResonance(): number {
    return this.resonance;
  }

  getLanguage(): SpokenLanguage {
    return this.language;
  }

  setActiveLanguage(lang: SpokenLanguage | string) {
    let normalized: SpokenLanguage = 'gu-IN';
    const l = (lang || '').toLowerCase();
    if (l.startsWith('gu') || l.includes('gujarat')) {
      normalized = 'gu-IN';
    } else if (l.startsWith('hi') || l.includes('hindi')) {
      normalized = 'hi-IN';
    } else if (l.includes('us')) {
      normalized = 'en-US';
    } else if (l.startsWith('en')) {
      normalized = 'en-IN';
    } else if (l === 'auto') {
      normalized = 'auto';
    }

    console.log('[LANGUAGE] active:', normalized);

    const changed = this.language !== normalized;
    this.language = normalized;

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('mery_spoken_language', normalized);
      } catch {}
    }

    const label =
      normalized === 'gu-IN'
        ? 'ગુજરાતી (Gujarati)'
        : normalized === 'hi-IN'
        ? 'हिंदी (Hindi)'
        : normalized === 'en-IN' || normalized === 'en-US'
        ? 'English'
        : 'Auto Detect';

    if (changed) {
      this.notify(`Spoken language: ${label}`, 'info');
    }

    this.languageListeners.forEach((listener) => {
      dispatchSafe(() => listener(normalized));
    });
  }

  setLanguage(lang: SpokenLanguage | string) {
    this.setActiveLanguage(lang as SpokenLanguage);
  }

  onLanguageChange(listener: LanguageListener): () => void {
    this.languageListeners.add(listener);
    return () => this.languageListeners.delete(listener);
  }

  getTheme(): 'dark' | 'light' {
    return this.theme;
  }

  setTheme(theme: 'dark' | 'light') {
    this.theme = theme;
    if (typeof document !== 'undefined') {
      if (theme === 'light') {
        document.documentElement.classList.add('light-theme');
      } else {
        document.documentElement.classList.remove('light-theme');
      }
    }
  }

  setActiveTool(tool: ToolExecutionRecord | null) {
    this.activeTool = tool;
    if (tool) {
      const existingIdx = this.toolHistory.findIndex((t) => t.id === tool.id);
      if (existingIdx >= 0) {
        const updated = [...this.toolHistory];
        updated[existingIdx] = tool;
        this.toolHistory = updated;
      } else {
        this.toolHistory = [tool, ...this.toolHistory.slice(0, 49)];
      }
    }
    this.toolListeners.forEach((l) => {
      dispatchSafe(() => l(tool));
    });
  }

  getActiveTool(): ToolExecutionRecord | null {
    return this.activeTool;
  }

  getToolHistory(): ToolExecutionRecord[] {
    return this.toolHistory;
  }

  onToolUpdate(listener: ToolListener): () => void {
    this.toolListeners.add(listener);
    return () => this.toolListeners.delete(listener);
  }

  notify(message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') {
    this.notificationListeners.forEach((l) => {
      dispatchSafe(() => l(message, type));
    });
  }

  onNotification(listener: NotificationListener): () => void {
    this.notificationListeners.add(listener);
    return () => this.notificationListeners.delete(listener);
  }

  setError(err: string | null) {
    this.errorMessage = err;
    if (err) {
      this.notify(err, 'error');
    }
  }

  getError(): string | null {
    return this.errorMessage;
  }
}

export const stateManager = new StateManager();

export function setActiveLanguage(lang: SpokenLanguage | string): void {
  stateManager.setActiveLanguage(lang);
}
