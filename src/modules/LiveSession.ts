import { stateManager } from './StateManager';
import { audioStreamer } from './AudioStreamer';
import { audioPlayer } from './AudioPlayer';
import { toolManager } from './ToolManager';

export class LiveSession {
  private ws: WebSocket | null = null;
  private isConnecting: boolean = false;
  private isInterrupted: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 3;
  private reconnectTimer: any = null;
  private pingInterval: any = null;

  constructor() {
    // Setup AudioPlayer callbacks
    audioPlayer.setCallbacks(
      () => {
        // Playback started
        if (stateManager.getState() !== 'speaking') {
          stateManager.setState('speaking');
          stateManager.setConversationState('SPEAKING');
        }
      },
      () => {
        // Playback finished -> transition back to listening
        if (stateManager.getState() === 'speaking') {
          stateManager.setState('listening');
          stateManager.setConversationState('LISTENING');
        }
      }
    );
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  async connect(): Promise<boolean> {
    if (this.isConnected() || this.isConnecting) {
      return true;
    }

    this.isConnecting = true;
    stateManager.setState('connecting');
    stateManager.setError(null);

    return new Promise((resolve) => {
      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/live`;
        console.log(`[LiveSession] Connecting to ${wsUrl}...`);

        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = async () => {
          console.log('[LiveSession] WebSocket connected.');
          this.isConnecting = false;
          this.reconnectAttempts = 0;

          // Start ping/latency measurement
          this.startPingLoop();

          // Start microphone capture at 16kHz PCM16
          try {
            await audioStreamer.start(
              (base64Chunk) => this.sendAudioChunk(base64Chunk),
              () => this.handleUserInterrupt(),
              () => stateManager.getState() === 'speaking' || audioPlayer.isPlaying()
            );

            stateManager.setState('listening');
            stateManager.notify('MERY Live Link Established', 'success');
            resolve(true);
          } catch (micErr: any) {
            console.warn('[LiveSession] Microphone access notice:', micErr?.message || micErr);
            stateManager.setError('Microphone permission required for real-time voice.');
            stateManager.setState('disconnected');
            this.disconnect();
            resolve(false);
          }
        };

        this.ws.onmessage = async (event) => {
          try {
            const msg = JSON.parse(event.data);

            if (msg.type === 'ready') {
              console.log(`[LiveSession] Gemini Live ready with model: ${msg.model}`);
              stateManager.setState('listening');
            } else if (msg.type === 'audio') {
              // Received 24kHz PCM audio chunk from Gemini Live
              if (!this.isInterrupted) {
                await audioPlayer.playPCMChunk(msg.data, 24000);
              }
            } else if (msg.type === 'transcript') {
              if (msg.text) {
                console.log(`[LiveSession Transcript]: ${msg.text}`);
              }
            } else if (msg.type === 'interrupted') {
              console.log('[LiveSession] Received server interrupt signal');
              this.handleServerInterrupt();
            } else if (msg.type === 'tool_call') {
              console.log('[LiveSession] Received tool call from Gemini Live:', msg.functionCalls);
              this.handleToolCalls(msg.functionCalls);
            } else if (msg.type === 'turn_complete') {
              // Server finished current turn
              console.log('[LiveSession] Server turn complete');
              this.isInterrupted = false;
            } else if (msg.type === 'error') {
              console.warn('[LiveSession] Server Live API notice:', msg.message);
              stateManager.setError(msg.message || 'Live session notice');
              if (msg.missingKey) {
                stateManager.notify('Gemini API key is required on server.', 'error');
              } else {
                stateManager.notify(msg.message || 'Live session notice', 'warning');
              }
            } else if (msg.type === 'pong') {
              if (msg.timestamp) {
                const rtt = Math.max(8, Math.round(Date.now() - msg.timestamp));
                stateManager.setLatency(rtt);
              }
            }
          } catch (err: any) {
            console.warn('[LiveSession] Message parsing notice:', err?.message || err);
          }
        };

        this.ws.onerror = () => {
          console.warn('[LiveSession] WebSocket link interruption detected.');
          stateManager.setError('Live connection link interrupted.');
        };

        this.ws.onclose = (event) => {
          console.log(`[LiveSession] WebSocket closed (code: ${event.code}${event.reason ? `, reason: ${event.reason}` : ''})`);
          this.cleanup();
          stateManager.setState('disconnected');
          resolve(false);
        };
      } catch (err: any) {
        console.warn('[LiveSession] Connection initialization notice:', err?.message || err);
        this.cleanup();
        stateManager.setState('disconnected');
        resolve(false);
      }
    });
  }

  // Send PCM16 16kHz chunk from AudioStreamer
  private sendAudioChunk(base64Chunk: string) {
    if (!this.isConnected() || !this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    try {
      this.ws.send(
        JSON.stringify({
          type: 'audio',
          data: base64Chunk,
        })
      );
    } catch (e: any) {
      console.warn('[LiveSession] Audio chunk transmit notice:', e?.message || e);
    }
  }

  // Interruption handling when user speaks while MERY is speaking
  handleUserInterrupt() {
    console.log('[LiveSession] Natural user interrupt triggered!');
    this.isInterrupted = true;

    // 1. Immediately halt audio playback
    audioPlayer.stop();

    // 2. Switch state to interrupted, then listening
    stateManager.setState('listening');
    stateManager.setConversationState('INTERRUPTED');
    setTimeout(() => {
      if (stateManager.getConversationState() === 'INTERRUPTED') {
        stateManager.setConversationState('LISTENING');
      }
    }, 200);

    // 3. Notify server of user interruption
    if (this.isConnected()) {
      try {
        this.ws?.send(
          JSON.stringify({
            type: 'interrupt',
          })
        );
      } catch {}
    }

    stateManager.notify('Interrupted — listening to you...', 'info');
  }

  private handleServerInterrupt() {
    this.isInterrupted = true;
    audioPlayer.stop();
    stateManager.setState('listening');
    stateManager.setConversationState('INTERRUPTED');
    setTimeout(() => {
      if (stateManager.getConversationState() === 'INTERRUPTED') {
        stateManager.setConversationState('LISTENING');
      }
    }, 200);
  }

  // Execute function calls requested by Gemini Live model
  private async handleToolCalls(functionCalls: any[]) {
    if (!functionCalls || !Array.isArray(functionCalls)) return;

    const functionResponses = [];

    for (const call of functionCalls) {
      const { name, args, id } = call;
      console.log(`[LiveSession] Executing tool [${name}]:`, args);
      const res = await toolManager.execute(name, args || {}, id);
      functionResponses.push(res);
    }

    // Send tool responses back to Gemini Live
    if (this.isConnected()) {
      console.log('[LiveSession] Sending tool responses back:', functionResponses);
      this.ws?.send(
        JSON.stringify({
          type: 'tool_response',
          functionResponses,
        })
      );
    }
  }

  private startPingLoop() {
    if (this.pingInterval) clearInterval(this.pingInterval);
    this.pingInterval = setInterval(() => {
      if (this.isConnected()) {
        try {
          this.ws?.send(
            JSON.stringify({
              type: 'ping',
              timestamp: Date.now(),
            })
          );
        } catch {}
      }
    }, 5000);
  }

  sendTextMessage(text: string): boolean {
    if (!this.isConnected() || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('[LiveSession] Cannot send text: WebSocket not open');
      return false;
    }
    try {
      this.ws.send(
        JSON.stringify({
          type: 'text',
          text,
        })
      );
      stateManager.setConversationState('USER_SPEAKING');
      return true;
    } catch (e: any) {
      console.warn('[LiveSession] Text transmission notice:', e?.message || e);
      return false;
    }
  }

  disconnect() {
    this.cleanup();
    stateManager.setState('disconnected');
    stateManager.notify('MERY Session Disconnected', 'info');
  }

  private cleanup() {
    this.isConnecting = false;
    this.isInterrupted = false;

    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      try {
        this.ws.onopen = null;
        this.ws.onmessage = null;
        this.ws.onerror = null;
        this.ws.onclose = null;
        this.ws.close();
      } catch {}
      this.ws = null;
    }

    audioStreamer.stop();
    audioPlayer.stop();
  }
}

export const liveSession = new LiveSession();
