import { stateManager } from './StateManager';
import { audioStreamer } from './AudioStreamer';
import { audioPlayer } from './AudioPlayer';
import { toolManager } from './ToolManager';
import { screenShareService } from './ScreenShareService';
import { voiceService } from '../utils/audio';
import { memoryManager } from './MemoryManager';

export class LiveSession {
  private ws: WebSocket | null = null;
  private isConnecting: boolean = false;
  private isInterrupted: boolean = false;
  private isGreetingPlaying: boolean = false;
  private isUserExplicitDisconnect: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 3;
  private reconnectTimer: any = null;
  private pingInterval: any = null;
  private connectionId: number = 0;
  private connectPromise: Promise<boolean> | null = null;
  private transcriptListeners: Set<(text: string, role: 'model' | 'user') => void> = new Set();
  private liveSpeechRecognition: any = null;

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

    // Stream real-time visual screen frames to live session if screen sharing is active
    screenShareService.onFrame((base64) => {
      if (this.isConnected()) {
        this.sendScreenFrame(base64);
      }
    });
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  // Comprehensive immediate audio cleanup: stops speech synthesis, active AudioContext, and microphone stream
  stopAllAudio() {
    this.isInterrupted = true;
    this.isGreetingPlaying = false;
    voiceService.resetAllAudio();
    audioPlayer.cleanup();
    audioStreamer.stop();
  }

  setGreetingActive(active: boolean) {
    this.isGreetingPlaying = active;
    if (!active) {
      this.isInterrupted = false;
    }
  }

  isGreetingActive(): boolean {
    return this.isGreetingPlaying;
  }

  async connect(): Promise<boolean> {
    if (this.isConnected()) {
      return true;
    }

    if (this.isConnecting && this.connectPromise) {
      return this.connectPromise;
    }

    // 1. Audio Cleanup: completely stop active AudioContext, speech synthesis, and streams before connecting
    this.stopAllAudio();

    // 2. Prevent Duplicate Streams: close existing socket and remove handlers
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

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }

    const currentId = ++this.connectionId;
    this.isConnecting = true;
    this.isUserExplicitDisconnect = false;
    this.isInterrupted = false;
    stateManager.setState('connecting');
    stateManager.setError(null);

    this.connectPromise = new Promise(async (resolve) => {
      let isResolved = false;
      const safeResolve = (val: boolean) => {
        if (!isResolved) {
          isResolved = true;
          this.isConnecting = false;
          this.connectPromise = null;
          resolve(val);
        }
      };

      try {
        // Initialize persistent memory and format context prompt before starting session
        await memoryManager.initialize();
        const memoriesPrompt = memoryManager.formatMemoriesForPrompt();

        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const activeLang = stateManager.getLanguage() || 'gu-IN';
        const params = new URLSearchParams();
        if (memoriesPrompt) params.set('memories', memoriesPrompt);
        params.set('lang', activeLang);
        const wsUrl = `${protocol}//${window.location.host}/live?${params.toString()}`;
        console.log(`[LiveSession] Connecting to ${wsUrl} (connection #${currentId}, lang: ${activeLang})...`);

        const socket = new WebSocket(wsUrl);
        this.ws = socket;

        socket.onopen = async () => {
          if (this.ws !== socket || this.connectionId !== currentId) return;
          console.log('[LiveSession] WebSocket connected.');
          this.reconnectAttempts = 0;

          // Send explicit memory context initialization to server
          try {
            socket.send(
              JSON.stringify({
                type: 'init_memory',
                memoriesPrompt,
              })
            );
          } catch {}

          // Start ping/latency measurement
          this.startPingLoop();

          // Start microphone capture at 16kHz PCM16
          try {
            await audioStreamer.start(
              (base64Chunk) => {
                if (this.connectionId === currentId && !this.isGreetingPlaying) {
                  this.sendAudioChunk(base64Chunk);
                }
              },
              () => this.handleUserInterrupt(),
              () => stateManager.getState() === 'speaking' || audioPlayer.isPlaying() || voiceService.isCurrentlyPlaying()
            );

            if (this.connectionId !== currentId) {
              return;
            }

            stateManager.setState('listening');
            stateManager.notify('MERY Live Link Established', 'success');

            // Handle auto-share or send initial screen frame if already sharing
            if (screenShareService.isSharing()) {
              const snap = screenShareService.captureSingleFrame();
              if (snap) {
                this.sendScreenFrame(snap);
              }
            } else if (screenShareService.getSettings().autoShareOnLiveStart) {
              screenShareService.startScreenShare().then((started) => {
                if (started) {
                  const snap = screenShareService.captureSingleFrame();
                  if (snap) this.sendScreenFrame(snap);
                }
              }).catch(() => {});
            }

            safeResolve(true);
            this.startLiveSpeechRecognition();
          } catch (micErr: any) {
            console.warn('[LiveSession] Microphone access notice:', micErr?.message || micErr);
            stateManager.setError('Microphone permission required for real-time voice.');
            stateManager.setState('disconnected');
            this.disconnect();
            safeResolve(false);
          }
        };

        socket.onmessage = async (event) => {
          if (this.ws !== socket || this.connectionId !== currentId) return;
          try {
            const msg = JSON.parse(event.data);

            if (msg.type === 'ready') {
              console.log(`[LiveSession] Gemini Live ready with model: ${msg.model}`);
              if (!this.isGreetingPlaying) {
                stateManager.setState('listening');
              }
            } else if (msg.type === 'audio') {
              // Received 24kHz PCM audio chunk from Gemini Live
              // Guard against overlapping with greeting speech or interrupted states
              if (!this.isInterrupted && !this.isGreetingPlaying) {
                await audioPlayer.playPCMChunk(msg.data, 24000);
              }
            } else if (msg.type === 'transcript') {
              if (msg.text) {
                this.transcriptListeners.forEach((fn) => fn(msg.text, 'model'));
              }
            } else if (msg.type === 'user_transcript') {
              if (msg.text) {
                this.transcriptListeners.forEach((fn) => fn(msg.text, 'user'));
                this.inspectUserUtteranceForMemory(msg.text);
              }
            } else if (msg.type === 'interrupted') {
              this.handleServerInterrupt();
            } else if (msg.type === 'tool_call') {
              this.handleToolCalls(msg.functionCalls);
            } else if (msg.type === 'turn_complete') {
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
            console.debug('[LiveSession] Message parsing notice:', err?.message || err);
          }
        };

        socket.onerror = () => {
          if (!this.isUserExplicitDisconnect && this.connectionId === currentId) {
            console.debug('[LiveSession] WebSocket connection notice.');
          }
        };

        socket.onclose = (event) => {
          if (this.ws !== socket || this.connectionId !== currentId) return;
          console.log(`[LiveSession] WebSocket closed (code: ${event.code}${event.reason ? `, reason: ${event.reason}` : ''})`);
          this.cleanup();
          safeResolve(false);

          if (!this.isUserExplicitDisconnect) {
            this.scheduleReconnect();
          } else {
            stateManager.setState('disconnected');
          }
        };
      } catch (err: any) {
        console.warn('[LiveSession] Connection initialization notice:', err?.message || err);
        this.cleanup();
        safeResolve(false);

        if (!this.isUserExplicitDisconnect) {
          this.scheduleReconnect();
        } else {
          stateManager.setState('disconnected');
        }
      }
    });

    return this.connectPromise;
  }

  private scheduleReconnect() {
    if (this.isUserExplicitDisconnect || this.reconnectTimer) {
      return;
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('[LiveSession] Max reconnection attempts reached.');
      this.reconnectAttempts = 0;
      stateManager.setState('disconnected');
      stateManager.setError('Live connection disconnected. Press microphone to reconnect.');
      return;
    }

    const backoffMs = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 8000);
    this.reconnectAttempts++;
    console.log(`[LiveSession] Reconnecting in ${backoffMs}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
    stateManager.setState('connecting');

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (!this.isUserExplicitDisconnect && !this.isConnected()) {
        this.connect().catch((err) => {
          console.debug('[LiveSession] Reconnect attempt handled gracefully:', err?.message || err);
        });
      }
    }, backoffMs);
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
    this.isGreetingPlaying = false;

    // 1. Immediately halt audio playback and speech synthesis
    voiceService.stopAudio();
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
    this.isGreetingPlaying = false;
    voiceService.stopAudio();
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

  onTranscript(listener: (text: string, role: 'model' | 'user') => void): () => void {
    this.transcriptListeners.add(listener);
    return () => {
      this.transcriptListeners.delete(listener);
    };
  }

  dispatchTranscript(text: string, role: 'model' | 'user') {
    this.transcriptListeners.forEach((fn) => fn(text, role));
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
      this.transcriptListeners.forEach((fn) => fn(text, 'user'));
      return true;
    } catch (e: any) {
      console.warn('[LiveSession] Text transmission notice:', e?.message || e);
      return false;
    }
  }

  sendScreenFrame(base64: string): boolean {
    if (!this.isConnected() || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return false;
    }
    try {
      this.ws.send(
        JSON.stringify({
          type: 'screen_frame',
          data: base64,
        })
      );
      return true;
    } catch (e: any) {
      console.warn('[LiveSession] Screen frame transmission notice:', e?.message || e);
      return false;
    }
  }

  disconnect() {
    this.isUserExplicitDisconnect = true;
    this.reconnectAttempts = 0;
    this.isGreetingPlaying = false;
    this.stopAllAudio();
    this.cleanup();
    stateManager.setState('disconnected');
    stateManager.setConversationState('IDLE');
    stateManager.notify('MERY Session Disconnected', 'info');
  }

  private cleanup() {
    this.isConnecting = false;
    this.isInterrupted = false;
    this.isGreetingPlaying = false;
    this.connectPromise = null;

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

    if (this.liveSpeechRecognition) {
      try {
        this.liveSpeechRecognition.onresult = null;
        this.liveSpeechRecognition.onend = null;
        this.liveSpeechRecognition.onerror = null;
        this.liveSpeechRecognition.abort();
      } catch {}
      this.liveSpeechRecognition = null;
    }

    this.stopAllAudio();
  }

  /**
   * Dedicated speech recognition listener running alongside audio streamer to ensure
   * crystal-clear Gujarati transcription and immediate UI transcript feedback.
   */
  private startLiveSpeechRecognition(): void {
    const SpeechRecognitionClass =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionClass) return;

    try {
      if (this.liveSpeechRecognition) {
        try {
          this.liveSpeechRecognition.onresult = null;
          this.liveSpeechRecognition.onend = null;
          this.liveSpeechRecognition.onerror = null;
          this.liveSpeechRecognition.abort();
        } catch {}
        this.liveSpeechRecognition = null;
      }

      const rec = new SpeechRecognitionClass();
      rec.continuous = true;
      rec.interimResults = true;
      const lang = stateManager.getLanguage();
      rec.lang = lang === 'auto' ? 'gu-IN' : (lang || 'gu-IN');

      rec.onresult = (event: any) => {
        let interim = '';
        let finalChunk = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const res = event.results[i];
          if (res.isFinal) {
            finalChunk += res[0].transcript + ' ';
          } else {
            interim += res[0].transcript;
          }
        }

        const spoken = (finalChunk || interim).trim();
        if (spoken) {
          // Immediately display user speech on live transcript UI
          this.dispatchTranscript(spoken, 'user');
        }

        if (finalChunk.trim()) {
          const finalUtterance = finalChunk.trim();
          console.log('[LiveSession] Spoken transcript finalized:', finalUtterance);
          this.inspectUserUtteranceForMemory(finalUtterance);
        }
      };

      rec.onerror = (e: any) => {
        if (e.error !== 'no-speech' && e.error !== 'aborted') {
          console.debug('[LiveSession] Live speech recognition advisory:', e?.error);
        }
      };

      rec.onend = () => {
        // Automatically restart speech recognition while live session is active
        if (this.isConnected() && !this.isUserExplicitDisconnect) {
          try {
            rec.start();
          } catch {}
        }
      };

      rec.start();
      this.liveSpeechRecognition = rec;
      console.log(`[LiveSession] Live speech recognition active with locale: ${rec.lang}`);
    } catch (e) {
      console.debug('[LiveSession] Speech recognition initialization note:', e);
    }
  }

  /**
   * Update active language dynamically for both client speech recognition and Gemini Live
   */
  public updateLanguage(newLang: string): void {
    if (this.liveSpeechRecognition) {
      try {
        this.liveSpeechRecognition.abort();
        this.liveSpeechRecognition.lang = newLang === 'auto' ? 'gu-IN' : (newLang || 'gu-IN');
        this.liveSpeechRecognition.start();
        console.log(`[LiveSession] Speech recognition updated to: ${this.liveSpeechRecognition.lang}`);
      } catch {}
    }

    if (this.isConnected()) {
      try {
        this.ws?.send(
          JSON.stringify({
            type: 'set_language',
            language: newLang,
          })
        );
      } catch {}
    }
  }

  /**
   * Automatically detect user preference or fact declarations during live voice turns
   * and save them to permanent memory storage.
   */
  private inspectUserUtteranceForMemory(text: string): void {
    if (!text || text.length < 5) return;
    const cleanText = text.trim();

    // Check for explicit remembering triggers (English & Gujarati)
    const rememberMatch = cleanText.match(/(?:please\s+)?remember\s+(?:that\s+)?(.+)/i);
    const prefMatch = cleanText.match(/(?:i\s+prefer|my\s+favorite|i\s+like|my\s+goal\s+is)\s+(.+)/i);
    const gujRememberMatch = cleanText.match(/(?:યાદ\s+રાખજે|યાદ\s+રાખો)\s*(?:કે)?\s*(.+)/i);

    if (rememberMatch && rememberMatch[1]) {
      const fact = rememberMatch[1].trim();
      memoryManager.addMemory('user_fact', `fact_${Date.now().toString(36)}`, fact, fact, 'fact', 0.95);
    } else if (prefMatch && prefMatch[1]) {
      const pref = prefMatch[1].trim();
      memoryManager.addMemory('preference', `pref_${Date.now().toString(36)}`, pref, cleanText, 'preference', 0.90);
    } else if (gujRememberMatch && gujRememberMatch[1]) {
      const gujFact = gujRememberMatch[1].trim();
      memoryManager.addMemory('gujarati_memory', `guj_${Date.now().toString(36)}`, gujFact, gujFact, 'fact', 0.95);
    }
  }
}

export const liveSession = new LiveSession();
