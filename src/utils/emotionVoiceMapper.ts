import {
  EmotionalResponseStrategy,
  UserEmotionState,
  UserEmotionType,
  VoiceModulationConfig,
} from '../types';

/**
 * EMOTION-TO-VOICE MAPPER
 *
 * Implements Section 10 & 11:
 * Emotion Engine -> Emotion-to-Voice Mapper -> TTS Provider Interface -> Selected Voice Provider
 *
 * Adapts speaking rate, pitch, stability, expressiveness, pause duration, and tone
 * based on the user's detected emotional state, intensity, and active response strategy.
 */
export class EmotionVoiceMapper {
  /**
   * Generates abstract VoiceModulationConfig independent of any specific TTS provider
   */
  public mapEmotionToVoice(
    userEmotion: UserEmotionState,
    strategy: EmotionalResponseStrategy
  ): VoiceModulationConfig {
    const { primary, intensity } = userEmotion;

    // Baseline modulation (Natural female register - centered at un-mangled 1.00 acoustic pitch)
    let rate = 1.0;
    let pitch = 1.00;
    let stability = 0.65;
    let style = 0.25;
    let similarityBoost = 0.80;
    let volume = 1.0;
    let pauseDurationMs = 250;
    let deliveryTone: VoiceModulationConfig['deliveryTone'] = 'neutral';

    // Strategy-driven adaptation (Micro-inflections only to retain pristine human fidelity)
    switch (strategy) {
      case 'EXCITED':
        rate = 1.02 + intensity * 0.04; // 1.02 - 1.06
        pitch = 1.01 + intensity * 0.02; // 1.01 - 1.03 (bright, natural human inflection)
        stability = Math.max(0.45, 0.60 - intensity * 0.15);
        style = Math.min(0.40, 0.20 + intensity * 0.20);
        pauseDurationMs = 200;
        deliveryTone = intensity > 0.6 ? 'energetic' : 'bright';
        break;

      case 'PLAYFUL':
        rate = 1.01 + intensity * 0.03;
        pitch = 1.01 + intensity * 0.01;
        stability = 0.55;
        style = 0.30;
        pauseDurationMs = 220;
        deliveryTone = 'bright';
        break;

      case 'SUPPORTIVE':
      case 'EMPATHETIC':
        // User is sad, disappointed, or vulnerable. Softer, calm, patient, gentle delivery
        rate = Math.max(0.92, 0.98 - intensity * 0.05); // 0.92 - 0.98
        pitch = Math.max(0.98, 1.00 - intensity * 0.02); // warm, gentle, calm human tone
        stability = 0.75;
        style = 0.20;
        volume = Math.max(0.88, 1.0 - intensity * 0.10);
        pauseDurationMs = 350 + Math.round(intensity * 100);
        deliveryTone = 'gentle';
        break;

      case 'CALM':
        // For angry, stressed, or tired users: stay calm, de-escalate, never mirror aggression
        rate = Math.max(0.94, 0.98 - intensity * 0.04);
        pitch = 0.99;
        stability = 0.80;
        style = 0.15;
        volume = 0.95;
        pauseDurationMs = 320;
        deliveryTone = 'relaxed';
        break;

      case 'REASSURING':
        // For nervous, anxious, or hesitant users: reassuring, grounded, confident
        rate = 0.96;
        pitch = 1.00;
        stability = 0.78;
        style = 0.20;
        pauseDurationMs = 300;
        deliveryTone = 'gentle';
        break;

      case 'SERIOUS':
      case 'SOLUTION_FOCUSED':
        // Focused, crisp articulation, steady pacing
        rate = 0.98;
        pitch = 0.99;
        stability = 0.82;
        style = 0.15;
        pauseDurationMs = 260;
        deliveryTone = 'serious';
        break;

      case 'CURIOUS':
        // Inquisitive, slightly lifted cadence at sentence boundaries
        rate = 1.00;
        pitch = 1.02;
        stability = 0.60;
        style = 0.25;
        pauseDurationMs = 220;
        deliveryTone = 'bright';
        break;

      case 'NEUTRAL':
      default:
        // Everyday balanced natural delivery
        rate = 1.00;
        pitch = 1.00;
        stability = 0.65;
        style = 0.20;
        pauseDurationMs = 250;
        deliveryTone = 'neutral';
        break;
    }

    // Specific user emotion fine-tuning
    if (primary === 'tired' || primary === 'stressed') {
      rate = Math.min(rate, 0.94);
      volume = Math.min(volume, 0.90);
      pauseDurationMs = Math.max(pauseDurationMs, 380);
      deliveryTone = 'gentle';
    }

    return {
      rate: Number(rate.toFixed(2)),
      pitch: Number(pitch.toFixed(2)),
      stability: Number(stability.toFixed(2)),
      style: Number(style.toFixed(2)),
      similarityBoost: Number(similarityBoost.toFixed(2)),
      volume: Number(volume.toFixed(2)),
      pauseDurationMs,
      deliveryTone,
    };
  }
}

export const emotionVoiceMapper = new EmotionVoiceMapper();
