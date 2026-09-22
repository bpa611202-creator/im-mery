import { WebSocket } from "ws";

export interface HandoffPeer {
  id: string;
  deviceType: "desktop" | "mobile" | "tablet" | "unknown";
  userAgent?: string;
  connectedAt: number;
  lastSeen: number;
  ws?: WebSocket;
}

export interface HandoffState {
  sessionId: string;
  messages: any[];
  activePersonaId?: string;
  studyMinutes?: number;
  notesScratchpad?: string;
  dominantEmotion?: string;
  activeLanguage?: string;
  lastUpdatedBy?: string;
  updatedAt: number;
}

export class HandoffService {
  private sessions: Map<string, HandoffState> = new Map();
  private peers: Map<string, Set<HandoffPeer>> = new Map();
  private pairingCodes: Map<string, { sessionId: string; expiresAt: number }> = new Map();

  constructor() {
    // Periodic cleanup of expired pairing codes
    setInterval(() => {
      const now = Date.now();
      for (const [code, entry] of this.pairingCodes.entries()) {
        if (entry.expiresAt < now) {
          this.pairingCodes.delete(code);
        }
      }
    }, 60000);
  }

  public getSessionState(sessionId: string): HandoffState {
    let state = this.sessions.get(sessionId);
    if (!state) {
      state = {
        sessionId,
        messages: [],
        activePersonaId: "mery",
        studyMinutes: 0,
        notesScratchpad: "",
        dominantEmotion: "neutral",
        activeLanguage: "gu-IN",
        updatedAt: Date.now(),
      };
      this.sessions.set(sessionId, state);
    }
    return state;
  }

  public updateSessionState(sessionId: string, updates: Partial<HandoffState>, senderId?: string): HandoffState {
    const current = this.getSessionState(sessionId);
    const updated: HandoffState = {
      ...current,
      ...updates,
      sessionId,
      lastUpdatedBy: senderId || current.lastUpdatedBy,
      updatedAt: Date.now(),
    };
    this.sessions.set(sessionId, updated);

    // Broadcast update to all connected peers in this session (except sender if provided)
    this.broadcastToSession(sessionId, {
      type: "state_update",
      state: updated,
      senderId,
    }, senderId);

    return updated;
  }

  public getPeers(sessionId: string): Array<Omit<HandoffPeer, "ws">> {
    const set = this.peers.get(sessionId);
    if (!set) return [];
    return Array.from(set).map(({ id, deviceType, userAgent, connectedAt, lastSeen }) => ({
      id,
      deviceType,
      userAgent,
      connectedAt,
      lastSeen,
    }));
  }

  public registerPeer(sessionId: string, peer: HandoffPeer): void {
    if (!this.peers.has(sessionId)) {
      this.peers.set(sessionId, new Set());
    }
    this.peers.get(sessionId)!.add(peer);

    // Broadcast peer joined
    this.broadcastToSession(sessionId, {
      type: "peers_updated",
      peers: this.getPeers(sessionId),
    });
  }

  public removePeer(sessionId: string, peerId: string): void {
    const set = this.peers.get(sessionId);
    if (set) {
      for (const peer of set) {
        if (peer.id === peerId) {
          set.delete(peer);
          break;
        }
      }
      if (set.size === 0) {
        this.peers.delete(sessionId);
      }
    }

    this.broadcastToSession(sessionId, {
      type: "peers_updated",
      peers: this.getPeers(sessionId),
    });
  }

  public broadcastToSession(sessionId: string, payload: any, excludePeerId?: string): void {
    const set = this.peers.get(sessionId);
    if (!set) return;

    const messageStr = JSON.stringify(payload);
    for (const peer of set) {
      if (excludePeerId && peer.id === excludePeerId) continue;
      if (peer.ws && peer.ws.readyState === WebSocket.OPEN) {
        try {
          peer.ws.send(messageStr);
        } catch (e) {
          console.warn(`[Handoff] Failed to send message to peer ${peer.id}:`, e);
        }
      }
    }
  }

  public generatePairingCode(sessionId: string): string {
    // Generate a friendly 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    this.pairingCodes.set(code, {
      sessionId,
      expiresAt: Date.now() + 1000 * 60 * 15, // 15 minutes validity
    });
    return code;
  }

  public claimPairingCode(code: string): { success: boolean; sessionId?: string; error?: string } {
    const cleanCode = code.trim().replace(/-/g, "");
    const entry = this.pairingCodes.get(cleanCode);
    if (!entry) {
      return { success: false, error: "Invalid or expired pairing code" };
    }
    if (entry.expiresAt < Date.now()) {
      this.pairingCodes.delete(cleanCode);
      return { success: false, error: "Pairing code has expired" };
    }
    return { success: true, sessionId: entry.sessionId };
  }
}

export const handoffService = new HandoffService();
