import { stateManager } from './StateManager';

export interface HandoffPeer {
  id: string;
  deviceType: 'desktop' | 'mobile' | 'tablet' | 'unknown';
  userAgent?: string;
  connectedAt: number;
  lastSeen: number;
}

export interface SyncedHandoffState {
  sessionId: string;
  messages?: any[];
  activePersonaId?: string;
  studyMinutes?: number;
  notesScratchpad?: string;
  dominantEmotion?: string;
  activeLanguage?: string;
  lastUpdatedBy?: string;
  updatedAt?: number;
}

type StateListener = (state: SyncedHandoffState) => void;
type PeersListener = (peers: HandoffPeer[]) => void;

const SESSION_STORAGE_KEY = 'mery_handoff_session_id';

class HandoffManager {
  private sessionId: string = '';
  private peerId: string = '';
  private ws: WebSocket | null = null;
  private reconnectTimer: any = null;
  private stateListeners: Set<StateListener> = new Set();
  private peersListeners: Set<PeersListener> = new Set();
  private peers: HandoffPeer[] = [];
  private lastSyncedState: SyncedHandoffState | null = null;
  private isConnected: boolean = false;
  private autoSync: boolean = true;

  constructor() {
    this.initSessionId();
  }

  private initSessionId(): void {
    if (typeof window === 'undefined') return;

    // 1. Check URL parameters for instant handoff invitation
    const urlParams = new URLSearchParams(window.location.search);
    const handoffParam = urlParams.get('handoff');
    if (handoffParam) {
      this.sessionId = handoffParam.trim();
      localStorage.setItem(SESSION_STORAGE_KEY, this.sessionId);
      // Clean query string without reload
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }

    // 2. Check localStorage
    const saved = localStorage.getItem(SESSION_STORAGE_KEY);
    if (saved) {
      this.sessionId = saved.trim();
    } else {
      // 3. Generate a persistent session ID
      this.sessionId = 'mery-' + Math.random().toString(36).substring(2, 8);
      localStorage.setItem(SESSION_STORAGE_KEY, this.sessionId);
    }
  }

  public getSessionId(): string {
    return this.sessionId;
  }

  public getDeviceType(): 'desktop' | 'mobile' | 'tablet' | 'unknown' {
    if (typeof window === 'undefined') return 'unknown';
    const ua = navigator.userAgent || '';
    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
      return 'tablet';
    }
    if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated/i.test(ua)) {
      return 'mobile';
    }
    return 'desktop';
  }

  public getConnectedPeers(): HandoffPeer[] {
    return this.peers;
  }

  public getIsConnected(): boolean {
    return this.isConnected;
  }

  public getLatestState(): SyncedHandoffState | null {
    return this.lastSyncedState;
  }

  public connect(): void {
    if (typeof window === 'undefined') return;
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const deviceType = this.getDeviceType();
    const wsUrl = `${protocol}//${host}/handoff?sessionId=${encodeURIComponent(this.sessionId)}&deviceType=${deviceType}`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.isConnected = true;
        console.log(`[HandoffManager] Connected to session ${this.sessionId}`);
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'init_state') {
            this.peerId = data.peerId;
            this.peers = data.peers || [];
            this.lastSyncedState = data.state;
            this.notifyPeersListeners();
            if (data.state) {
              this.notifyStateListeners(data.state);
            }
          } else if (data.type === 'state_update') {
            this.lastSyncedState = data.state;
            if (data.state) {
              this.notifyStateListeners(data.state);
            }
          } else if (data.type === 'peers_updated') {
            this.peers = data.peers || [];
            this.notifyPeersListeners();
          }
        } catch (e) {
          console.warn('[HandoffManager] Failed to parse message:', e);
        }
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        this.scheduleReconnect();
      };

      this.ws.onerror = (err) => {
        console.warn('[HandoffManager] Socket warning:', err);
        this.isConnected = false;
      };
    } catch (err) {
      console.warn('[HandoffManager] Connect failure:', err);
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, 4000);
  }

  public disconnect(): void {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
  }

  public async setSessionId(newSessionId: string): Promise<void> {
    const clean = newSessionId.trim();
    if (!clean || clean === this.sessionId) return;
    this.sessionId = clean;
    localStorage.setItem(SESSION_STORAGE_KEY, clean);
    this.disconnect();
    this.connect();
  }

  public async generatePairingCode(): Promise<{ success: boolean; code?: string; error?: string }> {
    try {
      const res = await fetch('/api/handoff/code/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: this.sessionId }),
      });
      const data = await res.json();
      if (res.ok && data.code) {
        return { success: true, code: data.code };
      }
      return { success: false, error: data.error || 'Failed to generate code' };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Network error' };
    }
  }

  public async claimPairingCode(code: string): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await fetch('/api/handoff/code/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.sessionId) {
        await this.setSessionId(data.sessionId);
        if (data.state) {
          this.lastSyncedState = data.state;
          this.notifyStateListeners(data.state);
        }
        stateManager.notify('Device successfully paired with session!', 'success');
        return { success: true };
      }
      return { success: false, error: data.error || 'Invalid code' };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Network error' };
    }
  }

  public pushState(updates: Partial<SyncedHandoffState>): void {
    const payload = {
      type: 'state_update',
      state: updates,
    };

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(payload));
    } else {
      // HTTP fallback
      fetch(`/api/handoff/session/${encodeURIComponent(this.sessionId)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state: updates, senderId: this.peerId }),
      }).catch((e) => console.warn('[HandoffManager] Fallback state push failed:', e));
    }
  }

  public onStateChange(listener: StateListener): () => void {
    this.stateListeners.add(listener);
    if (this.lastSyncedState) {
      listener(this.lastSyncedState);
    }
    return () => {
      this.stateListeners.delete(listener);
    };
  }

  public onPeersChange(listener: PeersListener): () => void {
    this.peersListeners.add(listener);
    listener(this.peers);
    return () => {
      this.peersListeners.delete(listener);
    };
  }

  private notifyStateListeners(state: SyncedHandoffState): void {
    for (const listener of this.stateListeners) {
      try {
        listener(state);
      } catch (err) {
        console.warn('[HandoffManager] State listener error:', err);
      }
    }
  }

  private notifyPeersListeners(): void {
    for (const listener of this.peersListeners) {
      try {
        listener(this.peers);
      } catch (err) {
        console.warn('[HandoffManager] Peers listener error:', err);
      }
    }
  }
}

export const handoffManager = new HandoffManager();
