import { stateManager } from './StateManager';
import { voiceService } from '../utils/audio';

export interface IncomingCallEvent {
  callerName: string;
  phoneNumber: string;
  timestamp: string;
  status: 'ringing' | 'accepted' | 'rejected' | 'missed';
}

class TelephonyBridge {
  private isCapacitorAvailable = false;
  private currentCall: IncomingCallEvent | null = null;
  private listeners: Array<(call: IncomingCallEvent | null) => void> = [];
  private callLog: IncomingCallEvent[] = [];

  constructor() {
    this.detectRuntime();
  }

  private detectRuntime() {
    if (typeof window !== 'undefined' && (window as any).Capacitor) {
      this.isCapacitorAvailable = true;
      this.initNativeTelephonyListener();
    }
  }

  private initNativeTelephonyListener() {
    try {
      const Capacitor = (window as any).Capacitor;
      const Telephony = Capacitor.Plugins?.Telephony || Capacitor.Plugins?.CallDetector;
      if (Telephony) {
        Telephony.addListener('callStateChanged', (state: any) => {
          if (state.state === 'RINGING') {
            this.handleIncomingCall({
              callerName: state.callerName || 'Unknown Caller',
              phoneNumber: state.phoneNumber || 'Private Number',
              timestamp: new Date().toLocaleTimeString(),
              status: 'ringing',
            });
          }
        });
      }
    } catch (e) {
      console.warn('[TelephonyBridge] Notice initializing native plugin:', e);
    }
  }

  public getIsNativeSupported(): boolean {
    return this.isCapacitorAvailable;
  }

  public getCurrentCall(): IncomingCallEvent | null {
    return this.currentCall;
  }

  public getCallLog(): IncomingCallEvent[] {
    return [...this.callLog];
  }

  public handleIncomingCall(call: IncomingCallEvent) {
    this.currentCall = call;
    this.callLog.unshift(call);
    this.notifyListeners();

    // MERY vocal announcement
    const lang = stateManager.getLanguage();
    const announcement =
      lang === 'gu-IN'
        ? `કોલ આવી રહ્યો છે: ${call.callerName}. ઉપાડવો છે કે કાપી નાખવો છે?`
        : `Incoming call from ${call.callerName}. Say accept or reject.`;

    stateManager.notify(`📞 ${announcement}`, 'info');

    try {
      voiceService.speakBrowserVoice(announcement, () => {}, () => {});
    } catch (e) {
      console.warn('[TelephonyBridge] Announcement voice notice:', e);
    }
  }

  public acceptCall() {
    if (!this.currentCall) return;
    this.currentCall.status = 'accepted';
    stateManager.notify(`Call connected with ${this.currentCall.callerName}.`, 'success');

    if (this.isCapacitorAvailable) {
      try {
        const Telephony = (window as any).Capacitor.Plugins?.Telephony;
        Telephony?.answerCall?.();
      } catch {}
    }

    this.currentCall = null;
    this.notifyListeners();
  }

  public rejectCall() {
    if (!this.currentCall) return;
    this.currentCall.status = 'rejected';
    stateManager.notify(`Call from ${this.currentCall.callerName} declined.`, 'info');

    if (this.isCapacitorAvailable) {
      try {
        const Telephony = (window as any).Capacitor.Plugins?.Telephony;
        Telephony?.rejectCall?.();
      } catch {}
    }

    this.currentCall = null;
    this.notifyListeners();
  }

  // Detects voice command intent to accept/reject
  public checkVoiceCallResponse(speech: string): boolean {
    if (!this.currentCall || this.currentCall.status !== 'ringing') return false;
    const lower = speech.toLowerCase();

    // Accept patterns (Gujarati & English)
    if (/\b(accept|answer|pick up|receive|ઉપાડ|હા ઉપાડ|વાત કરાવો)\b/i.test(lower)) {
      this.acceptCall();
      return true;
    }

    // Reject patterns (Gujarati & English)
    if (/\b(reject|decline|drop|cut|કાપી નાખ|ના ઉપાડતો|ના)\b/i.test(lower)) {
      this.rejectCall();
      return true;
    }

    return false;
  }

  // Simulator mode for testing in web preview
  public simulateIncomingCall(callerName = 'Rajesh Patel', phoneNumber = '+91 98250 12345') {
    this.handleIncomingCall({
      callerName,
      phoneNumber,
      timestamp: new Date().toLocaleTimeString(),
      status: 'ringing',
    });
  }

  public subscribe(listener: (call: IncomingCallEvent | null) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach((l) => l(this.currentCall));
  }
}

export const telephonyBridge = new TelephonyBridge();
