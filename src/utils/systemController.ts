import { SystemApp, VirtualFile, SystemReminder, SystemNote, SmartHomeDevice, SafetyActionRequest } from '../types';

export class SystemController {
  private apps: SystemApp[] = [
    { id: 'app-vscode', name: 'Visual Studio Code', category: 'dev', iconName: 'Code2', status: 'running', cpuUsage: 14, url: 'https://github.com' },
    { id: 'app-chrome', name: 'Google Chrome', category: 'productivity', iconName: 'Globe', status: 'running', cpuUsage: 22, url: 'https://google.com' },
    { id: 'app-figma', name: 'Figma — UI System', category: 'creative', iconName: 'Layout', status: 'minimized', cpuUsage: 8, url: 'https://figma.com' },
    { id: 'app-terminal', name: 'Zsh Terminal [M4 Core]', category: 'dev', iconName: 'Terminal', status: 'running', cpuUsage: 4 },
    { id: 'app-spotify', name: 'Spotify — Ambient Focus', category: 'media', iconName: 'Music', status: 'running', cpuUsage: 6 },
    { id: 'app-obsidian', name: 'Obsidian Notes Vault', category: 'productivity', iconName: 'FileText', status: 'closed', cpuUsage: 0 },
    { id: 'app-blender', name: 'Blender 4.2 3D', category: 'creative', iconName: 'Box', status: 'closed', cpuUsage: 0 },
  ];

  private files: VirtualFile[] = [
    { id: 'f-1', name: 'm4-mery-companion-spec.md', path: '/projects/m4/spec.md', size: '14.2 KB', type: 'document', updatedAt: 'Today, 20:15', content: 'MERY system specification and voice-native neural blueprint.' },
    { id: 'f-2', name: 'ambient-synthesizer-weights.bin', path: '/neural/weights.bin', size: '184 MB', type: 'code', updatedAt: 'Yesterday', content: 'Acoustic resonance weights.' },
    { id: 'f-3', name: 'video-script-ai-companion.docx', path: '/creators/youtube/script.docx', size: '48.1 KB', type: 'document', updatedAt: '2 days ago', content: 'TECH GPT YouTube script draft on MERY and real-time voice AI.' },
    { id: 'f-4', name: 'aurora-rose-theme-tokens.json', path: '/design/theme.json', size: '8.4 KB', type: 'code', updatedAt: '3 days ago', content: '{"primary":"#9D7BFF","accent":"#E7B7A5"}' },
    { id: 'f-5', name: 'binaural-rain-soundscape.flac', path: '/audio/rain.flac', size: '32.6 MB', type: 'audio', updatedAt: 'Last week' },
  ];

  private reminders: SystemReminder[] = [
    { id: 'rem-1', title: 'Stretch and drink some warm water', timeString: 'Every 2 hours', dueTimestamp: Date.now() + 1000 * 60 * 35, completed: false },
    { id: 'rem-2', title: 'Review MERY live voice latency metrics', timeString: 'Tomorrow, 10:00 AM', dueTimestamp: Date.now() + 1000 * 60 * 60 * 14, completed: false },
  ];

  private notes: SystemNote[] = [
    { id: 'n-1', title: 'MERY Voice Synthesis Notes', content: 'Natural conversation requires micro-pauses, human breathing markers, and warm resonance.', updatedAt: 'Just now' },
    { id: 'n-2', title: 'M4 Architecture Roadmap', content: 'Full-duplex microphone listening with instant barge-in and proactive conversational timing.', updatedAt: 'Yesterday' },
  ];

  private smartDevices: SmartHomeDevice[] = [
    { id: 'dev-light', name: 'Studio Aurora Ambient Light', type: 'light', state: true, value: '#9D7BFF' },
    { id: 'dev-desk', name: 'Desk Halo Glow', type: 'light', state: true, value: '#E7B7A5' },
    { id: 'dev-temp', name: 'Studio Thermostat', type: 'thermostat', state: true, value: '70°F' },
    { id: 'dev-sound', name: 'Acoustic Soundstage', type: 'sound', state: true, value: 'Binaural 432Hz' },
  ];

  private isMediaPlaying = false;
  private currentTrack = 'Ambient Cyberpunk Rain — 432Hz Focus Pad';
  private masterVolume = 85;
  private brightness = 95;
  private safetyCallback: ((request: SafetyActionRequest) => void) | null = null;
  private changeListeners: (() => void)[] = [];

  // Web Audio Synth for ambient soundscape
  private audioCtx: AudioContext | null = null;
  private synthOsc1: OscillatorNode | null = null;
  private synthOsc2: OscillatorNode | null = null;
  private synthGain: GainNode | null = null;
  private noiseNode: AudioBufferSourceNode | null = null;

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    try {
      const savedFiles = localStorage.getItem('mery_virtual_files');
      if (savedFiles) this.files = JSON.parse(savedFiles);

      const savedReminders = localStorage.getItem('mery_reminders');
      if (savedReminders) this.reminders = JSON.parse(savedReminders);

      const savedNotes = localStorage.getItem('mery_notes');
      if (savedNotes) this.notes = JSON.parse(savedNotes);

      const savedDevices = localStorage.getItem('mery_smart_devices');
      if (savedDevices) this.smartDevices = JSON.parse(savedDevices);
    } catch {}
  }

  private saveToStorage() {
    try {
      localStorage.setItem('mery_virtual_files', JSON.stringify(this.files));
      localStorage.setItem('mery_reminders', JSON.stringify(this.reminders));
      localStorage.setItem('mery_notes', JSON.stringify(this.notes));
      localStorage.setItem('mery_smart_devices', JSON.stringify(this.smartDevices));
    } catch {}
    this.notify();
  }

  public subscribe(listener: () => void): () => void {
    this.changeListeners.push(listener);
    return () => {
      this.changeListeners = this.changeListeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    this.changeListeners.forEach((l) => l());
  }

  public setSafetyHandler(handler: (request: SafetyActionRequest) => void) {
    this.safetyCallback = handler;
  }

  // Getters
  public getApps() { return [...this.apps]; }
  public getFiles() { return [...this.files]; }
  public getReminders() { return [...this.reminders]; }
  public getNotes() { return [...this.notes]; }
  public getSmartDevices() { return [...this.smartDevices]; }
  public getMediaState() {
    return {
      isPlaying: this.isMediaPlaying,
      currentTrack: this.currentTrack,
      volume: this.masterVolume,
      brightness: this.brightness,
    };
  }

  // Application Control
  public launchApp(nameOrId: string): string {
    const target = this.apps.find((a) => a.id === nameOrId || a.name.toLowerCase().includes(nameOrId.toLowerCase()));
    if (target) {
      target.status = 'running';
      target.cpuUsage = Math.floor(Math.random() * 15) + 8;
      this.notify();
      return `Launched ${target.name}`;
    }
    // Create dynamically if new
    const newApp: SystemApp = {
      id: `app-${Date.now()}`,
      name: nameOrId,
      category: 'productivity',
      iconName: 'AppWindow',
      status: 'running',
      cpuUsage: 12,
    };
    this.apps.unshift(newApp);
    this.notify();
    return `Launched ${nameOrId}`;
  }

  public closeApp(nameOrId: string): string {
    const target = this.apps.find((a) => a.id === nameOrId || a.name.toLowerCase().includes(nameOrId.toLowerCase()));
    if (target) {
      target.status = 'closed';
      target.cpuUsage = 0;
      this.notify();
      return `Closed ${target.name}`;
    }
    return `Could not find application ${nameOrId}`;
  }

  // File Management with SAFETY CONFIRMATION for dangerous actions
  public createFile(name: string, type: 'document' | 'code' | 'audio' | 'folder' = 'document', content = ''): string {
    const newFile: VirtualFile = {
      id: `f-${Date.now()}`,
      name,
      path: `/${name}`,
      size: `${(Math.random() * 20 + 2).toFixed(1)} KB`,
      type,
      updatedAt: 'Just now',
      content,
    };
    this.files.unshift(newFile);
    this.saveToStorage();
    return `Created ${name}`;
  }

  public renameFile(id: string, newName: string): boolean {
    const f = this.files.find((file) => file.id === id);
    if (f) {
      f.name = newName;
      f.updatedAt = 'Just now';
      this.saveToStorage();
      return true;
    }
    return false;
  }

  public deleteFileWithSafety(id: string): Promise<boolean> {
    const f = this.files.find((file) => file.id === id);
    if (!f) return Promise.resolve(false);

    return new Promise((resolve) => {
      if (!this.safetyCallback) {
        // Fallback standard window confirmation if modal handler not attached
        const ok = window.confirm(`Safety Confirmation: Are you sure you want MERY to permanently delete "${f.name}"?`);
        if (ok) {
          this.files = this.files.filter((file) => file.id !== id);
          this.saveToStorage();
          resolve(true);
        } else {
          resolve(false);
        }
        return;
      }

      this.safetyCallback({
        id: `safety-${Date.now()}`,
        actionType: 'delete_file',
        title: 'Confirm File Deletion',
        description: `MERY is requesting safety confirmation before deleting "${f.name}". This action cannot be undone.`,
        targetId: id,
        onConfirm: () => {
          this.files = this.files.filter((file) => file.id !== id);
          this.saveToStorage();
          resolve(true);
        },
        onCancel: () => {
          resolve(false);
        },
      });
    });
  }

  // Media Playback with real Web Audio synthesis
  public toggleMediaPlayback(): boolean {
    if (this.isMediaPlaying) {
      this.pauseMedia();
    } else {
      this.playMedia();
    }
    return this.isMediaPlaying;
  }

  public playMedia(trackName?: string) {
    if (trackName) this.currentTrack = trackName;
    this.isMediaPlaying = true;
    this.startAmbientSynth();
    this.notify();
  }

  public pauseMedia() {
    this.isMediaPlaying = false;
    this.stopAmbientSynth();
    this.notify();
  }

  public setVolume(vol: number) {
    this.masterVolume = Math.max(0, Math.min(100, vol));
    if (this.synthGain && this.audioCtx) {
      this.synthGain.gain.setValueAtTime((this.masterVolume / 100) * 0.08, this.audioCtx.currentTime);
    }
    this.notify();
  }

  public setBrightness(bright: number) {
    this.brightness = Math.max(50, Math.min(100, bright));
    if (typeof document !== 'undefined') {
      document.documentElement.style.filter = `brightness(${this.brightness}%)`;
    }
    this.notify();
  }

  // Web Audio Synth for ambient soothing background soundscape
  private startAmbientSynth() {
    try {
      if (typeof window === 'undefined') return;
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;

      if (!this.audioCtx) {
        this.audioCtx = new AudioContextClass();
      }
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      this.stopAmbientSynth();

      const now = this.audioCtx.currentTime;
      this.synthGain = this.audioCtx.createGain();
      this.synthGain.gain.setValueAtTime(0.001, now);
      this.synthGain.gain.exponentialRampToValueAtTime((this.masterVolume / 100) * 0.08, now + 2);
      this.synthGain.connect(this.audioCtx.destination);

      // Warm Binaural 432Hz and 436Hz sine tones with subtle LFO
      this.synthOsc1 = this.audioCtx.createOscillator();
      this.synthOsc1.type = 'sine';
      this.synthOsc1.frequency.setValueAtTime(216, now); // A3 harmonic

      this.synthOsc2 = this.audioCtx.createOscillator();
      this.synthOsc2.type = 'sine';
      this.synthOsc2.frequency.setValueAtTime(219.5, now); // 3.5Hz theta beat

      this.synthOsc1.connect(this.synthGain);
      this.synthOsc2.connect(this.synthGain);

      this.synthOsc1.start(now);
      this.synthOsc2.start(now);
    } catch {}
  }

  private stopAmbientSynth() {
    try {
      if (this.synthGain && this.audioCtx) {
        this.synthGain.gain.setValueAtTime(this.synthGain.gain.value, this.audioCtx.currentTime);
        this.synthGain.gain.exponentialRampToValueAtTime(0.0001, this.audioCtx.currentTime + 1);
      }
      setTimeout(() => {
        try {
          this.synthOsc1?.stop();
          this.synthOsc2?.stop();
          this.synthOsc1?.disconnect();
          this.synthOsc2?.disconnect();
          this.synthOsc1 = null;
          this.synthOsc2 = null;
        } catch {}
      }, 1100);
    } catch {}
  }

  // Reminders
  public addReminder(title: string, timeString = 'In 30 mins', minutesFromNow = 30): SystemReminder {
    const newRem: SystemReminder = {
      id: `rem-${Date.now()}`,
      title,
      timeString,
      dueTimestamp: Date.now() + minutesFromNow * 60 * 1000,
      completed: false,
    };
    this.reminders.unshift(newRem);
    this.saveToStorage();

    // Schedule notification trigger
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
      setTimeout(() => {
        if (Notification.permission === 'granted') {
          try {
            new Notification(`MERY Reminder: ${title}`, {
              body: "I promised I'd remind you about this. Take care!",
              icon: '/icon.png',
            });
          } catch {}
        }
      }, minutesFromNow * 60 * 1000);
    }

    return newRem;
  }

  public toggleReminder(id: string) {
    const r = this.reminders.find((item) => item.id === id);
    if (r) {
      r.completed = !r.completed;
      this.saveToStorage();
    }
  }

  public deleteReminder(id: string) {
    this.reminders = this.reminders.filter((r) => r.id !== id);
    this.saveToStorage();
  }

  // Notes
  public addNote(title: string, content: string): SystemNote {
    const newNote: SystemNote = {
      id: `note-${Date.now()}`,
      title,
      content,
      updatedAt: 'Just now',
    };
    this.notes.unshift(newNote);
    this.saveToStorage();
    return newNote;
  }

  public deleteNote(id: string) {
    this.notes = this.notes.filter((n) => n.id !== id);
    this.saveToStorage();
  }

  // Smart Home
  public toggleSmartDevice(id: string) {
    const d = this.smartDevices.find((item) => item.id === id);
    if (d) {
      d.state = !d.state;
      this.saveToStorage();
    }
  }

  // Launch URL or Web Search
  public searchWeb(query: string) {
    if (typeof window !== 'undefined') {
      window.open(`https://www.google.com/search?q=${encodeURIComponent(query)}`, '_blank');
    }
  }
}

export const systemController = new SystemController();
