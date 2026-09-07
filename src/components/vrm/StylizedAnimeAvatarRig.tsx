/**
 * Stylized 3D Anime Girl Avatar Rig for MERY
 * Complete procedural humanoid anime character featuring:
 * - Expressive anime face with customizable morphs (eyes, blinking, eyebrows, mouth visemes)
 * - Skeletal upper-body hierarchy (Spine, Neck, Head, Shoulders, Arms, Wrists, Fingers)
 * - Layered anime hair with dynamic physics sway
 * - Cel-shaded anime aesthetic with warm cinematic lighting and electric blue neural accents
 */

import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { VisemeWeights } from '../../modules/AudioLipSyncAnalyzer';
import { EmotionType } from '../../types';

interface AnimeAvatarRigProps {
  visemes: VisemeWeights;
  isSpeaking: boolean;
  emotion: EmotionType;
  waveGreeting: boolean;
  onWaveComplete?: () => void;
  accentColor?: string;
}

export const StylizedAnimeAvatarRig: React.FC<AnimeAvatarRigProps> = ({
  visemes,
  isSpeaking,
  emotion,
  waveGreeting,
  onWaveComplete,
  accentColor = '#00A3FF',
}) => {
  // Skeleton Bone References
  const spineRef = useRef<THREE.Group>(null);
  const neckRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);
  const leftShoulderRef = useRef<THREE.Group>(null);
  const rightShoulderRef = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);
  const leftForearmRef = useRef<THREE.Group>(null);
  const rightForearmRef = useRef<THREE.Group>(null);
  const leftHandRef = useRef<THREE.Group>(null);
  const rightHandRef = useRef<THREE.Group>(null);

  // Facial Features & Blendshape References
  const leftEyelidRef = useRef<THREE.Mesh>(null);
  const rightEyelidRef = useRef<THREE.Mesh>(null);
  const leftEyebrowRef = useRef<THREE.Group>(null);
  const rightEyebrowRef = useRef<THREE.Group>(null);
  const mouthOpenRef = useRef<THREE.Mesh>(null);
  const mouthSmileRef = useRef<THREE.Mesh>(null);
  const leftPupilRef = useRef<THREE.Group>(null);
  const rightPupilRef = useRef<THREE.Group>(null);
  const hairPonyLeftRef = useRef<THREE.Group>(null);
  const hairPonyRightRef = useRef<THREE.Group>(null);
  const blushLeftRef = useRef<THREE.Mesh>(null);
  const blushRightRef = useRef<THREE.Mesh>(null);

  // Autonomous Blinking State
  const blinkState = useRef<{
    nextBlinkTime: number;
    isBlinking: boolean;
    blinkStartTime: number;
    blinkDuration: number;
    isDoubleBlink: boolean;
    blinkCount: number;
  }>({
    nextBlinkTime: 2.5,
    isBlinking: false,
    blinkStartTime: 0,
    blinkDuration: 0.16,
    isDoubleBlink: false,
    blinkCount: 0,
  });

  // Greeting Wave State
  const waveState = useRef<{
    active: boolean;
    startTime: number;
    duration: number;
  }>({
    active: false,
    startTime: 0,
    duration: 2.8,
  });

  // Trigger wave if waveGreeting prop becomes true
  React.useEffect(() => {
    if (waveGreeting) {
      waveState.current.active = true;
      waveState.current.startTime = performance.now() / 1000;
    }
  }, [waveGreeting]);

  // Speaking Gestures Phase
  const speechGesturePhase = useRef<number>(0);
  const currentGestureMode = useRef<'chest' | 'open_palm' | 'nodding'>('open_palm');
  const gestureSwitchTimer = useRef<number>(0);

  // Gradient / Cel-shaded Anime Materials
  const materials = useMemo(() => {
    // Anime Soft Porcelain Skin Material
    const skin = new THREE.MeshToonMaterial({
      color: new THREE.Color('#FFF1EA'),
      emissive: new THREE.Color('#3A2022'),
      emissiveIntensity: 0.08,
    });

    // Warm Anime Hair (Soft Dark Navy / Midnight with Electric Blue Luster)
    const hair = new THREE.MeshToonMaterial({
      color: new THREE.Color('#161E34'),
      emissive: new THREE.Color('#0A1526'),
      emissiveIntensity: 0.25,
    });

    // Glowing Hair Ribbons / Cyber Accents
    const ribbon = new THREE.MeshStandardMaterial({
      color: new THREE.Color(accentColor),
      emissive: new THREE.Color(accentColor),
      emissiveIntensity: 0.8,
      roughness: 0.2,
    });

    // Big Anime Eyes - Iris (Vibrant Deep Blue / Cyan gradient texture)
    const eyeWhite = new THREE.MeshBasicMaterial({ color: '#FFFFFF' });
    const iris = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#00A3FF'),
      emissive: new THREE.Color('#0055FF'),
      emissiveIntensity: 0.5,
      roughness: 0.1,
    });
    const pupil = new THREE.MeshBasicMaterial({ color: '#030814' });
    const eyeHighlight = new THREE.MeshBasicMaterial({ color: '#FFFFFF' });

    // Eyeliner & Lashes
    const lash = new THREE.MeshBasicMaterial({ color: '#161324' });

    // Anime Blush
    const blush = new THREE.MeshBasicMaterial({
      color: '#FF6B8B',
      transparent: true,
      opacity: 0.45,
    });

    // Cyber School Uniform / Jacket
    const jacketDark = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#0A0C14'),
      roughness: 0.4,
      metalness: 0.2,
    });

    const collarWhite = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#F0F4FF'),
      roughness: 0.5,
    });

    const tieAccent = new THREE.MeshStandardMaterial({
      color: new THREE.Color(accentColor),
      emissive: new THREE.Color(accentColor),
      emissiveIntensity: 0.6,
      roughness: 0.3,
    });

    // Mouth Interior & Tongue
    const mouthInterior = new THREE.MeshBasicMaterial({ color: '#661426' });
    const mouthTeeth = new THREE.MeshBasicMaterial({ color: '#FFFFFF' });

    return {
      skin,
      hair,
      ribbon,
      eyeWhite,
      iris,
      pupil,
      eyeHighlight,
      lash,
      blush,
      jacketDark,
      collarWhite,
      tieAccent,
      mouthInterior,
      mouthTeeth,
    };
  }, [accentColor]);

  // Main Procedural Animation Loop
  useFrame((state, delta) => {
    const t = state.clock.getElapsedTime();
    const dt = Math.min(delta, 0.05);

    // -------------------------------------------------------------
    // 1. Natural Autonomous Blinking
    // -------------------------------------------------------------
    let blinkAmount = 0;
    if (!blinkState.current.isBlinking) {
      if (t > blinkState.current.nextBlinkTime) {
        blinkState.current.isBlinking = true;
        blinkState.current.blinkStartTime = t;
        blinkState.current.blinkCount++;
        // Occasional double-blink every 4th cycle
        blinkState.current.isDoubleBlink = blinkState.current.blinkCount % 4 === 0;
      }
    } else {
      const elapsed = t - blinkState.current.blinkStartTime;
      const totalDur = blinkState.current.isDoubleBlink ? 0.32 : 0.16;

      if (elapsed < totalDur) {
        if (!blinkState.current.isDoubleBlink) {
          // Single blink: sine wave 0 -> 1 -> 0
          blinkAmount = Math.sin((elapsed / totalDur) * Math.PI);
        } else {
          // Double blink: two peaks
          const sub = (elapsed / totalDur) * 2;
          if (sub < 1) {
            blinkAmount = Math.sin(sub * Math.PI);
          } else {
            blinkAmount = Math.sin((sub - 1) * Math.PI);
          }
        }
      } else {
        blinkState.current.isBlinking = false;
        // Next blink between 3.0 and 6.0 seconds from now
        blinkState.current.nextBlinkTime = t + 3.0 + Math.random() * 3.0;
      }
    }

    // Apply Eyelid closure
    if (leftEyelidRef.current && rightEyelidRef.current) {
      // Scale eyelid downward to cover the eye
      const targetScaleY = blinkAmount;
      leftEyelidRef.current.scale.y = THREE.MathUtils.lerp(leftEyelidRef.current.scale.y, targetScaleY, dt * 35);
      rightEyelidRef.current.scale.y = THREE.MathUtils.lerp(rightEyelidRef.current.scale.y, targetScaleY, dt * 35);
    }

    // -------------------------------------------------------------
    // 2. Audio-Driven Lip-Sync
    // -------------------------------------------------------------
    if (mouthOpenRef.current && mouthSmileRef.current) {
      // Viseme blending
      const openAmount = visemes.mouthOpen;
      const smileAmount = emotion === 'warm' || emotion === 'playful' || emotion === 'excited' ? 0.6 : 0.15;

      // Scale mouth cavity
      const currentScaleX = THREE.MathUtils.lerp(
        mouthOpenRef.current.scale.x,
        0.3 + (visemes.ih * 0.6 + visemes.ee * 0.4) + smileAmount * 0.3,
        dt * 20
      );
      const currentScaleY = THREE.MathUtils.lerp(
        mouthOpenRef.current.scale.y,
        Math.max(0.05, openAmount * 0.9 + visemes.aa * 0.8 + visemes.oh * 0.7),
        dt * 25
      );

      mouthOpenRef.current.scale.set(currentScaleX, currentScaleY, 1);
      mouthOpenRef.current.visible = openAmount > 0.04 || isSpeaking;

      // Smile mouth line visibility
      mouthSmileRef.current.scale.set(1 + smileAmount * 0.3, 1, 1);
      mouthSmileRef.current.visible = openAmount <= 0.04 && !isSpeaking;
    }

    // -------------------------------------------------------------
    // 3. Emotional Eyebrows & Eye Saccades
    // -------------------------------------------------------------
    if (leftEyebrowRef.current && rightEyebrowRef.current) {
      let browY = 0;
      let browRotZ = 0;

      if (emotion === 'curious' || emotion === 'excited') {
        browY = 0.02;
        browRotZ = 0.08;
      } else if (emotion === 'thoughtful') {
        browY = -0.01;
        browRotZ = -0.06;
      } else if (emotion === 'warm' || emotion === 'playful') {
        browY = 0.01;
        browRotZ = 0.04;
      }

      leftEyebrowRef.current.position.y = THREE.MathUtils.lerp(leftEyebrowRef.current.position.y, 0.12 + browY, dt * 8);
      rightEyebrowRef.current.position.y = THREE.MathUtils.lerp(rightEyebrowRef.current.position.y, 0.12 + browY, dt * 8);
      leftEyebrowRef.current.rotation.z = THREE.MathUtils.lerp(leftEyebrowRef.current.rotation.z, browRotZ, dt * 8);
      rightEyebrowRef.current.rotation.z = THREE.MathUtils.lerp(rightEyebrowRef.current.rotation.z, -browRotZ, dt * 8);
    }

    // Eye Saccades: Small natural glances
    if (leftPupilRef.current && rightPupilRef.current) {
      const saccadeTime = Math.floor(t * 0.7);
      const glanceX = Math.sin(saccadeTime * 4.3) * 0.008;
      const glanceY = emotion === 'thoughtful' ? 0.008 : Math.cos(saccadeTime * 3.1) * 0.005;

      leftPupilRef.current.position.x = THREE.MathUtils.lerp(leftPupilRef.current.position.x, glanceX, dt * 10);
      leftPupilRef.current.position.y = THREE.MathUtils.lerp(leftPupilRef.current.position.y, glanceY, dt * 10);
      rightPupilRef.current.position.x = THREE.MathUtils.lerp(rightPupilRef.current.position.x, glanceX, dt * 10);
      rightPupilRef.current.position.y = THREE.MathUtils.lerp(rightPupilRef.current.position.y, glanceY, dt * 10);
    }

    // -------------------------------------------------------------
    // 4. Procedural Spine Breathing & Head Sway
    // -------------------------------------------------------------
    if (spineRef.current) {
      // Natural human breathing ~ 0.28 Hz (17 breaths/min)
      const breath = Math.sin(t * 1.7) * 0.025;
      spineRef.current.position.y = THREE.MathUtils.lerp(spineRef.current.position.y, breath * 0.3, dt * 6);
      spineRef.current.rotation.x = THREE.MathUtils.lerp(spineRef.current.rotation.x, breath * 0.4, dt * 6);
    }

    if (neckRef.current && headRef.current) {
      // Gentle head sway
      let headTiltZ = Math.sin(t * 0.6) * 0.025;
      let headTiltX = Math.sin(t * 1.2) * 0.015;
      let headPanY = Math.cos(t * 0.5) * 0.035;

      // Emotion adjustments
      if (emotion === 'thoughtful') {
        headTiltZ += 0.09;
        headTiltX -= 0.04;
        headPanY += 0.06;
      } else if (emotion === 'curious') {
        headTiltZ -= 0.08;
        headTiltX += 0.03;
      } else if (emotion === 'warm') {
        headTiltZ += 0.04;
      }

      // Speaking cadence nodding
      if (isSpeaking) {
        headTiltX += Math.sin(t * 5.2) * 0.035;
      }

      neckRef.current.rotation.z = THREE.MathUtils.lerp(neckRef.current.rotation.z, headTiltZ * 0.5, dt * 6);
      neckRef.current.rotation.x = THREE.MathUtils.lerp(neckRef.current.rotation.x, headTiltX * 0.5, dt * 6);
      headRef.current.rotation.z = THREE.MathUtils.lerp(headRef.current.rotation.z, headTiltZ * 0.5, dt * 6);
      headRef.current.rotation.x = THREE.MathUtils.lerp(headRef.current.rotation.x, headTiltX * 0.5, dt * 6);
      headRef.current.rotation.y = THREE.MathUtils.lerp(headRef.current.rotation.y, headPanY, dt * 6);
    }

    // -------------------------------------------------------------
    // 5. Hair Physics Sway
    // -------------------------------------------------------------
    if (hairPonyLeftRef.current && hairPonyRightRef.current) {
      const hairSway = Math.sin(t * 2.2) * 0.04 + (isSpeaking ? Math.sin(t * 5.5) * 0.03 : 0);
      hairPonyLeftRef.current.rotation.z = THREE.MathUtils.lerp(hairPonyLeftRef.current.rotation.z, 0.15 + hairSway, dt * 8);
      hairPonyRightRef.current.rotation.z = THREE.MathUtils.lerp(hairPonyRightRef.current.rotation.z, -0.15 - hairSway, dt * 8);
      hairPonyLeftRef.current.rotation.x = THREE.MathUtils.lerp(hairPonyLeftRef.current.rotation.x, hairSway * 0.5, dt * 8);
      hairPonyRightRef.current.rotation.x = THREE.MathUtils.lerp(hairPonyRightRef.current.rotation.x, hairSway * 0.5, dt * 8);
    }

    // -------------------------------------------------------------
    // 6. Arm & Hand Gesture System (Greeting Wave + Speaking Gestures)
    // -------------------------------------------------------------
    let targetRightArmRotZ = -0.2;
    let targetRightArmRotX = 0.1;
    let targetRightForearmRotX = -0.3;
    let targetRightHandRotY = 0;

    let targetLeftArmRotZ = 0.2;
    let targetLeftArmRotX = 0.1;
    let targetLeftForearmRotX = -0.3;

    // Check Greeting Wave Action
    if (waveState.current.active) {
      const elapsed = t - waveState.current.startTime;
      if (elapsed < waveState.current.duration) {
        // Wave gesture: Raise right arm up and wave hand side-to-side
        const waveProgress = elapsed / waveState.current.duration;
        const waveIn = Math.min(1, waveProgress * 4); // Fast raise
        const waveOut = Math.min(1, (1 - waveProgress) * 4); // Smooth lower
        const waveWeight = Math.min(waveIn, waveOut);

        // Arm up near head
        targetRightArmRotZ = -1.1 * waveWeight;
        targetRightArmRotX = -0.5 * waveWeight;
        targetRightForearmRotX = -1.3 * waveWeight;
        // Waving oscillation
        targetRightHandRotY = Math.sin(elapsed * 9) * 0.45 * waveWeight;
      } else {
        waveState.current.active = false;
        onWaveComplete?.();
      }
    } else if (isSpeaking) {
      // Expressive conversational gestures
      speechGesturePhase.current += dt * 3.5;
      const gPhase = speechGesturePhase.current;

      // Cycle gestures every 3.5 seconds
      if (t > gestureSwitchTimer.current) {
        gestureSwitchTimer.current = t + 3.0 + Math.random() * 2.0;
        const modes: Array<'chest' | 'open_palm' | 'nodding'> = ['open_palm', 'chest', 'nodding'];
        currentGestureMode.current = modes[Math.floor(Math.random() * modes.length)];
      }

      if (currentGestureMode.current === 'open_palm') {
        // Gentle open palm gesturing to user
        const gCycle = Math.sin(gPhase * 1.4);
        targetRightArmRotZ = -0.45 + gCycle * 0.12;
        targetRightArmRotX = -0.4 + gCycle * 0.1;
        targetRightForearmRotX = -0.8 + gCycle * 0.15;
        targetRightHandRotY = 0.2 + gCycle * 0.1;
      } else if (currentGestureMode.current === 'chest') {
        // Soft hand-on-chest / warm empathetic posture
        targetRightArmRotZ = -0.35;
        targetRightArmRotX = -0.65;
        targetRightForearmRotX = -1.4;
        targetRightHandRotY = 0.4;
      } else {
        // Balanced open conversational posture
        targetRightArmRotZ = -0.3 + Math.sin(gPhase) * 0.08;
        targetRightForearmRotX = -0.5 + Math.cos(gPhase) * 0.1;
        targetLeftArmRotZ = 0.3 - Math.sin(gPhase) * 0.08;
        targetLeftForearmRotX = -0.5 - Math.cos(gPhase) * 0.1;
      }
    } else {
      // Idle natural rest
      targetRightArmRotZ = -0.18 + Math.sin(t * 0.8) * 0.02;
      targetRightArmRotX = 0.08;
      targetRightForearmRotX = -0.22;

      targetLeftArmRotZ = 0.18 - Math.sin(t * 0.8) * 0.02;
      targetLeftArmRotX = 0.08;
      targetLeftForearmRotX = -0.22;
    }

    // Apply Arm/Hand Interpolation
    if (rightArmRef.current && rightForearmRef.current && rightHandRef.current) {
      rightArmRef.current.rotation.z = THREE.MathUtils.lerp(rightArmRef.current.rotation.z, targetRightArmRotZ, dt * 7);
      rightArmRef.current.rotation.x = THREE.MathUtils.lerp(rightArmRef.current.rotation.x, targetRightArmRotX, dt * 7);
      rightForearmRef.current.rotation.x = THREE.MathUtils.lerp(rightForearmRef.current.rotation.x, targetRightForearmRotX, dt * 7);
      rightHandRef.current.rotation.y = THREE.MathUtils.lerp(rightHandRef.current.rotation.y, targetRightHandRotY, dt * 10);
    }

    if (leftArmRef.current && leftForearmRef.current) {
      leftArmRef.current.rotation.z = THREE.MathUtils.lerp(leftArmRef.current.rotation.z, targetLeftArmRotZ, dt * 7);
      leftArmRef.current.rotation.x = THREE.MathUtils.lerp(leftArmRef.current.rotation.x, targetLeftArmRotX, dt * 7);
      leftForearmRef.current.rotation.x = THREE.MathUtils.lerp(leftForearmRef.current.rotation.x, targetLeftForearmRotX, dt * 7);
    }
  });

  return (
    <group position={[0, -0.65, 0]}>
      {/* Root Spine / Chest Node */}
      <group ref={spineRef}>
        {/* Torso / Cyber Jacket Body */}
        <mesh position={[0, 0.45, 0]} material={materials.jacketDark} castShadow receiveShadow>
          <cylinderGeometry args={[0.22, 0.19, 0.52, 24]} />
        </mesh>

        {/* Inner Shirt Collar & Tie */}
        <mesh position={[0, 0.68, 0.05]} material={materials.collarWhite}>
          <boxGeometry args={[0.16, 0.12, 0.12]} />
        </mesh>
        <mesh position={[0, 0.58, 0.11]} material={materials.tieAccent}>
          <coneGeometry args={[0.045, 0.18, 3]} />
        </mesh>

        {/* Neck Node */}
        <group ref={neckRef} position={[0, 0.72, 0]}>
          <mesh material={materials.skin} position={[0, 0.05, 0]} castShadow>
            <cylinderGeometry args={[0.075, 0.085, 0.15, 20]} />
          </mesh>

          {/* Cyber Neck Choker with Glowing Accent */}
          <mesh material={materials.ribbon} position={[0, 0.03, 0]}>
            <torusGeometry args={[0.082, 0.012, 12, 24]} />
          </mesh>

          {/* Head Root Node */}
          <group ref={headRef} position={[0, 0.18, 0]}>
            {/* Anime Face / Head Base */}
            <mesh material={materials.skin} position={[0, 0.05, 0]} castShadow>
              <sphereGeometry args={[0.24, 32, 24]} />
            </mesh>
            {/* Anime Chin / Jaw sculpt */}
            <mesh material={materials.skin} position={[0, -0.06, 0.07]} rotation={[0.3, 0, 0]}>
              <coneGeometry args={[0.14, 0.18, 20]} />
            </mesh>

            {/* Left Anime Eye */}
            <group position={[-0.09, 0.04, 0.20]}>
              {/* Eye Sclera (White) */}
              <mesh material={materials.eyeWhite}>
                <sphereGeometry args={[0.055, 16, 16]} />
              </mesh>
              {/* Pupil / Iris group for gaze saccades */}
              <group ref={leftPupilRef} position={[0, 0, 0.045]}>
                {/* Iris */}
                <mesh material={materials.iris}>
                  <circleGeometry args={[0.042, 24]} />
                </mesh>
                {/* Pupil */}
                <mesh material={materials.pupil} position={[0, 0, 0.002]}>
                  <circleGeometry args={[0.022, 20]} />
                </mesh>
                {/* Anime Star Highlight */}
                <mesh material={materials.eyeHighlight} position={[-0.012, 0.014, 0.004]}>
                  <circleGeometry args={[0.012, 12]} />
                </mesh>
                <mesh material={materials.eyeHighlight} position={[0.014, -0.012, 0.004]}>
                  <circleGeometry args={[0.006, 12]} />
                </mesh>
              </group>
              {/* Upper Eyelash / Eyeliner */}
              <mesh material={materials.lash} position={[0, 0.046, 0.04]} rotation={[0, 0, 0.1]}>
                <boxGeometry args={[0.095, 0.014, 0.01]} />
              </mesh>
              {/* Blinking Eyelid (Scales down over the eye) */}
              <mesh
                ref={leftEyelidRef}
                material={materials.skin}
                position={[0, 0.03, 0.048]}
                scale={[1, 0, 1]}
              >
                <boxGeometry args={[0.1, 0.09, 0.02]} />
              </mesh>
            </group>

            {/* Right Anime Eye */}
            <group position={[0.09, 0.04, 0.20]}>
              {/* Eye Sclera */}
              <mesh material={materials.eyeWhite}>
                <sphereGeometry args={[0.055, 16, 16]} />
              </mesh>
              <group ref={rightPupilRef} position={[0, 0, 0.045]}>
                <mesh material={materials.iris}>
                  <circleGeometry args={[0.042, 24]} />
                </mesh>
                <mesh material={materials.pupil} position={[0, 0, 0.002]}>
                  <circleGeometry args={[0.022, 20]} />
                </mesh>
                <mesh material={materials.eyeHighlight} position={[-0.012, 0.014, 0.004]}>
                  <circleGeometry args={[0.012, 12]} />
                </mesh>
                <mesh material={materials.eyeHighlight} position={[0.014, -0.012, 0.004]}>
                  <circleGeometry args={[0.006, 12]} />
                </mesh>
              </group>
              <mesh material={materials.lash} position={[0, 0.046, 0.04]} rotation={[0, 0, -0.1]}>
                <boxGeometry args={[0.095, 0.014, 0.01]} />
              </mesh>
              <mesh
                ref={rightEyelidRef}
                material={materials.skin}
                position={[0, 0.03, 0.048]}
                scale={[1, 0, 1]}
              >
                <boxGeometry args={[0.1, 0.09, 0.02]} />
              </mesh>
            </group>

            {/* Soft Anime Blush on Cheeks */}
            <mesh ref={blushLeftRef} material={materials.blush} position={[-0.13, -0.025, 0.19]}>
              <circleGeometry args={[0.032, 16]} />
            </mesh>
            <mesh ref={blushRightRef} material={materials.blush} position={[0.13, -0.025, 0.19]}>
              <circleGeometry args={[0.032, 16]} />
            </mesh>

            {/* Eyebrows */}
            <group ref={leftEyebrowRef} position={[-0.09, 0.12, 0.23]}>
              <mesh material={materials.lash}>
                <boxGeometry args={[0.075, 0.008, 0.008]} />
              </mesh>
            </group>
            <group ref={rightEyebrowRef} position={[0.09, 0.12, 0.23]}>
              <mesh material={materials.lash}>
                <boxGeometry args={[0.075, 0.008, 0.008]} />
              </mesh>
            </group>

            {/* Cute Anime Nose dot */}
            <mesh material={materials.lash} position={[0, -0.015, 0.24]}>
              <sphereGeometry args={[0.008, 8, 8]} />
            </mesh>

            {/* Anime Mouth (Speaking Cavity & Closed Smile) */}
            <group position={[0, -0.075, 0.23]}>
              {/* Mouth Open Cavity (Lip-Sync Viseme) */}
              <group ref={mouthOpenRef} visible={false}>
                <mesh material={materials.mouthInterior}>
                  <sphereGeometry args={[0.036, 16, 16]} />
                </mesh>
                <mesh material={materials.mouthTeeth} position={[0, 0.018, 0.02]}>
                  <boxGeometry args={[0.045, 0.01, 0.01]} />
                </mesh>
              </group>
              {/* Mouth Closed Smile Line */}
              <mesh ref={mouthSmileRef} material={materials.lash}>
                <torusGeometry args={[0.03, 0.005, 8, 16, Math.PI * 0.75]} />
              </mesh>
            </group>

            {/* Layered Anime Hair Model */}
            <group position={[0, 0.05, 0]}>
              {/* Hair Skull Base */}
              <mesh material={materials.hair} position={[0, 0.06, -0.02]}>
                <sphereGeometry args={[0.26, 24, 24]} />
              </mesh>

              {/* Front Fringe / Bangs framing forehead */}
              <mesh material={materials.hair} position={[0, 0.17, 0.21]} rotation={[0.4, 0, 0]}>
                <coneGeometry args={[0.21, 0.18, 16]} />
              </mesh>
              <mesh material={materials.hair} position={[-0.08, 0.12, 0.22]} rotation={[0.3, 0, -0.2]}>
                <coneGeometry args={[0.09, 0.2, 12]} />
              </mesh>
              <mesh material={materials.hair} position={[0.08, 0.12, 0.22]} rotation={[0.3, 0, 0.2]}>
                <coneGeometry args={[0.09, 0.2, 12]} />
              </mesh>

              {/* Side Locks */}
              <mesh material={materials.hair} position={[-0.22, -0.08, 0.10]} rotation={[0.1, 0, -0.1]}>
                <capsuleGeometry args={[0.045, 0.28, 12, 16]} />
              </mesh>
              <mesh material={materials.hair} position={[0.22, -0.08, 0.10]} rotation={[0.1, 0, 0.1]}>
                <capsuleGeometry args={[0.045, 0.28, 12, 16]} />
              </mesh>

              {/* Dynamic Anime Twin-tails with Sway physics */}
              <group ref={hairPonyLeftRef} position={[-0.24, 0.18, -0.06]}>
                {/* Cyber Hair Tie / Ribbon */}
                <mesh material={materials.ribbon}>
                  <torusGeometry args={[0.05, 0.015, 12, 20]} />
                </mesh>
                {/* Flowing Ponytail */}
                <mesh material={materials.hair} position={[-0.08, -0.28, 0]} rotation={[0, 0, -0.2]}>
                  <cylinderGeometry args={[0.065, 0.02, 0.55, 16]} />
                </mesh>
              </group>

              <group ref={hairPonyRightRef} position={[0.24, 0.18, -0.06]}>
                <mesh material={materials.ribbon}>
                  <torusGeometry args={[0.05, 0.015, 12, 20]} />
                </mesh>
                <mesh material={materials.hair} position={[0.08, -0.28, 0]} rotation={[0, 0, 0.2]}>
                  <cylinderGeometry args={[0.065, 0.02, 0.55, 16]} />
                </mesh>
              </group>

              {/* Hair Halo Luster Ring (Subtle Anime Light Ring) */}
              <mesh position={[0, 0.24, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[0.18, 0.22, 32]} />
                <meshBasicMaterial
                  color={accentColor}
                  transparent
                  opacity={0.35}
                  side={THREE.DoubleSide}
                />
              </mesh>
            </group>
          </group>
        </group>

        {/* -------------------------------------------------------- */}
        {/* Left Arm & Hand Skeleton */}
        {/* -------------------------------------------------------- */}
        <group ref={leftShoulderRef} position={[-0.26, 0.62, 0]}>
          {/* Shoulder Cap */}
          <mesh material={materials.jacketDark}>
            <sphereGeometry args={[0.085, 16, 16]} />
          </mesh>

          {/* Left Upper Arm */}
          <group ref={leftArmRef} position={[-0.04, -0.04, 0]}>
            <mesh material={materials.jacketDark} position={[0, -0.12, 0]}>
              <cylinderGeometry args={[0.065, 0.055, 0.22, 16]} />
            </mesh>

            {/* Left Forearm */}
            <group ref={leftForearmRef} position={[0, -0.24, 0]}>
              <mesh material={materials.skin} position={[0, -0.10, 0]}>
                <cylinderGeometry args={[0.052, 0.045, 0.20, 16]} />
              </mesh>

              {/* Left Hand & Delicate Fingers */}
              <group ref={leftHandRef} position={[0, -0.22, 0]}>
                <mesh material={materials.skin}>
                  <sphereGeometry args={[0.045, 16, 16]} />
                </mesh>
                {/* Fingers */}
                <mesh material={materials.skin} position={[0, -0.04, 0]}>
                  <boxGeometry args={[0.05, 0.06, 0.02]} />
                </mesh>
              </group>
            </group>
          </group>
        </group>

        {/* -------------------------------------------------------- */}
        {/* Right Arm & Hand Skeleton (Greeting Wave + Gestures) */}
        {/* -------------------------------------------------------- */}
        <group ref={rightShoulderRef} position={[0.26, 0.62, 0]}>
          <mesh material={materials.jacketDark}>
            <sphereGeometry args={[0.085, 16, 16]} />
          </mesh>

          {/* Right Upper Arm */}
          <group ref={rightArmRef} position={[0.04, -0.04, 0]}>
            <mesh material={materials.jacketDark} position={[0, -0.12, 0]}>
              <cylinderGeometry args={[0.065, 0.055, 0.22, 16]} />
            </mesh>

            {/* Right Forearm */}
            <group ref={rightForearmRef} position={[0, -0.24, 0]}>
              <mesh material={materials.skin} position={[0, -0.10, 0]}>
                <cylinderGeometry args={[0.052, 0.045, 0.20, 16]} />
              </mesh>

              {/* Right Hand with Palm & Expressive Fingers */}
              <group ref={rightHandRef} position={[0, -0.22, 0]}>
                {/* Palm */}
                <mesh material={materials.skin}>
                  <sphereGeometry args={[0.045, 16, 16]} />
                </mesh>
                {/* Extended anime fingers */}
                <mesh material={materials.skin} position={[0, -0.04, 0]}>
                  <boxGeometry args={[0.05, 0.06, 0.02]} />
                </mesh>
              </group>
            </group>
          </group>
        </group>
      </group>
    </group>
  );
};
