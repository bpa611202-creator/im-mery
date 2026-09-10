import { ActivityContext, ActivityPattern } from '../types';

export class ActivityMonitor {
  private context: ActivityContext = {
    currentApp: 'Visual Studio Code — Project Workspace',
    activityPattern: 'coding',
    focusMinutes: 42,
    keystrokesPerMinute: 68,
    mouseEventsPerMinute: 120,
    timeOfDay: 'evening',
    batteryLevel: null,
    isCharging: null,
    cpuLoadEstimate: 28,
    networkOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    activeMusicTrack: 'Ambient Cyberpunk Rain — 432Hz Focus Pad',
  };

  private keystrokeCounter = 0;
  private mouseMoveCounter = 0;
  private listeners: ((ctx: ActivityContext) => void)[] = [];
  private sampleTimer: any = null;
  private focusTimer: any = null;

  constructor() {
    this.detectTimeOfDay();
    this.initBattery();
    this.initEventListeners();
    this.startFocusCounter();
  }

  private detectTimeOfDay() {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) {
      this.context.timeOfDay = 'morning';
    } else if (hour >= 12 && hour < 17) {
      this.context.timeOfDay = 'afternoon';
    } else if (hour >= 17 && hour < 22) {
      this.context.timeOfDay = 'evening';
    } else {
      this.context.timeOfDay = 'late_night';
    }
  }

  private async initBattery() {
    if (typeof navigator !== 'undefined' && 'getBattery' in navigator) {
      try {
        const battery: any = await (navigator as any).getBattery();
        this.context.batteryLevel = Math.round(battery.level * 100);
        this.context.isCharging = battery.charging;
        this.notify();

        battery.addEventListener('levelchange', () => {
          this.context.batteryLevel = Math.round(battery.level * 100);
          this.notify();
        });
        battery.addEventListener('chargingchange', () => {
          this.context.isCharging = battery.charging;
          this.notify();
        });
      } catch {}
    }
  }

  private initEventListeners() {
    if (typeof window === 'undefined') return;

    window.addEventListener('keydown', () => {
      this.keystrokeCounter++;
    });

    window.addEventListener('mousemove', () => {
      this.mouseMoveCounter++;
    });

    window.addEventListener('online', () => {
      this.context.networkOnline = true;
      this.notify();
    });

    window.addEventListener('offline', () => {
      this.context.networkOnline = false;
      this.notify();
    });

    // Sample keystroke and mouse event rates every 10 seconds
    this.sampleTimer = setInterval(() => {
      this.detectTimeOfDay();
      const kpm = this.keystrokeCounter * 6;
      const mpm = this.mouseMoveCounter * 6;
      this.context.keystrokesPerMinute = Math.min(220, Math.round(this.context.keystrokesPerMinute * 0.4 + kpm * 0.6));
      this.context.mouseEventsPerMinute = Math.min(300, Math.round(this.context.mouseEventsPerMinute * 0.4 + mpm * 0.6));

      // Simulate CPU load based on activity
      const load = 18 + Math.min(60, Math.round(kpm * 0.2 + mpm * 0.1));
      this.context.cpuLoadEstimate = load;

      this.keystrokeCounter = 0;
      this.mouseMoveCounter = 0;
      this.notify();
    }, 10000);
  }

  private startFocusCounter() {
    this.focusTimer = setInterval(() => {
      this.context.focusMinutes += 1;
      this.notify();
    }, 60000);
  }

  public getContext(): ActivityContext {
    return { ...this.context };
  }

  public subscribe(listener: (ctx: ActivityContext) => void): () => void {
    this.listeners.push(listener);
    listener(this.getContext());
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach((l) => l(this.getContext()));
  }

  // Switch active simulated application
  public switchApp(app: string, pattern: ActivityPattern) {
    this.context.currentApp = app;
    this.context.activityPattern = pattern;
    this.context.focusMinutes = 0; // reset focus clock for new session
    this.notify();
  }

  public setActiveMusicTrack(track: string | null) {
    this.context.activeMusicTrack = track;
    this.notify();
  }

  public resetFocusSession() {
    this.context.focusMinutes = 0;
    this.notify();
  }
}

export const activityMonitor = new ActivityMonitor();
