/**
 * Indian Anime Girl 3D Model Controller for MERY
 * Loads and controls `/models/mery.glb` with:
 * - Mobile portrait framing (waist-up view showcasing jewelry, dress, and face)
 * - Procedural upper spine idle floating & breathing
 * - Real-time physics sway for long dark hair strands and dupatta edges
 * - Inertial sway for traditional Jhumka earrings
 * - Audio-reactive viseme lip-sync (`mouthOpen`, `aa`, `ih`, `ou`, `ee`, `oh`)
 * - Autonomous eye blinking (3-5s interval) with natural head micro-turns
 * - Hand & arm gestures near chest/dupatta while speaking, with traditional gold bangles
 */

import React, { useRef, useState, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { VisemeWeights } from '../../modules/AudioLipSyncAnalyzer';
import { EmotionType } from '../../types';
import { StylizedAnimeAvatarRig } from './StylizedAnimeAvatarRig';

interface IndianAnimeModelControllerProps {
  modelUrl?: string;
  visemes: VisemeWeights;
  isSpeaking: boolean;
  emotion: EmotionType;
  waveGreeting: boolean;
  onWaveComplete?: () => void;
  accentColor?: string;
}

export const IndianAnimeModelController: React.FC<IndianAnimeModelControllerProps> = ({
  modelUrl = '/models/mery.glb',
  visemes,
  isSpeaking,
  emotion,
  waveGreeting,
  onWaveComplete,
  accentColor = '#00A3FF',
}) => {
  const [modelScene, setModelScene] = useState<THREE.Group | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Animation Node References
  const nodesRef = useRef<{
    spine: THREE.Object3D | null;
    chest: THREE.Object3D | null;
    neck: THREE.Object3D | null;
    head: THREE.Object3D | null;
    upperArmL: THREE.Object3D | null;
    lowerArmL: THREE.Object3D | null;
    handL: THREE.Object3D | null;
    upperArmR: THREE.Object3D | null;
    lowerArmR: THREE.Object3D | null;
    handR: THREE.Object3D | null;
    hairStrandL: THREE.Object3D | null;
    hairStrandR: THREE.Object3D | null;
    hairBack: THREE.Object3D | null;
    dupattaTrail: THREE.Object3D | null;
    dupattaChest: THREE.Object3D | null;
    jhumkaL: THREE.Object3D | null;
    jhumkaR: THREE.Object3D | null;
    faceMesh: THREE.Mesh | null;
  }>({
    spine: null,
    chest: null,
    neck: null,
    head: null,
    upperArmL: null,
    lowerArmL: null,
    handL: null,
    upperArmR: null,
    lowerArmR: null,
    handR: null,
    hairStrandL: null,
    hairStrandR: null,
    hairBack: null,
    dupattaTrail: null,
    dupattaChest: null,
    jhumkaL: null,
    jhumkaR: null,
    faceMesh: null,
  });

  // Autonomous Blinking State (3-5 seconds interval)
  const blinkState = useRef<{
    nextBlinkTime: number;
    isBlinking: boolean;
    blinkStartTime: number;
    blinkDuration: number;
    isDoubleBlink: boolean;
    blinkCount: number;
  }>({
    nextBlinkTime: 2.8,
    isBlinking: false,
    blinkStartTime: 0,
    blinkDuration: 0.15,
    isDoubleBlink: false,
    blinkCount: 0,
  });

  // Autonomous Micro Head-Turn State (every 3-5 seconds)
  const headTurnState = useRef<{
    nextTurnTime: number;
    targetYaw: number;
    targetPitch: number;
    targetRoll: number;
    currentYaw: number;
    currentPitch: number;
    currentRoll: number;
  }>({
    nextTurnTime: 3.2,
    targetYaw: 0,
    targetPitch: 0,
    targetRoll: 0,
    currentYaw: 0,
    currentPitch: 0,
    currentRoll: 0,
  });

  // Conversational Gesturing State
  const gestureState = useRef<{
    mode: 'chest' | 'open_palm';
    nextModeSwitch: number;
    rightArmProgress: number;
    phase: number;
  }>({
    mode: 'open_palm',
    nextModeSwitch: 4.0,
    rightArmProgress: 0,
    phase: 0,
  });

  // Greeting Wave State
  const waveState = useRef<{
    active: boolean;
    startTime: number;
    duration: number;
  }>({
    active: false,
    startTime: 0,
    duration: 2.6,
  });

  // Load Model with GLTFLoader
  useEffect(() => {
    let isMounted = true;
    const loader = new GLTFLoader();

    loader.load(
      modelUrl,
      (gltf) => {
        if (!isMounted) return;

        const scene = gltf.scene;

        // Reset node references
        const foundNodes = {
          spine: null as THREE.Object3D | null,
          chest: null as THREE.Object3D | null,
          neck: null as THREE.Object3D | null,
          head: null as THREE.Object3D | null,
          upperArmL: null as THREE.Object3D | null,
          lowerArmL: null as THREE.Object3D | null,
          handL: null as THREE.Object3D | null,
          upperArmR: null as THREE.Object3D | null,
          lowerArmR: null as THREE.Object3D | null,
          handR: null as THREE.Object3D | null,
          hairStrandL: null as THREE.Object3D | null,
          hairStrandR: null as THREE.Object3D | null,
          hairBack: null as THREE.Object3D | null,
          dupattaTrail: null as THREE.Object3D | null,
          dupattaChest: null as THREE.Object3D | null,
          jhumkaL: null as THREE.Object3D | null,
          jhumkaR: null as THREE.Object3D | null,
          faceMesh: null as THREE.Mesh | null,
        };

        // Traverse scene to index bones, meshes, and morph targets
        scene.traverse((obj) => {
          const name = obj.name.toLowerCase();

          // Mesh shadow and material optimization
          if ((obj as THREE.Mesh).isMesh) {
            const mesh = obj as THREE.Mesh;
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            mesh.frustumCulled = true;

            // Detect mesh with facial morph targets
            if (mesh.morphTargetDictionary && Object.keys(mesh.morphTargetDictionary).length > 0) {
              foundNodes.faceMesh = mesh;
            }
          }

          // Skeletal Bone & Group Detection
          if (name === 'spine') foundNodes.spine = obj;
          else if (name === 'chest') foundNodes.chest = obj;
          else if (name === 'neck') foundNodes.neck = obj;
          else if (name === 'head') foundNodes.head = obj;
          else if (name.includes('upperarm_l') || name.includes('leftupperarm')) foundNodes.upperArmL = obj;
          else if (name.includes('lowerarm_l') || name.includes('leftlowerarm')) foundNodes.lowerArmL = obj;
          else if (name.includes('hand_l') || name.includes('lefthand')) foundNodes.handL = obj;
          else if (name.includes('upperarm_r') || name.includes('rightupperarm')) foundNodes.upperArmR = obj;
          else if (name.includes('lowerarm_r') || name.includes('rightlowerarm')) foundNodes.lowerArmR = obj;
          else if (name.includes('hand_r') || name.includes('righthand')) foundNodes.handR = obj;
          else if (name.includes('hairstrand_l')) foundNodes.hairStrandL = obj;
          else if (name.includes('hairstrand_r')) foundNodes.hairStrandR = obj;
          else if (name.includes('hairback')) foundNodes.hairBack = obj;
          else if (name.includes('dupatta_trail')) foundNodes.dupattaTrail = obj;
          else if (name.includes('dupatta_chest')) foundNodes.dupattaChest = obj;
          else if (name.includes('jhumka_l')) foundNodes.jhumkaL = obj;
          else if (name.includes('jhumka_r')) foundNodes.jhumkaR = obj;
        });

        // Center model and calculate bounding box
        const bbox = new THREE.Box3().setFromObject(scene);
        const center = bbox.getCenter(new THREE.Vector3());
        const size = bbox.getSize(new THREE.Vector3());

        // Target height ~1.2m for mobile waist-up framing
        const maxDim = Math.max(size.x, size.y, size.z);
        if (maxDim > 0) {
          const scale = 1.1 / Math.max(size.y, 0.8);
          scene.scale.setScalar(scale);
        }

        // Align waist to lower portion of portrait frame
        scene.position.set(-center.x * scene.scale.x, -0.32, -center.z * scene.scale.z);

        nodesRef.current = foundNodes;
        setModelScene(scene);
        setLoadError(null);
      },
      undefined,
      (err) => {
        console.warn('Notice loading /models/mery.glb:', err);
        setLoadError('Model loading fallback');
      }
    );

    return () => {
      isMounted = false;
    };
  }, [modelUrl]);

  // Trigger Wave Greeting
  useEffect(() => {
    if (waveGreeting) {
      waveState.current.active = true;
      waveState.current.startTime = performance.now() / 1000;
    }
  }, [waveGreeting]);

  // Main Animation Loop
  useFrame((state, delta) => {
    if (!modelScene) return;

    const t = state.clock.getElapsedTime();
    const dt = Math.min(delta, 0.05);
    const nodes = nodesRef.current;

    // 1. Procedural Upper Spine Idle Floating & Breathing
    if (nodes.spine) {
      // Natural breathing rhythm (inhalation expansion & vertical chest lift)
      const breathingY = Math.sin(t * 1.8) * 0.012;
      const breathingPitch = Math.sin(t * 1.8) * 0.012;
      const subtleBodySway = Math.sin(t * 0.9) * 0.008;

      nodes.spine.position.y = breathingY;
      nodes.spine.rotation.x = breathingPitch;
      nodes.spine.rotation.z = subtleBodySway;
    }

    // Gentle global idle floating
    modelScene.position.y = -0.32 + Math.sin(t * 1.2) * 0.008;

    // 2. Autonomous Eye Blinking (Every 3-5 seconds)
    let blink = 0;
    if (!blinkState.current.isBlinking) {
      if (t > blinkState.current.nextBlinkTime) {
        blinkState.current.isBlinking = true;
        blinkState.current.blinkStartTime = t;
        blinkState.current.isDoubleBlink = Math.random() < 0.22; // 22% chance of natural double-blink
      }
    } else {
      const elapsed = t - blinkState.current.blinkStartTime;
      const dur = blinkState.current.blinkDuration;

      if (elapsed < dur) {
        // Smooth sine curve for eyelid closing and opening
        blink = Math.sin((elapsed / dur) * Math.PI);
      } else if (blinkState.current.isDoubleBlink && elapsed < dur * 2.1) {
        // Second quick flutter of double-blink
        const secondElapsed = elapsed - dur * 1.1;
        if (secondElapsed > 0 && secondElapsed < dur * 0.9) {
          blink = Math.sin((secondElapsed / (dur * 0.9)) * Math.PI);
        }
      } else {
        blinkState.current.isBlinking = false;
        // Random interval between 3.0 and 5.0 seconds as specified
        blinkState.current.nextBlinkTime = t + 3.0 + Math.random() * 2.0;
      }
    }

    // 3. Autonomous Natural Head Micro-Turns (Every 3-5 seconds)
    if (t > headTurnState.current.nextTurnTime) {
      // Pick random subtle micro head-turn angles
      headTurnState.current.targetYaw = (Math.random() - 0.5) * 0.16;
      headTurnState.current.targetPitch = (Math.random() - 0.5) * 0.08;
      headTurnState.current.targetRoll = (Math.random() - 0.5) * 0.06;
      headTurnState.current.nextTurnTime = t + 3.0 + Math.random() * 2.0;
    }

    // Smooth lerp micro-turns
    headTurnState.current.currentYaw = THREE.MathUtils.lerp(
      headTurnState.current.currentYaw,
      headTurnState.current.targetYaw,
      dt * 2.5
    );
    headTurnState.current.currentPitch = THREE.MathUtils.lerp(
      headTurnState.current.currentPitch,
      headTurnState.current.targetPitch,
      dt * 2.5
    );
    headTurnState.current.currentRoll = THREE.MathUtils.lerp(
      headTurnState.current.currentRoll,
      headTurnState.current.targetRoll,
      dt * 2.5
    );

    if (nodes.head) {
      // Natural speech rhythm nodding
      const speechNod = isSpeaking ? Math.sin(t * 5.2) * 0.035 : 0;
      const gentleTilt = Math.sin(t * 0.8) * 0.02;

      nodes.head.rotation.y = headTurnState.current.currentYaw;
      nodes.head.rotation.x = headTurnState.current.currentPitch + speechNod;
      nodes.head.rotation.z = headTurnState.current.currentRoll + gentleTilt;
    }

    // 4. Audio-Reactive Visemes to Mouth Morph Targets
    if (nodes.faceMesh && nodes.faceMesh.morphTargetDictionary && nodes.faceMesh.morphTargetInfluences) {
      const dict = nodes.faceMesh.morphTargetDictionary;
      const inf = nodes.faceMesh.morphTargetInfluences;

      // Apply blinking
      if (dict['blink'] !== undefined) inf[dict['blink']] = blink;
      if (dict['blink_left'] !== undefined) inf[dict['blink_left']] = blink;
      if (dict['blink_right'] !== undefined) inf[dict['blink_right']] = blink;

      // Apply Visemes smoothly in real-time
      if (dict['mouthOpen'] !== undefined) inf[dict['mouthOpen']] = visemes.mouthOpen * 0.85;
      if (dict['aa'] !== undefined) inf[dict['aa']] = visemes.aa;
      if (dict['ih'] !== undefined) inf[dict['ih']] = visemes.ih;
      if (dict['ou'] !== undefined) inf[dict['ou']] = visemes.ou;
      if (dict['ee'] !== undefined) inf[dict['ee']] = visemes.ee;
      if (dict['oh'] !== undefined) inf[dict['oh']] = visemes.oh;

      // Emotional expression
      const isHappy = emotion === 'warm' || emotion === 'playful' || emotion === 'excited';
      if (dict['happy'] !== undefined) {
        inf[dict['happy']] = THREE.MathUtils.lerp(inf[dict['happy']], isHappy ? 0.6 : 0.0, dt * 4);
      }
    }

    // 5. Physics Sway for Long Hair Strands & Dupatta Edges
    // Long Hair Strands Harmonic Dynamic Sway
    if (nodes.hairStrandL) {
      const speechFlutter = isSpeaking ? Math.sin(t * 6.5) * 0.03 : 0;
      nodes.hairStrandL.rotation.z = Math.sin(t * 2.2) * 0.05 + speechFlutter;
      nodes.hairStrandL.rotation.x = 0.12 + Math.cos(t * 1.8) * 0.035;
    }
    if (nodes.hairStrandR) {
      const speechFlutter = isSpeaking ? Math.sin(t * 6.5 + 0.5) * 0.03 : 0;
      nodes.hairStrandR.rotation.z = -Math.sin(t * 2.2 + 0.4) * 0.05 - speechFlutter;
      nodes.hairStrandR.rotation.x = 0.12 + Math.cos(t * 1.8 + 0.4) * 0.035;
    }
    if (nodes.hairBack) {
      nodes.hairBack.rotation.x = -0.15 + Math.sin(t * 1.6) * 0.038;
      nodes.hairBack.rotation.z = Math.cos(t * 1.1) * 0.025;
    }

    // Dupatta Edges & Trail Graceful Physics Flutter
    if (nodes.dupattaTrail) {
      // Harmonic undulating wave simulating sheer flowing silk cloth
      const clothWind = Math.sin(t * 1.7) * 0.065 + Math.cos(t * 3.4) * 0.02;
      const clothLift = Math.cos(t * 1.5) * 0.045;
      nodes.dupattaTrail.rotation.z = clothWind;
      nodes.dupattaTrail.rotation.x = clothLift;
      nodes.dupattaTrail.rotation.y = 0.1 + Math.sin(t * 2.1) * 0.035;
    }

    // Traditional Jhumka Earrings Inertial Pendulum Sway
    if (nodes.jhumkaL) {
      nodes.jhumkaL.rotation.z = Math.sin(t * 3.2) * 0.055 - headTurnState.current.currentYaw * 0.35;
    }
    if (nodes.jhumkaR) {
      nodes.jhumkaR.rotation.z = Math.sin(t * 3.2 + 0.6) * 0.055 - headTurnState.current.currentYaw * 0.35;
    }

    // 6. Hand & Arm Movement: Graceful Gesturing Near Chest/Dupatta
    // Switch gesture modes periodically during speech
    if (t > gestureState.current.nextModeSwitch) {
      gestureState.current.mode = gestureState.current.mode === 'chest' ? 'open_palm' : 'chest';
      gestureState.current.nextModeSwitch = t + 3.5 + Math.random() * 2.5;
    }

    const { upperArmL, lowerArmL, handL, upperArmR, lowerArmR, handR } = nodes;

    // Greeting Wave Animation
    if (waveState.current.active && upperArmR && lowerArmR && handR) {
      const elapsed = t - waveState.current.startTime;
      if (elapsed < waveState.current.duration) {
        const p = elapsed / waveState.current.duration;
        const curve = Math.sin(p * Math.PI);

        upperArmR.rotation.z = -1.15 * curve;
        upperArmR.rotation.x = -0.55 * curve;
        upperArmR.rotation.y = 0.25 * curve;

        lowerArmR.rotation.x = -1.25 * curve;
        lowerArmR.rotation.z = 0.15 * curve;

        // Graceful waving hand with glistening bangles
        handR.rotation.y = Math.sin(elapsed * 9.5) * 0.5 * curve;
        handR.rotation.z = Math.cos(elapsed * 9.5) * 0.2 * curve;
      } else {
        waveState.current.active = false;
        onWaveComplete?.();
      }
    } else if (isSpeaking && upperArmR && lowerArmR && handR) {
      // Conversational Speaking Gestures
      if (gestureState.current.mode === 'chest') {
        // Hand-to-chest gesture (touching near dupatta / heart with sincere warmth)
        const pulse = Math.sin(t * 2.4) * 0.08;
        upperArmR.rotation.z = THREE.MathUtils.lerp(upperArmR.rotation.z, -0.65 + pulse, dt * 5);
        upperArmR.rotation.x = THREE.MathUtils.lerp(upperArmR.rotation.x, -0.45 + pulse * 0.5, dt * 5);
        upperArmR.rotation.y = THREE.MathUtils.lerp(upperArmR.rotation.y, 0.45, dt * 5);

        lowerArmR.rotation.x = THREE.MathUtils.lerp(lowerArmR.rotation.x, -1.05 + pulse * 0.8, dt * 5);
        lowerArmR.rotation.z = THREE.MathUtils.lerp(lowerArmR.rotation.z, 0.35, dt * 5);

        handR.rotation.x = THREE.MathUtils.lerp(handR.rotation.x, 0.2, dt * 5);
        handR.rotation.y = THREE.MathUtils.lerp(handR.rotation.y, 0.35, dt * 5);
      } else {
        // Open-palm outward explaining gesture
        const wave = Math.sin(t * 2.8) * 0.12;
        upperArmR.rotation.z = THREE.MathUtils.lerp(upperArmR.rotation.z, -0.42 + wave * 0.6, dt * 5);
        upperArmR.rotation.x = THREE.MathUtils.lerp(upperArmR.rotation.x, -0.3 + wave * 0.4, dt * 5);
        upperArmR.rotation.y = THREE.MathUtils.lerp(upperArmR.rotation.y, 0.2, dt * 5);

        lowerArmR.rotation.x = THREE.MathUtils.lerp(lowerArmR.rotation.x, -0.75 + wave, dt * 5);
        lowerArmR.rotation.z = THREE.MathUtils.lerp(lowerArmR.rotation.z, 0.15, dt * 5);

        handR.rotation.x = THREE.MathUtils.lerp(handR.rotation.x, -0.15, dt * 5);
        handR.rotation.y = THREE.MathUtils.lerp(handR.rotation.y, Math.sin(t * 2.8) * 0.25, dt * 5);
      }
    } else if (upperArmR && lowerArmR && handR) {
      // Idle Rest Stance: Right hand relaxed beside hip/waist
      upperArmR.rotation.z = THREE.MathUtils.lerp(upperArmR.rotation.z, 0.12, dt * 4);
      upperArmR.rotation.x = THREE.MathUtils.lerp(upperArmR.rotation.x, 0.05, dt * 4);
      upperArmR.rotation.y = THREE.MathUtils.lerp(upperArmR.rotation.y, 0.0, dt * 4);

      lowerArmR.rotation.x = THREE.MathUtils.lerp(lowerArmR.rotation.x, -0.18, dt * 4);
      lowerArmR.rotation.z = THREE.MathUtils.lerp(lowerArmR.rotation.z, 0.0, dt * 4);

      handR.rotation.x = THREE.MathUtils.lerp(handR.rotation.x, 0.0, dt * 4);
      handR.rotation.y = THREE.MathUtils.lerp(handR.rotation.y, 0.0, dt * 4);
    }

    // Left Arm: Gracefully rests near the dupatta fold at chest level
    if (upperArmL && lowerArmL && handL) {
      const leftBreath = Math.sin(t * 1.8) * 0.02;
      upperArmL.rotation.z = THREE.MathUtils.lerp(upperArmL.rotation.z, -0.22 + leftBreath, dt * 4);
      upperArmL.rotation.x = THREE.MathUtils.lerp(upperArmL.rotation.x, -0.25, dt * 4);
      upperArmL.rotation.y = THREE.MathUtils.lerp(upperArmL.rotation.y, -0.18, dt * 4);

      lowerArmL.rotation.x = THREE.MathUtils.lerp(lowerArmL.rotation.x, -0.85 + leftBreath * 0.5, dt * 4);
      lowerArmL.rotation.z = THREE.MathUtils.lerp(lowerArmL.rotation.z, -0.25, dt * 4);

      handL.rotation.y = THREE.MathUtils.lerp(handL.rotation.y, -0.3, dt * 4);
      handL.rotation.z = THREE.MathUtils.lerp(handL.rotation.z, 0.15, dt * 4);
    }
  });

  if (loadError || !modelScene) {
    return (
      <StylizedAnimeAvatarRig
        visemes={visemes}
        isSpeaking={isSpeaking}
        emotion={emotion}
        waveGreeting={waveGreeting}
        onWaveComplete={onWaveComplete}
        accentColor={accentColor}
      />
    );
  }

  return <primitive object={modelScene} />;
};
