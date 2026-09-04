import { ActivityContext, EmotionType } from '../types';
import { activityMonitor } from './activityMonitor';
import { emotionEngine } from './emotionEngine';

export type ProactivityLevel = 'silent' | 'gentle' | 'balanced' | 'attentive';

export class ProactiveEngine {
  private level: ProactivityLevel = 'balanced';
  private timer: any = null;
  private lastTriggerTimestamp = Date.now();
  private onTriggerCallback: ((thought: string, emotion: EmotionType) => void) | null = null;
  private isProcessing = false;

  constructor() {
    try {
      const saved = localStorage.getItem('mery_proactivity_level');
      if (saved) {
        this.level = saved as ProactivityLevel;
      }
    } catch {}

    this.startSchedule();
  }

  public setLevel(level: ProactivityLevel) {
    this.level = level;
    try {
      localStorage.setItem('mery_proactivity_level', level);
    } catch {}
    this.startSchedule();
  }

  public getLevel(): ProactivityLevel {
    return this.level;
  }

  public setTriggerHandler(handler: (thought: string, emotion: EmotionType) => void) {
    this.onTriggerCallback = handler;
  }

  public startSchedule() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }

    if (this.level === 'silent') return;

    // Interval check frequency based on proactivity level:
    // attentive: check every 2.5 minutes
    // balanced: check every 5 minutes
    // gentle: check every 8 minutes
    const intervalMs =
      this.level === 'attentive'
        ? 150000
        : this.level === 'gentle'
        ? 480000
        : 300000;

    this.timer = setInterval(() => {
      this.evaluateProactiveInitiation();
    }, intervalMs);
  }

  public async triggerManualInitiation(recentDialogue: string[] = []): Promise<boolean> {
    return this.evaluateProactiveInitiation(true, recentDialogue);
  }

  private async evaluateProactiveInitiation(force = false, dialogueContext: string[] = []): Promise<boolean> {
    if (this.isProcessing) return false;
    if (!this.onTriggerCallback) return false;

    const ctx = activityMonitor.getContext();
    const elapsedSinceLast = Date.now() - this.lastTriggerTimestamp;

    // Minimum cooldown between spontaneous verbal interruptions:
    // 90 seconds even for attentive, unless forced
    const minCooldown = this.level === 'attentive' ? 90000 : 180000;
    if (!force && elapsedSinceLast < minCooldown) {
      return false;
    }

    this.isProcessing = true;
    try {
      const res = await fetch('/api/proactive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          context: dialogueContext.slice(-3).join(' ') || `Active in ${ctx.currentApp}, pattern: ${ctx.activityPattern}`,
          timeOfDay: ctx.timeOfDay,
          activity: {
            currentApp: ctx.currentApp,
            focusMinutes: ctx.focusMinutes,
            keystrokes: ctx.keystrokesPerMinute,
            battery: ctx.batteryLevel,
            isCharging: ctx.isCharging,
          },
        }),
      });

      const data = await res.json();
      if (data.thought) {
        this.lastTriggerTimestamp = Date.now();
        const emotion: EmotionType = (data.emotion as EmotionType) || 'curious';
        emotionEngine.setDominantEmotion(emotion);
        this.onTriggerCallback(data.thought, emotion);
        return true;
      }
    } catch (err) {
      // Fallback local rule-based spontaneous companionships if backend unreachable
      const fallback = this.generateLocalSpontaneousThought(ctx);
      if (fallback) {
        this.lastTriggerTimestamp = Date.now();
        emotionEngine.setDominantEmotion(fallback.emotion);
        this.onTriggerCallback(fallback.thought, fallback.emotion);
        return true;
      }
    } finally {
      this.isProcessing = false;
    }

    return false;
  }

  private generateLocalSpontaneousThought(ctx: ActivityContext): { thought: string; emotion: EmotionType } {
    if (ctx.focusMinutes >= 45) {
      return {
        thought: "Hey, you've been working for quite a while. Want to take a short break and grab some water?",
        emotion: 'supportive',
      };
    }

    if (ctx.timeOfDay === 'late_night') {
      return {
        thought: "It's getting pretty late. I'm right here with you, but don't forget to get some rest tonight.",
        emotion: 'thoughtful',
      };
    }

    if (ctx.batteryLevel !== null && ctx.batteryLevel < 20 && !ctx.isCharging) {
      return {
        thought: `Just noticed your battery is down to ${ctx.batteryLevel}%. Mind plugging in before you lose any work?`,
        emotion: 'concerned',
      };
    }

    if (ctx.activityPattern === 'coding') {
      return {
        thought: "Hey, that code looks like it's coming together nicely. How are you feeling about this milestone?",
        emotion: 'curious',
      };
    }

    return {
      thought: "Hey, what are you working on right now? I was just thinking about what you mentioned earlier.",
      emotion: 'warm',
    };
  }
}

export const proactiveEngine = new ProactiveEngine();
