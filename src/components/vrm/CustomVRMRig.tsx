import React, { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { VRM } from '@pixiv/three-vrm';
import { EmotionType } from '../../types';
import { lipSyncAnalyzer } from '../../modules/AudioLipSyncAnalyzer';
import { AvatarBehaviorEngine } from './AvatarBehaviorEngine';

export interface CustomVRMRigProps {
  vrm: VRM;
  state?: 'idle' | 'listening' | 'thinking' | 'speaking';
  isSpeaking: boolean;
  emotion: EmotionType;
  waveGreeting: boolean;
  onWaveComplete?: () => void;
  accentColor?: string;
}

export const CustomVRMRig: React.FC<CustomVRMRigProps> = ({
  vrm,
  state: companionState = 'idle',
  isSpeaking,
  emotion,
  waveGreeting,
  onWaveComplete,
}) => {
  // Dedicated Avatar Behavior Engine instance for this VRM
  const behaviorEngineRef = useRef<AvatarBehaviorEngine | null>(null);
  if (!behaviorEngineRef.current) {
    behaviorEngineRef.current = new AvatarBehaviorEngine();
  }

  // Trigger wave greeting via behavior engine
  useEffect(() => {
    if (waveGreeting && behaviorEngineRef.current) {
      const now = performance.now() / 1000;
      const triggered = behaviorEngineRef.current.triggerGreetingWave(now);
      if (triggered && onWaveComplete) {
        setTimeout(onWaveComplete, 2800);
      }
    }
  }, [waveGreeting, onWaveComplete]);

  // Sync companion state and emotion
  useEffect(() => {
    if (behaviorEngineRef.current) {
      const now = performance.now() / 1000;
      behaviorEngineRef.current.setState(companionState, now);
    }
  }, [companionState]);

  useEffect(() => {
    if (behaviorEngineRef.current) {
      behaviorEngineRef.current.setEmotion(emotion);
    }
  }, [emotion]);

  // Ensure materials and shadows are enabled on the VRM scene
  useEffect(() => {
    if (!vrm) return;
    vrm.scene.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;
        obj.frustumCulled = false;
      }
    });
  }, [vrm]);

  // Main Render & Animation Loop
  useFrame((three, delta) => {
    if (!vrm || !behaviorEngineRef.current) return;
    const t = three.clock.getElapsedTime();
    const dt = Math.min(delta, 0.05);

    // 1. Update Spring Bone physics for dynamic hair & clothing
    vrm.update(dt);

    // 2. Fetch real-time audio lip-sync visemes
    const visemes = lipSyncAnalyzer.update(dt, isSpeaking);

    // 3. Update the behavioral state engine (breathing, weight shift, gestures, micro-expressions)
    const engine = behaviorEngineRef.current;
    engine.update(dt, t, isSpeaking, visemes);

    // 4. Apply all skeletal transformations and morph expressions to the VRM model
    engine.applyToVRM(vrm, dt, t, isSpeaking, visemes);
  });

  return (
    <group position={[0, -0.85, 0]}>
      <primitive object={vrm.scene} />
    </group>
  );
};
