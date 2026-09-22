/**
 * AvatarBehaviorEngine.ts
 * 
 * Realistic Human-like Female VRM Behavior & Animation Engine for MERY
 * 
 * Implements:
 * 1. Natural Relaxed Standing Base Pose (ELIMINATES T-pose permanently)
 * 2. Multi-harmonic organic breathing (chest, shoulders, spine, subtle clothing)
 * 3. Context-aware feminine conversational gestures (speech-synchronized, non-repetitive)
 * 4. Human-like listening behavior (attentive gaze, acknowledgment micro-nods, subtle head tilts)
 * 5. Pensive thinking behavior (thoughtful gaze drift, subtle head angle, relaxed posture)
 * 6. Autonomous multi-style blinking & micro-saccades (natural eye movement)
 * 7. Comprehensive emotion modulation across face, eyes, brows, head, shoulders & posture
 * 8. Strict gesture priority & cooldown scheduler (prevents random animation flapping)
 * 9. Smooth spherical & damped interpolation (no bone snapping or pops)
 * 10. High-performance mobile-friendly design with pre-allocated math buffers
 */

import * as THREE from 'three';
import { VRM, VRMHumanBoneName } from '@pixiv/three-vrm';
import { EmotionType } from '../../types';
import { VisemeWeights } from '../../modules/AudioLipSyncAnalyzer';

export type BehaviorState = 'idle' | 'listening' | 'thinking' | 'speaking';

export type GestureType =
  | 'none'
  | 'explain_right'
  | 'explain_left'
  | 'explain_both'
  | 'thoughtful_chest'
  | 'heart_touch'
  | 'emphasis_beat'
  | 'greeting_wave'
  | 'listening_nod';

export interface TransformTarget {
  rotX: number;
  rotY: number;
  rotZ: number;
  posX?: number;
  posY?: number;
  posZ?: number;
}

/**
 * Procedural Natural Relaxed Feminine Base Pose definitions
 * All angles in radians.
 */
export const FEMININE_RELAXED_BASE = {
  // Spine & Chest: Natural gentle S-curve, comfortable upright posture
  spine: { rotX: 0.015, rotY: 0.0, rotZ: 0.0 },
  chest: { rotX: 0.012, rotY: 0.0, rotZ: 0.0 },
  neck: { rotX: 0.018, rotY: 0.0, rotZ: 0.0 },
  head: { rotX: -0.02, rotY: 0.0, rotZ: 0.005 },

  // Shoulders: Naturally dropped and relaxed (not tensed up or stretched horizontally)
  leftShoulder: { rotX: 0.0, rotY: 0.02, rotZ: 0.08 },
  rightShoulder: { rotX: 0.0, rotY: -0.02, rotZ: -0.08 },

  // Arms: Relaxed down at sides
  leftUpperArm: { rotX: 0.12, rotY: -0.08, rotZ: -1.40 },
  rightUpperArm: { rotX: 0.12, rotY: 0.08, rotZ: 1.40 },

  // Forearms: Gently angled forward/inward
  leftLowerArm: { rotX: -0.18, rotY: -0.10, rotZ: 0.12 },
  rightLowerArm: { rotX: -0.18, rotY: 0.10, rotZ: -0.12 },

  // Wrists / Hands: Relaxed neutral drape
  leftHand: { rotX: 0.05, rotY: -0.05, rotZ: 0.05 },
  rightHand: { rotX: 0.05, rotY: 0.05, rotZ: -0.05 },

  // Fingers: Naturally relaxed curl (not rigid flat planks)
  fingerCurlProximal: 0.24,
  fingerCurlIntermediate: 0.32,
  fingerCurlDistal: 0.18,
  thumbCurl: 0.15,

  // Pelvis / Hips: Subtle resting feminine weight shift
  hips: { posX: 0.0, posY: 0.0, posZ: 0.0, rotX: 0.0, rotY: 0.0, rotZ: 0.015 },
  leftUpperLeg: { rotX: 0.02, rotY: 0.02, rotZ: -0.02 },
  rightUpperLeg: { rotX: -0.01, rotY: -0.02, rotZ: 0.02 },
};

export class AvatarBehaviorEngine {
  // Pre-allocated math temporaries for GC-free per-frame calculation
  private static _vec1 = new THREE.Vector3();
  private static _vec2 = new THREE.Vector3();
  private static _quat1 = new THREE.Quaternion();
  private static _quat2 = new THREE.Quaternion();
  private static _euler = new THREE.Euler();

  // Primary behavioral state
  private currentState: BehaviorState = 'idle';
  private previousState: BehaviorState = 'idle';
  private stateEnterTime: number = 0;

  // Emotion and modulation
  private currentEmotion: EmotionType = 'warm';
  private emotionIntensity: number = 1.0;

  // Weight shift cycle (natural subtle shifting between legs over time)
  private weightShiftPhase: number = 0;
  private weightShiftDirection: number = 1;
  private nextWeightShiftTime: number = 8.0;

  // Organic Breathing state (multi-harmonic)
  private breathPhase: number = 0;
  private breathRate: number = 1.6; // ~15-16 breaths per minute

  // Blinking system
  private blinkState = {
    nextBlinkTime: 2.0,
    isBlinking: false,
    blinkStartTime: 0,
    blinkDuration: 0.16,
    blinkType: 'single' as 'single' | 'flutter_double' | 'slow_gentle' | 'saccade_blink',
    blinkAmount: 0,
  };

  // Eye Saccades & Attention gaze tracking
  private gazeState = {
    nextSaccadeTime: 2.5,
    isGlancing: false,
    glanceEndTime: 0,
    targetEyeX: 0,
    targetEyeY: 0,
    currentEyeX: 0,
    currentEyeY: 0,
    targetHeadYaw: 0,
    targetHeadPitch: 0,
    targetHeadRoll: 0,
    currentHeadYaw: 0,
    currentHeadPitch: 0,
    currentHeadRoll: 0,
  };

  // Conversational Gestures & Priority Scheduler
  private activeGesture: GestureType = 'none';
  private gestureStartTime: number = 0;
  private gestureDuration: number = 2.4;
  private gestureBlendWeight: number = 0;
  private lastGestureEndTime: number = 0;
  private gestureCooldown: number = 4.2; // Seconds before another major hand gesture
  private lastWaveTime: number = -999;
  private waveCooldown: number = 16.0; // Wave cannot trigger repeatedly

  // Listening acknowledgment nods
  private listeningNodState = {
    active: false,
    startTime: 0,
    duration: 0.9,
    amount: 0,
    nextNodAllowedTime: 0,
  };

  // Conversational speech cadence tracker
  private speechTracking = {
    phraseStartTime: 0,
    speechRhythmPhase: 0,
    emphasisPhase: 0,
    syllableCadence: 0,
    lastSpeakingState: false,
  };

  // Dynamic bone target map
  private currentBoneTargets: Record<string, TransformTarget> = {};

  constructor() {
    this.initBoneTargets();
  }

  /**
   * Initializes baseline bone targets with feminine relaxed resting pose
   */
  private initBoneTargets() {
    const bones = [
      'hips',
      'spine',
      'chest',
      'upperChest',
      'neck',
      'head',
      'leftShoulder',
      'rightShoulder',
      'leftUpperArm',
      'rightUpperArm',
      'leftLowerArm',
      'rightLowerArm',
      'leftHand',
      'rightHand',
      'leftUpperLeg',
      'rightUpperLeg',
      'leftLowerLeg',
      'rightLowerLeg',
    ];

    bones.forEach((b) => {
      this.currentBoneTargets[b] = { rotX: 0, rotY: 0, rotZ: 0 };
    });
  }

  /**
   * Sets companion behavioral state (idle, listening, thinking, speaking)
   */
  public setState(newState: BehaviorState, currentTime: number) {
    if (this.currentState !== newState) {
      this.previousState = this.currentState;
      this.currentState = newState;
      this.stateEnterTime = currentTime;

      // On entering listening: reset gaze to look attentively at user
      if (newState === 'listening') {
        this.gazeState.targetEyeX = 0;
        this.gazeState.targetEyeY = 0;
        this.gazeState.targetHeadYaw = 0.015;
        this.gazeState.targetHeadPitch = -0.01;
        this.gazeState.targetHeadRoll = 0.025; // Gentle curious tilt
        this.listeningNodState.nextNodAllowedTime = currentTime + 2.5 + Math.random() * 2.0;
      }

      // On entering thinking: gentle thoughtful look-away
      if (newState === 'thinking') {
        const side = Math.random() < 0.5 ? -1 : 1;
        this.gazeState.targetHeadYaw = side * 0.08;
        this.gazeState.targetHeadPitch = 0.045;
        this.gazeState.targetHeadRoll = -side * 0.035;
        this.gazeState.targetEyeX = side * 0.008;
        this.gazeState.targetEyeY = 0.006;
      }

      // On entering speaking: initialize speech timing
      if (newState === 'speaking') {
        this.speechTracking.phraseStartTime = currentTime;
        this.speechTracking.speechRhythmPhase = 0;
        this.gazeState.targetEyeX = 0;
        this.gazeState.targetEyeY = 0;
      }

      // Smoothly wind down gestures if switching states
      if (newState === 'idle' && this.activeGesture !== 'none') {
        this.gestureDuration = Math.min(this.gestureDuration, currentTime - this.gestureStartTime + 0.4);
      }
    }
  }

  public getState(): BehaviorState {
    return this.currentState;
  }

  /**
   * Sets companion emotional state
   */
  public setEmotion(emotion: EmotionType, intensity: number = 1.0) {
    this.currentEmotion = emotion;
    this.emotionIntensity = Math.max(0, Math.min(1.5, intensity));
  }

  public getEmotion(): EmotionType {
    return this.currentEmotion;
  }

  /**
   * Trigger single context-appropriate greeting wave (never loops, respect cooldown)
   */
  public triggerGreetingWave(currentTime: number): boolean {
    if (currentTime - this.lastWaveTime < this.waveCooldown) {
      return false; // On cooldown
    }
    this.activeGesture = 'greeting_wave';
    this.gestureStartTime = currentTime;
    this.gestureDuration = 2.8;
    this.lastWaveTime = currentTime;
    this.lastGestureEndTime = currentTime + 2.8;
    return true;
  }

  /**
   * Main per-frame update loop
   */
  public update(dt: number, currentTime: number, isSpeaking: boolean, visemes?: VisemeWeights) {
    // 1. Synchronize speaking state
    if (isSpeaking && this.currentState !== 'speaking') {
      this.setState('speaking', currentTime);
    } else if (!isSpeaking && this.currentState === 'speaking') {
      this.setState('idle', currentTime);
    }

    // 2. Organic Multi-Harmonic Breathing
    this.updateBreathing(dt);

    // 3. Weight Shift in Standing Posture
    this.updateWeightShift(dt, currentTime);

    // 4. Autonomous Blinking
    this.updateBlinking(dt, currentTime);

    // 5. Gaze, Saccades & Head Orientation
    this.updateGazeAndHead(dt, currentTime);

    // 6. Conversational Gesture Scheduler (Context & Speech-aware)
    this.updateGestureScheduler(dt, currentTime, isSpeaking, visemes);

    // 7. Listening Micro-Nods
    this.updateListeningNods(dt, currentTime);

    // 8. Compute Synthesized Bone Rotations with Blending
    this.computeBoneTargets(dt, currentTime);
  }

  /**
   * Multi-harmonic irregular breathing formula
   */
  private updateBreathing(dt: number) {
    this.breathPhase += dt * this.breathRate;
    // Irregular harmonics so breathing doesn't feel mechanical
    // Combines primary sine wave with subtle secondary harmonics
  }

  /**
   * Standing weight shift between legs
   */
  private updateWeightShift(dt: number, t: number) {
    if (t > this.nextWeightShiftTime) {
      this.weightShiftDirection = -this.weightShiftDirection;
      this.nextWeightShiftTime = t + 12.0 + Math.random() * 10.0;
    }
    const targetPhase = this.weightShiftDirection;
    this.weightShiftPhase = THREE.MathUtils.lerp(this.weightShiftPhase, targetPhase, dt * 0.35);
  }

  /**
   * Autonomous Blinking with realistic variable duration & styles
   */
  private updateBlinking(dt: number, t: number) {
    const isIdle = this.currentState === 'idle';

    if (!this.blinkState.isBlinking) {
      if (t > this.blinkState.nextBlinkTime) {
        this.blinkState.isBlinking = true;
        this.blinkState.blinkStartTime = t;

        const roll = Math.random();
        if (isIdle && roll < 0.20) {
          this.blinkState.blinkType = 'flutter_double';
          this.blinkState.blinkDuration = 0.26;
        } else if (isIdle && roll < 0.35) {
          this.blinkState.blinkType = 'slow_gentle';
          this.blinkState.blinkDuration = 0.22;
        } else {
          this.blinkState.blinkType = 'single';
          this.blinkState.blinkDuration = 0.14;
        }
      }
    } else {
      const elapsed = t - this.blinkState.blinkStartTime;
      const dur = this.blinkState.blinkDuration;

      if (elapsed < dur) {
        const p = elapsed / dur;
        if (this.blinkState.blinkType === 'single') {
          this.blinkState.blinkAmount = Math.sin(p * Math.PI);
        } else if (this.blinkState.blinkType === 'flutter_double') {
          const sub = p * 2;
          this.blinkState.blinkAmount = sub < 1 ? Math.sin(sub * Math.PI) : Math.sin((sub - 1) * Math.PI);
        } else {
          // Slow gentle blink
          this.blinkState.blinkAmount = Math.pow(Math.sin(p * Math.PI), 0.85);
        }
      } else {
        this.blinkState.isBlinking = false;
        this.blinkState.blinkAmount = 0;
        // Interval: 2.2 to 4.5s
        const nextInt = isIdle ? 2.2 + Math.random() * 2.5 : 3.0 + Math.random() * 2.8;
        this.blinkState.nextBlinkTime = t + nextInt;
      }
    }
  }

  /**
   * Realistic Gaze Saccades & Conversational Head Movements
   */
  private updateGazeAndHead(dt: number, t: number) {
    const g = this.gazeState;

    if (this.currentState === 'idle') {
      if (!g.isGlancing) {
        if (t > g.nextSaccadeTime) {
          g.isGlancing = true;
          g.glanceEndTime = t + 1.2 + Math.random() * 1.4;

          const roll = Math.random();
          if (roll < 0.35) {
            // Glance left
            g.targetHeadYaw = -0.11 - Math.random() * 0.04;
            g.targetHeadPitch = 0.01;
            g.targetHeadRoll = 0.02;
            g.targetEyeX = -0.009;
            g.targetEyeY = 0.002;
          } else if (roll < 0.70) {
            // Glance right
            g.targetHeadYaw = 0.11 + Math.random() * 0.04;
            g.targetHeadPitch = 0.01;
            g.targetHeadRoll = -0.02;
            g.targetEyeX = 0.009;
            g.targetEyeY = 0.002;
          } else if (roll < 0.85) {
            // Thoughtful look up
            g.targetHeadYaw = -0.05;
            g.targetHeadPitch = 0.045;
            g.targetHeadRoll = 0.015;
            g.targetEyeX = -0.005;
            g.targetEyeY = 0.006;
          } else {
            // Modest downward glance
            g.targetHeadYaw = 0.04;
            g.targetHeadPitch = -0.045;
            g.targetHeadRoll = -0.01;
            g.targetEyeX = 0.003;
            g.targetEyeY = -0.005;
          }

          // Trigger micro-blink on gaze shift (saccadic suppression reflex)
          if (!this.blinkState.isBlinking && Math.random() < 0.6) {
            this.blinkState.isBlinking = true;
            this.blinkState.blinkStartTime = t;
            this.blinkState.blinkDuration = 0.12;
            this.blinkState.blinkType = 'single';
          }
        }
      } else {
        if (t > g.glanceEndTime) {
          g.isGlancing = false;
          g.targetEyeX = 0;
          g.targetEyeY = 0;
          g.targetHeadYaw = (Math.random() - 0.5) * 0.03;
          g.targetHeadPitch = -0.015 + (Math.random() - 0.5) * 0.02;
          g.targetHeadRoll = (Math.random() - 0.5) * 0.02;
          g.nextSaccadeTime = t + 2.5 + Math.random() * 3.2;
        }
      }
    } else if (this.currentState === 'listening') {
      // Attentive listening orientation toward user
      g.targetEyeX = 0;
      g.targetEyeY = 0;
      g.targetHeadYaw = 0.015;
      g.targetHeadPitch = -0.01;
      g.targetHeadRoll = 0.025; // Gentle feminine head tilt
    } else if (this.currentState === 'thinking') {
      // Pensive gaze slightly away
      g.targetEyeX = 0.007;
      g.targetEyeY = 0.005;
      g.targetHeadYaw = 0.07;
      g.targetHeadPitch = 0.04;
      g.targetHeadRoll = -0.03;
    } else if (this.currentState === 'speaking') {
      // Centered on user with lively conversational micro-motion
      g.targetEyeX = (Math.random() - 0.5) * 0.002;
      g.targetEyeY = (Math.random() - 0.5) * 0.002;
      g.targetHeadYaw = (Math.random() - 0.5) * 0.04;
      g.targetHeadPitch = -0.02;
      g.targetHeadRoll = (Math.random() - 0.5) * 0.03;
    }

    // Smooth lerp to targets
    const eyeLerpSpeed = dt * 12.0;
    g.currentEyeX = THREE.MathUtils.lerp(g.currentEyeX, g.targetEyeX, eyeLerpSpeed);
    g.currentEyeY = THREE.MathUtils.lerp(g.currentEyeY, g.targetEyeY, eyeLerpSpeed);

    const headLerpSpeed = dt * 3.0;
    g.currentHeadYaw = THREE.MathUtils.lerp(g.currentHeadYaw, g.targetHeadYaw, headLerpSpeed);
    g.currentHeadPitch = THREE.MathUtils.lerp(g.currentHeadPitch, g.targetHeadPitch, headLerpSpeed);
    g.currentHeadRoll = THREE.MathUtils.lerp(g.currentHeadRoll, g.targetHeadRoll, headLerpSpeed);
  }

  /**
   * Listening Acknowledgment Micro-Nods (when user speaks)
   */
  private updateListeningNods(dt: number, t: number) {
    const nod = this.listeningNodState;
    if (this.currentState === 'listening') {
      if (!nod.active && t > nod.nextNodAllowedTime) {
        // Trigger subtle acknowledgment nod
        nod.active = true;
        nod.startTime = t;
        nod.duration = 0.85;
        nod.nextNodAllowedTime = t + 4.5 + Math.random() * 4.0; // Cooldown
      }

      if (nod.active) {
        const elapsed = t - nod.startTime;
        if (elapsed < nod.duration) {
          const p = elapsed / nod.duration;
          // Smooth bell curve nod (pitch down then return)
          nod.amount = Math.sin(p * Math.PI) * 0.042;
        } else {
          nod.active = false;
          nod.amount = 0;
        }
      }
    } else {
      nod.active = false;
      nod.amount = 0;
    }
  }

  /**
   * Context-aware conversational gesture scheduler
   * Chooses appropriate gestures when speaking based on emotion and cadence.
   * STRICT COOLDOWNS PREVENT REPETITIVE WAVING OR FLAPPING.
   */
  private updateGestureScheduler(dt: number, t: number, isSpeaking: boolean, visemes?: VisemeWeights) {
    // 1. If currently playing a gesture, track blend weight
    if (this.activeGesture !== 'none') {
      // If speech abruptly stopped mid-gesture, smoothly accelerate return directly to the relaxed base pose
      if (!isSpeaking) {
        this.gestureBlendWeight = Math.max(0, this.gestureBlendWeight - dt * 2.8);
        if (this.gestureBlendWeight <= 0.001) {
          this.activeGesture = 'none';
          this.gestureBlendWeight = 0;
          this.lastGestureEndTime = t;
          this.gestureCooldown = 2.0 + Math.random() * 2.0;
        }
        return;
      }

      const elapsed = t - this.gestureStartTime;
      const dur = this.gestureDuration;

      if (elapsed < dur) {
        const p = elapsed / dur;
        // Smooth ease-in from back pose (0.0 -> 0.28) and gentle ease-out return (0.68 -> 1.0)
        if (p < 0.28) {
          this.gestureBlendWeight = THREE.MathUtils.smoothstep(p, 0, 0.28);
        } else if (p > 0.68) {
          this.gestureBlendWeight = 1.0 - THREE.MathUtils.smoothstep(p, 0.68, 1.0);
        } else {
          this.gestureBlendWeight = 1.0;
        }
      } else {
        // Gesture ended: smoothly returned 100% to relaxed back pose
        this.activeGesture = 'none';
        this.gestureBlendWeight = 0;
        this.lastGestureEndTime = t;
        // Cooldown ensuring natural cadence
        this.gestureCooldown = 2.0 + Math.random() * 2.0;
      }
    }

    // 2. If speaking and no gesture is active, evaluate whether to trigger one
    if (isSpeaking && this.activeGesture === 'none') {
      const timeSinceLast = t - this.lastGestureEndTime;
      const speakingDuration = t - this.speechTracking.phraseStartTime;

      // Ensure minimum cooldown before allowing another gesture
      if (timeSinceLast > this.gestureCooldown && speakingDuration > 0.35) {
        // Volume or energy threshold from visemes
        const energy = visemes?.volume || (visemes?.mouthOpen || 0);

        if (energy > 0.08 || speakingDuration > 0.6) {
          // Select gesture based on emotion & context
          const emo = this.currentEmotion;
          let selected: GestureType = 'explain_right';
          let dur = 2.6;

          if (emo === 'warm' || emo === 'supportive') {
            selected = Math.random() < 0.6 ? 'heart_touch' : 'explain_right';
            dur = 2.9;
          } else if (emo === 'excited' || emo === 'playful') {
            selected = Math.random() < 0.5 ? 'explain_both' : 'emphasis_beat';
            dur = 2.4;
          } else if (emo === 'thoughtful' || emo === 'curious') {
            selected = 'thoughtful_chest';
            dur = 2.7;
          } else {
            // Normal conversation: single hand gesture
            selected = Math.random() < 0.7 ? 'explain_right' : 'explain_left';
            dur = 2.5;
          }

          this.activeGesture = selected;
          this.gestureStartTime = t;
          this.gestureDuration = dur;
          this.gestureBlendWeight = 0;
          // Pre-set cooldown for after this gesture finishes
          this.gestureCooldown = 2.0 + Math.random() * 2.0;
        }
      }
    }
  }

  /**
   * Computes final bone transformations by blending FEMININE_RELAXED_BASE with:
   * - Breathing
   * - Weight shift
   * - Emotion posture
   * - Head look / tilt / speech cadence
   * - Active gesture blend
   */
  private computeBoneTargets(dt: number, t: number) {
    const base = FEMININE_RELAXED_BASE;
    const emo = this.currentEmotion;

    // Organic Breathing Oscillations
    const breathT = this.breathPhase;
    const breathPrimary = Math.sin(breathT);
    const breathHarmonic = Math.sin(breathT * 1.62 + 0.8) * 0.28;
    const breathVal = breathPrimary + breathHarmonic; // Multi-harmonic

    // Emotion Adjustments to Base Posture
    let emoShoulderY = 0;
    let emoChestPitch = 0;
    let emoSpinePitch = 0;

    if (emo === 'happy' || emo === 'excited' || emo === 'playful') {
      emoChestPitch = -0.015; // Lifted chest
      emoShoulderY = 0.01;
    } else if (emo === 'sad' || emo === 'disappointed' || emo === 'tired') {
      emoChestPitch = 0.025; // Slightly slumped chest
      emoSpinePitch = 0.02;
      emoShoulderY = -0.02; // Dropped shoulders
    } else if (emo === 'confused' || emo === 'nervous') {
      emoChestPitch = -0.01;
      emoShoulderY = 0.015;
    }

    // Weight Shift on Hips & Legs
    const ws = this.weightShiftPhase * 0.018; // 18mm sway

    // 1. Hips / Pelvis
    this.currentBoneTargets['hips'] = {
      rotX: 0,
      rotY: 0,
      rotZ: base.hips.rotZ + ws * 0.8,
      posX: ws,
      posY: Math.abs(ws) * -0.005,
      posZ: 0,
    };

    // 2. Spine & Chest (Breathing + Emotion)
    const spineBreathPitch = breathVal * 0.007;
    const chestBreathPitch = breathVal * 0.012;
    const chestSway = Math.sin(t * 0.8) * 0.006;

    this.currentBoneTargets['spine'] = {
      rotX: base.spine.rotX + emoSpinePitch + spineBreathPitch,
      rotY: 0,
      rotZ: -ws * 0.4,
    };

    this.currentBoneTargets['chest'] = {
      rotX: base.chest.rotX + emoChestPitch + chestBreathPitch,
      rotY: 0,
      rotZ: chestSway - ws * 0.4,
    };

    // 3. Neck & Head
    const g = this.gazeState;
    const speechNod = this.currentState === 'speaking' ? Math.sin(t * 4.8) * 0.024 : 0;
    const listeningNod = this.listeningNodState.amount;

    this.currentBoneTargets['neck'] = {
      rotX: base.neck.rotX + g.currentHeadPitch * 0.25 + listeningNod * 0.3,
      rotY: g.currentHeadYaw * 0.25,
      rotZ: g.currentHeadRoll * 0.25,
    };

    this.currentBoneTargets['head'] = {
      rotX: base.head.rotX + g.currentHeadPitch + speechNod + listeningNod,
      rotY: g.currentHeadYaw,
      rotZ: base.head.rotZ + g.currentHeadRoll,
    };

    // 4. Shoulders (Subtle breath rise + emotion)
    const shoulderBreath = breathVal * 0.005;
    this.currentBoneTargets['leftShoulder'] = {
      rotX: base.leftShoulder.rotX,
      rotY: base.leftShoulder.rotY,
      rotZ: base.leftShoulder.rotZ + shoulderBreath + emoShoulderY,
    };
    this.currentBoneTargets['rightShoulder'] = {
      rotX: base.rightShoulder.rotX,
      rotY: base.rightShoulder.rotY,
      rotZ: base.rightShoulder.rotZ - shoulderBreath - emoShoulderY,
    };

    // 5. Arms & Hands: Start from FEMININE_RELAXED_BASE and blend active gesture
    let rUpperArm = { ...base.rightUpperArm };
    let rLowerArm = { ...base.rightLowerArm };
    let rHand = { ...base.rightHand };

    let lUpperArm = { ...base.leftUpperArm };
    let lLowerArm = { ...base.leftLowerArm };
    let lHand = { ...base.leftHand };

    // Apply Active Gesture if any
    const gw = this.gestureBlendWeight;

    if (this.activeGesture === 'greeting_wave' && gw > 0) {
      const elapsed = t - this.gestureStartTime;
      const waveWiggle = Math.sin(elapsed * 9.0) * 0.28;

      // Raise right arm into friendly feminine wave
      const waveUpperArm = { rotX: 0.25, rotY: -0.2, rotZ: -1.35 };
      const waveLowerArm = { rotX: -0.85, rotY: -0.15, rotZ: -0.75 + waveWiggle };
      const waveHand = { rotX: 0.1, rotY: -0.2, rotZ: waveWiggle * 0.8 };

      rUpperArm = this.lerpTransform(rUpperArm, waveUpperArm, gw);
      rLowerArm = this.lerpTransform(rLowerArm, waveLowerArm, gw);
      rHand = this.lerpTransform(rHand, waveHand, gw);
    } else if (this.activeGesture === 'explain_right' && gw > 0) {
      // Right hand raises gracefully to mid-chest, palm open toward user
      const explainUpper = { rotX: 0.45, rotY: -0.25, rotZ: -0.65 };
      const explainLower = { rotX: -1.05, rotY: -0.35, rotZ: -0.45 };
      const explainHand = { rotX: 0.2, rotY: -0.35, rotZ: 0.15 };

      rUpperArm = this.lerpTransform(rUpperArm, explainUpper, gw);
      rLowerArm = this.lerpTransform(rLowerArm, explainLower, gw);
      rHand = this.lerpTransform(rHand, explainHand, gw);
    } else if (this.activeGesture === 'explain_left' && gw > 0) {
      // Left hand raises gracefully
      const explainUpper = { rotX: 0.45, rotY: 0.25, rotZ: 0.65 };
      const explainLower = { rotX: -1.05, rotY: 0.35, rotZ: 0.45 };
      const explainHand = { rotX: 0.2, rotY: 0.35, rotZ: -0.15 };

      lUpperArm = this.lerpTransform(lUpperArm, explainUpper, gw);
      lLowerArm = this.lerpTransform(lLowerArm, explainLower, gw);
      lHand = this.lerpTransform(lHand, explainHand, gw);
    } else if (this.activeGesture === 'explain_both' && gw > 0) {
      // Both hands raise slightly in warm open gesture
      const rUpper = { rotX: 0.35, rotY: -0.15, rotZ: -0.75 };
      const rLower = { rotX: -0.85, rotY: -0.25, rotZ: -0.35 };
      const rH = { rotX: 0.15, rotY: -0.2, rotZ: 0.1 };

      const lUpper = { rotX: 0.35, rotY: 0.15, rotZ: 0.75 };
      const lLower = { rotX: -0.85, rotY: 0.25, rotZ: 0.35 };
      const lH = { rotX: 0.15, rotY: 0.2, rotZ: -0.1 };

      rUpperArm = this.lerpTransform(rUpperArm, rUpper, gw);
      rLowerArm = this.lerpTransform(rLowerArm, rLower, gw);
      rHand = this.lerpTransform(rHand, rH, gw);

      lUpperArm = this.lerpTransform(lUpperArm, lUpper, gw);
      lLowerArm = this.lerpTransform(lLowerArm, lLower, gw);
      lHand = this.lerpTransform(lHand, lH, gw);
    } else if (this.activeGesture === 'thoughtful_chest' && gw > 0) {
      // One hand raised near collarbone/chest
      const rUpper = { rotX: 0.42, rotY: -0.35, rotZ: -0.55 };
      const rLower = { rotX: -1.35, rotY: -0.4, rotZ: 0.2 };
      const rH = { rotX: 0.35, rotY: -0.25, rotZ: 0.25 };

      rUpperArm = this.lerpTransform(rUpperArm, rUpper, gw);
      rLowerArm = this.lerpTransform(rLowerArm, rLower, gw);
      rHand = this.lerpTransform(rHand, rH, gw);
    } else if (this.activeGesture === 'heart_touch' && gw > 0) {
      // Hand gently over heart
      const rUpper = { rotX: 0.38, rotY: -0.4, rotZ: -0.45 };
      const rLower = { rotX: -1.45, rotY: -0.3, rotZ: 0.35 };
      const rH = { rotX: 0.2, rotY: -0.15, rotZ: 0.15 };

      rUpperArm = this.lerpTransform(rUpperArm, rUpper, gw);
      rLowerArm = this.lerpTransform(rLowerArm, rLower, gw);
      rHand = this.lerpTransform(rHand, rH, gw);
    } else if (this.activeGesture === 'emphasis_beat' && gw > 0) {
      // Subtle conversational down-beat emphasis
      const rUpper = { rotX: 0.3, rotY: -0.1, rotZ: -0.95 };
      const rLower = { rotX: -0.65, rotY: -0.2, rotZ: -0.25 };
      const rH = { rotX: 0.25, rotY: -0.15, rotZ: 0.05 };

      rUpperArm = this.lerpTransform(rUpperArm, rUpper, gw);
      rLowerArm = this.lerpTransform(rLowerArm, rLower, gw);
      rHand = this.lerpTransform(rHand, rH, gw);
    }

    this.currentBoneTargets['rightUpperArm'] = rUpperArm;
    this.currentBoneTargets['rightLowerArm'] = rLowerArm;
    this.currentBoneTargets['rightHand'] = rHand;

    this.currentBoneTargets['leftUpperArm'] = lUpperArm;
    this.currentBoneTargets['leftLowerArm'] = lLowerArm;
    this.currentBoneTargets['leftHand'] = lHand;

    // Legs: Counter-balance the hip weight shift
    this.currentBoneTargets['leftUpperLeg'] = {
      rotX: base.leftUpperLeg.rotX,
      rotY: base.leftUpperLeg.rotY,
      rotZ: base.leftUpperLeg.rotZ - ws * 0.6,
    };
    this.currentBoneTargets['rightUpperLeg'] = {
      rotX: base.rightUpperLeg.rotX,
      rotY: base.rightUpperLeg.rotY,
      rotZ: base.rightUpperLeg.rotZ - ws * 0.6,
    };
  }

  private lerpTransform(a: TransformTarget, b: TransformTarget, t: number): TransformTarget {
    return {
      rotX: THREE.MathUtils.lerp(a.rotX, b.rotX, t),
      rotY: THREE.MathUtils.lerp(a.rotY, b.rotY, t),
      rotZ: THREE.MathUtils.lerp(a.rotZ, b.rotZ, t),
      posX: a.posX !== undefined && b.posX !== undefined ? THREE.MathUtils.lerp(a.posX, b.posX, t) : undefined,
      posY: a.posY !== undefined && b.posY !== undefined ? THREE.MathUtils.lerp(a.posY, b.posY, t) : undefined,
      posZ: a.posZ !== undefined && b.posZ !== undefined ? THREE.MathUtils.lerp(a.posZ, b.posZ, t) : undefined,
    };
  }

  /**
   * Applies behavioral targets to a VRM model with smooth exponential dampening
   */
  public applyToVRM(vrm: VRM, dt: number, currentTime: number, isSpeaking: boolean, visemes?: VisemeWeights) {
    if (!vrm || !vrm.humanoid) return;
    const humanoid = vrm.humanoid;
    const expressionManager = vrm.expressionManager;

    const smoothSpeed = 7.5; // Lambda for dampening
    const blendFactor = Math.min(1.0, dt * smoothSpeed);

    // Apply Bone Rotations
    const boneMap: Array<{ name: VRMHumanBoneName; key: string }> = [
      { name: 'hips', key: 'hips' },
      { name: 'spine', key: 'spine' },
      { name: 'chest', key: 'chest' },
      { name: 'neck', key: 'neck' },
      { name: 'head', key: 'head' },
      { name: 'leftShoulder', key: 'leftShoulder' },
      { name: 'rightShoulder', key: 'rightShoulder' },
      { name: 'leftUpperArm', key: 'leftUpperArm' },
      { name: 'rightUpperArm', key: 'rightUpperArm' },
      { name: 'leftLowerArm', key: 'leftLowerArm' },
      { name: 'rightLowerArm', key: 'rightLowerArm' },
      { name: 'leftHand', key: 'leftHand' },
      { name: 'rightHand', key: 'rightHand' },
      { name: 'leftUpperLeg', key: 'leftUpperLeg' },
      { name: 'rightUpperLeg', key: 'rightUpperLeg' },
    ];

    boneMap.forEach(({ name, key }) => {
      const node = humanoid.getNormalizedBoneNode(name);
      const target = this.currentBoneTargets[key];
      if (node && target) {
        node.rotation.x = THREE.MathUtils.lerp(node.rotation.x, target.rotX, blendFactor);
        node.rotation.y = THREE.MathUtils.lerp(node.rotation.y, target.rotY, blendFactor);
        node.rotation.z = THREE.MathUtils.lerp(node.rotation.z, target.rotZ, blendFactor);

        if (name === 'hips' && target.posX !== undefined) {
          node.position.x = THREE.MathUtils.lerp(node.position.x, target.posX, blendFactor);
        }
      }
    });

    // Apply Soft Natural Finger Relaxation (curl fingers so they aren't flat planks)
    const baseCurl = FEMININE_RELAXED_BASE.fingerCurlProximal;
    const interCurl = FEMININE_RELAXED_BASE.fingerCurlIntermediate;

    const fingerBones: Array<{ name: VRMHumanBoneName; curl: number }> = [
      { name: 'leftIndexProximal', curl: baseCurl },
      { name: 'leftIndexIntermediate', curl: interCurl },
      { name: 'leftMiddleProximal', curl: baseCurl * 1.05 },
      { name: 'leftMiddleIntermediate', curl: interCurl * 1.05 },
      { name: 'leftRingProximal', curl: baseCurl * 1.1 },
      { name: 'leftRingIntermediate', curl: interCurl * 1.1 },
      { name: 'leftLittleProximal', curl: baseCurl * 1.15 },
      { name: 'leftLittleIntermediate', curl: interCurl * 1.15 },
      { name: 'leftThumbProximal', curl: FEMININE_RELAXED_BASE.thumbCurl },

      { name: 'rightIndexProximal', curl: baseCurl },
      { name: 'rightIndexIntermediate', curl: interCurl },
      { name: 'rightMiddleProximal', curl: baseCurl * 1.05 },
      { name: 'rightMiddleIntermediate', curl: interCurl * 1.05 },
      { name: 'rightRingProximal', curl: baseCurl * 1.1 },
      { name: 'rightRingIntermediate', curl: interCurl * 1.1 },
      { name: 'rightLittleProximal', curl: baseCurl * 1.15 },
      { name: 'rightLittleIntermediate', curl: interCurl * 1.15 },
      { name: 'rightThumbProximal', curl: FEMININE_RELAXED_BASE.thumbCurl },
    ];

    fingerBones.forEach(({ name, curl }) => {
      const bone = humanoid.getNormalizedBoneNode(name);
      if (bone) {
        bone.rotation.z = THREE.MathUtils.lerp(bone.rotation.z, curl, blendFactor);
      }
    });

    // Apply Blendshapes & Facial Expressions
    if (expressionManager) {
      // 1. Autonomous Blinking
      expressionManager.setValue('blink', this.blinkState.blinkAmount);

      // 2. Real-time Audio Lip-Sync
      if (visemes && isSpeaking) {
        expressionManager.setValue('aa', Math.min(1.0, Math.max(visemes.aa, visemes.mouthOpen)));
        expressionManager.setValue('ih', visemes.ih * 0.75);
        expressionManager.setValue('ou', visemes.ou * 0.7);
        expressionManager.setValue('ee', visemes.ee * 0.75);
        expressionManager.setValue('oh', visemes.oh * 0.7);
      } else {
        expressionManager.setValue('aa', 0);
        expressionManager.setValue('ih', 0);
        expressionManager.setValue('ou', 0);
        expressionManager.setValue('ee', 0);
        expressionManager.setValue('oh', 0);
      }

      // 3. Emotion Mapping with Expressive Facial Presence
      const emo = this.currentEmotion;
      let happyVal = 0.25; // baseline (no emotion)
      let surprisedVal = 0;
      let sadVal = 0;
      let relaxedVal = 0.2; // baseline (no emotion)

      if (emo === 'happy' || emo === 'playful') {
        happyVal = 0.85;
        surprisedVal = 0.15;
        relaxedVal = 0.3;
      } else if (emo === 'excited') {
        happyVal = 0.95;
        surprisedVal = 0.4;
      } else if (emo === 'warm' || emo === 'supportive') {
        happyVal = 0.55;
        relaxedVal = 0.45;
      } else if (emo === 'curious' || emo === 'thoughtful') {
        surprisedVal = 0.3;
        relaxedVal = 0.25;
      } else if (emo === 'confused' || emo === 'nervous') {
        surprisedVal = 0.4;
      } else if (emo === 'sad' || emo === 'disappointed') {
        sadVal = 0.55;
        happyVal = 0;
      } else if (emo === 'calm') {
        relaxedVal = 0.55;
        happyVal = 0.3;
      }

      expressionManager.setValue('happy', happyVal);
      expressionManager.setValue('surprised', surprisedVal);
      expressionManager.setValue('sad', sadVal);
      expressionManager.setValue('relaxed', relaxedVal);

      expressionManager.update();
    }
  }

  public getBlinkAmount(): number {
    return this.blinkState.blinkAmount;
  }

  public getGaze() {
    return {
      eyeX: this.gazeState.currentEyeX,
      eyeY: this.gazeState.currentEyeY,
      headYaw: this.gazeState.currentHeadYaw,
      headPitch: this.gazeState.currentHeadPitch,
      headRoll: this.gazeState.currentHeadRoll,
    };
  }
}

export const avatarBehaviorEngine = new AvatarBehaviorEngine();
