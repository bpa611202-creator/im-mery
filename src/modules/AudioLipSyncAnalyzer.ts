/**
 * Real-time Audio Lip-Sync and Viseme Analyzer for MERY
 * Analyzes audio streams from Gemini Live PCM, TTS providers, and Web Audio
 * to generate smoothed mouth visemes: A, I, U, E, O and mouthOpen.
 */

import { audioPlayer } from './AudioPlayer';
import { voiceService } from '../utils/audio';

export interface VisemeWeights {
  mouthOpen: number; // 0 to 1
  aa: number;        // 'A' sound (jaw drop, open throat)
  ih: number;        // 'I' sound (wide lip stretch)
  ou: number;        // 'U' sound (pursed / rounded lips)
  ee: number;        // 'E' sound (medium open smile)
  oh: number;        // 'O' sound (round open mouth)
  volume: number;    // Raw volume level 0 to 1
}

export class AudioLipSyncAnalyzer {
  private currentVisemes: VisemeWeights = {
    mouthOpen: 0,
    aa: 0,
    ih: 0,
    ou: 0,
    ee: 0,
    oh: 0,
    volume: 0,
  };

  private targetVisemes: VisemeWeights = {
    mouthOpen: 0,
    aa: 0,
    ih: 0,
    ou: 0,
    ee: 0,
    oh: 0,
    volume: 0,
  };

  private lastUpdateTime: number = performance.now();
  private syntheticPhonemePhase: number = 0;

  /**
   * Update and retrieve current smoothed viseme values.
   * Call inside useFrame(delta) in Three.js render loop.
   */
  public update(delta: number, isSpeakingState: boolean): VisemeWeights {
    const now = performance.now();
    const dt = Math.min(delta, 0.1);

    const isAudioPlaying = audioPlayer.isPlaying();
    const isVoiceServicePlaying = voiceService.isCurrentlyPlaying();
    const isSpeaking = isSpeakingState || isAudioPlaying || isVoiceServicePlaying;

    let rawVolume = 0;

    if (isAudioPlaying) {
      rawVolume = audioPlayer.getVolume();
      const freq = audioPlayer.getFrequencyData();

      if (rawVolume > 0.02 && freq.length > 0) {
        // Formant analysis
        // Low bins (formant F1: 200 - 800 Hz) -> vowels A, O
        let lowEnergy = 0;
        const lowCount = Math.max(1, Math.floor(freq.length * 0.2));
        for (let i = 0; i < lowCount; i++) lowEnergy += freq[i];
        lowEnergy /= (lowCount * 255);

        // Mid bins (formant F2: 900 - 2200 Hz) -> vowels U, E
        let midEnergy = 0;
        const midStart = lowCount;
        const midEnd = Math.floor(freq.length * 0.5);
        for (let i = midStart; i < midEnd; i++) midEnergy += freq[i];
        midEnergy /= (Math.max(1, midEnd - midStart) * 255);

        // High bins (formant F3: 2300 - 4500 Hz) -> vowel I, sibilants
        let highEnergy = 0;
        const highStart = midEnd;
        const highEnd = freq.length;
        for (let i = highStart; i < highEnd; i++) highEnergy += freq[i];
        highEnergy /= (Math.max(1, highEnd - highStart) * 255);

        const openAmount = Math.min(1, rawVolume * 1.8);
        this.targetVisemes.mouthOpen = openAmount;
        this.targetVisemes.aa = Math.min(1, lowEnergy * 1.6);
        this.targetVisemes.oh = Math.min(1, lowEnergy * 1.2 * (1 - highEnergy));
        this.targetVisemes.ee = Math.min(1, midEnergy * 1.4);
        this.targetVisemes.ih = Math.min(1, highEnergy * 1.8);
        this.targetVisemes.ou = Math.min(1, (midEnergy + lowEnergy) * 0.8 * (1 - highEnergy));
        this.targetVisemes.volume = rawVolume;
      } else {
        this.resetTargets();
      }
    } else if (isSpeaking) {
      // Procedural synthetic prosody wave for WebSpeech synthesis or speaking states
      this.syntheticPhonemePhase += dt * 11;
      const t = this.syntheticPhonemePhase;

      // Realistic speech modulation cadence: alternating syllables with natural pauses
      const syllable = (Math.sin(t * 1.6) + Math.sin(t * 3.1) * 0.5 + Math.cos(t * 0.8) * 0.3);
      const isPause = Math.sin(t * 0.4) < -0.65; // Natural micropause between phrases

      if (isPause) {
        this.resetTargets();
      } else {
        const energy = Math.max(0, Math.min(1, (syllable + 0.9) * 0.55));
        this.targetVisemes.volume = energy;
        this.targetVisemes.mouthOpen = energy * 0.85;
        this.targetVisemes.aa = Math.max(0, Math.sin(t * 2.2)) * energy;
        this.targetVisemes.ee = Math.max(0, Math.cos(t * 1.8)) * energy * 0.8;
        this.targetVisemes.ih = Math.max(0, Math.sin(t * 3.4)) * energy * 0.6;
        this.targetVisemes.ou = Math.max(0, Math.cos(t * 2.6)) * energy * 0.7;
        this.targetVisemes.oh = Math.max(0, Math.sin(t * 1.4)) * energy * 0.6;
      }
    } else {
      this.resetTargets();
    }

    // Fast attack (smoothing speed 22), smooth gentle decay (smoothing speed 14)
    const attackSpeed = 24 * dt;
    const decaySpeed = 16 * dt;

    const lerp = (curr: number, target: number) => {
      const speed = target > curr ? attackSpeed : decaySpeed;
      return curr + (target - curr) * Math.min(1, speed);
    };

    this.currentVisemes.mouthOpen = lerp(this.currentVisemes.mouthOpen, this.targetVisemes.mouthOpen);
    this.currentVisemes.aa = lerp(this.currentVisemes.aa, this.targetVisemes.aa);
    this.currentVisemes.ih = lerp(this.currentVisemes.ih, this.targetVisemes.ih);
    this.currentVisemes.ou = lerp(this.currentVisemes.ou, this.targetVisemes.ou);
    this.currentVisemes.ee = lerp(this.currentVisemes.ee, this.targetVisemes.ee);
    this.currentVisemes.oh = lerp(this.currentVisemes.oh, this.targetVisemes.oh);
    this.currentVisemes.volume = lerp(this.currentVisemes.volume, this.targetVisemes.volume);

    this.lastUpdateTime = now;
    return this.currentVisemes;
  }

  private resetTargets() {
    this.targetVisemes.mouthOpen = 0;
    this.targetVisemes.aa = 0;
    this.targetVisemes.ih = 0;
    this.targetVisemes.ou = 0;
    this.targetVisemes.ee = 0;
    this.targetVisemes.oh = 0;
    this.targetVisemes.volume = 0;
  }
}

export const lipSyncAnalyzer = new AudioLipSyncAnalyzer();
