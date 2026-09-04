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

    // Baseline modulation (Neutral)
    let rate = 0.98;
    let pitch = 1.04;
    let stability = 0.65;
    let style = 0.25;
    let similarityBoost = 0.80;
    let volume = 1.0;
    let pauseDurationMs = 250;
    let deliveryTone: VoiceModulationConfig['deliveryTone'] = 'neutral';

    // Strategy-driven adaptation
    switch (strategy) {
      case 'EXCITED':
        // Scaled by emotional intensity
        rate = 1.04 + intensity * 0.12; // 1.04 - 1.16
        pitch = 1.06 + intensity * 0.10; // 1.06 - 1.16
        stability = Math.max(0.35, 0.60 - intensity * 0.25); // more expressive pitch inflections
        style = Math.min(0.55, 0.20 + intensity * 0.35);
        pauseDurationMs = 180;
        deliveryTone = intensity > 0.6 ? 'energetic' : 'bright';
        break;

      case 'PLAYFUL':
        rate = 1.02 + intensity * 0.08;
        pitch = 1.08 + intensity * 0.06;
        stability = 0.50;
        style = 0.35;
        pauseDurationMs = 200;
        deliveryTone = 'bright';
        break;

      case 'SUPPORTIVE':
      case 'EMPATHETIC':
        // User is sad, disappointed, or vulnerable. Softer, calm, patient, gentle delivery
        rate = Math.max(0.86, 0.94 - intensity * 0.08); // 0.86 - 0.94
        pitch = 1.00 - intensity * 0.04; // slightly lowered, soothing
        stability = 0.75; // steady, warm, reassuring
        style = 0.20;
        volume = Math.max(0.85, 1.0 - intensity * 0.12); // softer volume
        pauseDurationMs = 380 + Math.round(intensity * 120); // longer natural breathing pauses
        deliveryTone = 'gentle';
        break;

      case 'CALM':
        // For angry, stressed, or tired users: stay calm, de-escalate, never mirror aggression
        rate = Math.max(0.88, 0.95 - intensity * 0.07);
        pitch = 0.99;
        stability = 0.80;
        style = 0.15;
        volume = 0.92;
        pauseDurationMs = 350;
        deliveryTone = 'relaxed';
        break;

      case 'REASSURING':
        // For nervous, anxious, or hesitant users: reassuring, grounded, confident
        rate = 0.92;
        pitch = 1.02;
        stability = 0.78;
        style = 0.20;
        pauseDurationMs = 320;
        deliveryTone = 'gentle';
        break;

      case 'SERIOUS':
      case 'SOLUTION_FOCUSED':
        // Focused, crisp articulation, lower conversational energy, steady pacing
        rate = 0.93;
        pitch = 0.98;
        stability = 0.82;
        style = 0.15;
        pauseDurationMs = 280;
        deliveryTone = 'serious';
        break;

      case 'CURIOUS':
        // Inquisitive, slightly lifted cadence at sentence boundaries
        rate = 0.98;
        pitch = 1.07;
        stability = 0.58;
        style = 0.30;
        pauseDurationMs = 220;
        deliveryTone = 'bright';
        break;

      case 'NEUTRAL':
      default:
        // Everyday balanced delivery
        rate = 0.98;
        pitch = 1.04;
        stability = 0.65;
        style = 0.20;
        pauseDurationMs = 250;
        deliveryTone = 'neutral';
        break;
    }

    // Specific user emotion fine-tuning
    if (primary === 'tired' || primary === 'stressed') {
      rate = Math.min(rate, 0.90);
      volume = Math.min(volume, 0.88);
      pauseDurationMs = Math.max(pauseDurationMs, 400);
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
