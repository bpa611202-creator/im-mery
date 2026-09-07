/**
 * Interactive 3D Anime Girl Companion Avatar Component for MERY
 * Integrates Three.js, React Three Fiber, VRM/GLTF loading, real-time lip-sync,
 * autonomous blinking, mood expressions, and arm/hand gesture system.
 */

import React, { useRef, useState, useEffect, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { EmotionType } from '../types';
import { lipSyncAnalyzer, VisemeWeights } from '../modules/AudioLipSyncAnalyzer';
import { StylizedAnimeAvatarRig } from './vrm/StylizedAnimeAvatarRig';
import { IndianAnimeModelController } from './vrm/IndianAnimeModelController';
import { VRMController, loadVRMModel } from './vrm/VRMLoaderHelper';
import { Sparkles, Hand, ZoomIn, ZoomOut, Upload, RefreshCw } from 'lucide-react';

export interface AnimeAvatar3DProps {
  state?: 'idle' | 'listening' | 'thinking' | 'speaking';
  emotion?: EmotionType;
  onClick?: () => void;
  onStartSession?: () => void;
  accentColor?: string;
  className?: string;
}

// Internal VRM Model Scene Runner when a VRM model is loaded
function VRMRunner({
  vrmController,
  visemes,
  isSpeaking,
  emotion,
  waveGreeting,
  onWaveComplete,
}: {
  vrmController: VRMController;
  visemes: VisemeWeights;
  isSpeaking: boolean;
  emotion: EmotionType;
  waveGreeting: boolean;
  onWaveComplete?: () => void;
}) {
  const blinkTimer = useRef({
    next: 3.0,
    isBlinking: false,
    start: 0,
  });

  const waveState = useRef({
    active: false,
    start: 0,
    duration: 2.8,
  });

  useEffect(() => {
    if (waveGreeting) {
      waveState.current.active = true;
      waveState.current.start = performance.now() / 1000;
    }
  }, [waveGreeting]);

  useFrame((state, delta) => {
    const t = state.clock.getElapsedTime();
    const dt = Math.min(delta, 0.05);

    // 1. Audio Lip-Sync to VRM Visemes
    vrmController.setVisemes({
      aa: visemes.aa,
      ih: visemes.ih,
      ou: visemes.ou,
      ee: visemes.ee,
      oh: visemes.oh,
    });

    // 2. Autonomous Blinking
    let blink = 0;
    if (!blinkTimer.current.isBlinking) {
      if (t > blinkTimer.current.next) {
        blinkTimer.current.isBlinking = true;
        blinkTimer.current.start = t;
      }
    } else {
      const el = t - blinkTimer.current.start;
      if (el < 0.16) {
        blink = Math.sin((el / 0.16) * Math.PI);
      } else {
        blinkTimer.current.isBlinking = false;
        blinkTimer.current.next = t + 3.0 + Math.random() * 3.0;
      }
    }
    vrmController.setBlink(blink);

    // 3. Emotional Facial Reactions
    const isHappy = emotion === 'warm' || emotion === 'playful' || emotion === 'excited';
    const isSurprised = emotion === 'curious';
    vrmController.setExpression('happy', isHappy ? 0.6 : 0.0);
    vrmController.setExpression('surprised', isSurprised ? 0.5 : 0.0);

    // 4. Skeletal Upper-Body Gestures (Head & Right Arm)
    const head = vrmController.getBone('head');
    if (head) {
      const headSway = Math.sin(t * 0.8) * 0.03;
      const headNod = isSpeaking ? Math.sin(t * 5.0) * 0.04 : 0;
      head.rotation.z = headSway;
      head.rotation.x = headNod;
    }

    const spine = vrmController.getBone('spine');
    if (spine) {
      spine.position.y = Math.sin(t * 1.8) * 0.015;
    }

    const rightUpperArm = vrmController.getBone('rightUpperArm');
    const rightLowerArm = vrmController.getBone('rightLowerArm');
    const rightHand = vrmController.getBone('rightHand');

    if (waveState.current.active && rightUpperArm && rightLowerArm && rightHand) {
      const elapsed = t - waveState.current.start;
      if (elapsed < waveState.current.duration) {
        const p = elapsed / waveState.current.duration;
        const w = Math.sin(p * Math.PI);
        rightUpperArm.rotation.z = -1.2 * w;
        rightUpperArm.rotation.x = -0.5 * w;
        rightLowerArm.rotation.x = -1.1 * w;
        rightHand.rotation.y = Math.sin(elapsed * 9) * 0.45 * w;
      } else {
        waveState.current.active = false;
        onWaveComplete?.();
      }
    } else if (isSpeaking && rightUpperArm && rightLowerArm) {
      const g = Math.sin(t * 2.5) * 0.15;
      rightUpperArm.rotation.z = THREE.MathUtils.lerp(rightUpperArm.rotation.z, -0.45 + g, dt * 6);
      rightLowerArm.rotation.x = THREE.MathUtils.lerp(rightLowerArm.rotation.x, -0.65 + g, dt * 6);
    }

    vrmController.update(dt);
  });

  return <primitive object={vrmController.scene} position={[0, -0.85, 0]} />;
}

// Scene setup with lighting & camera controller
function AvatarScene({
  state,
  emotion,
  visemes,
  waveGreeting,
  onWaveComplete,
  accentColor,
  cameraFraming,
  customVRM,
  modelUrl = '/models/mery.glb',
}: {
  state: 'idle' | 'listening' | 'thinking' | 'speaking';
  emotion: EmotionType;
  visemes: VisemeWeights;
  waveGreeting: boolean;
  onWaveComplete: () => void;
  accentColor: string;
  cameraFraming: 'portrait' | 'upper_body';
  customVRM: VRMController | null;
  modelUrl?: string;
}) {
  const { camera } = useThree();

  // Smooth camera positioning based on mobile portrait framing mode (waist-up view)
  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    const targetZ = cameraFraming === 'portrait' ? 1.45 : 1.95;
    const targetY = cameraFraming === 'portrait' ? 0.35 : 0.25;
    camera.position.z = THREE.MathUtils.lerp(camera.position.z, targetZ, dt * 5);
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, targetY, dt * 5);
  });

  return (
    <>
      {/* Anime Key Light (Warm cinematic golden key) */}
      <directionalLight
        position={[1.2, 1.8, 1.6]}
        intensity={1.35}
        color="#FFF6EE"
        castShadow
      />

      {/* Anime Fill Light (Electric Blue / Theme accent) */}
      <directionalLight
        position={[-1.6, 0.6, 1.0]}
        intensity={0.7}
        color={accentColor}
      />

      {/* Aurora Rose Rim Light from Behind (Accentuates long dark hair & traditional attire textures) */}
      <directionalLight
        position={[0, 1.8, -1.9]}
        intensity={2.6}
        color="#FF3377"
      />
      <directionalLight
        position={[-1.2, 1.3, -1.4]}
        intensity={1.6}
        color="#FB7185"
      />
      <pointLight
        position={[0, 0.65, -0.6]}
        intensity={1.6}
        distance={2.8}
        color="#FF4D8D"
      />

      {/* Gentle Ambient Light (#FFF4E8 as requested) */}
      <ambientLight intensity={0.92} color="#FFF4E8" />

      {/* 3D Model: Custom VRM or Custom Indian Anime Girl Model (/models/mery.glb) */}
      {customVRM ? (
        <VRMRunner
          vrmController={customVRM}
          visemes={visemes}
          isSpeaking={state === 'speaking'}
          emotion={emotion}
          waveGreeting={waveGreeting}
          onWaveComplete={onWaveComplete}
        />
      ) : (
        <IndianAnimeModelController
          modelUrl={modelUrl}
          visemes={visemes}
          isSpeaking={state === 'speaking'}
          emotion={emotion}
          waveGreeting={waveGreeting}
          onWaveComplete={onWaveComplete}
          accentColor={accentColor}
        />
      )}

      {/* Floating Cyber Particle Dust in Avatar Aura */}
      <AvatarAuraParticles accentColor={accentColor} isSpeaking={state === 'speaking'} />
    </>
  );
}

// Soft floating sparkles around the anime avatar
function AvatarAuraParticles({ accentColor, isSpeaking }: { accentColor: string; isSpeaking: boolean }) {
  const pointsRef = useRef<THREE.Points>(null);
  const count = 35;

  const [positions] = useState(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 1.8;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 1.6 + 0.2;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 0.8;
    }
    return pos;
  });

  useFrame((state) => {
    if (pointsRef.current) {
      const t = state.clock.getElapsedTime();
      pointsRef.current.rotation.y = t * 0.08;
      const speed = isSpeaking ? 1.6 : 0.8;
      const pos = pointsRef.current.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < count; i++) {
        pos[i * 3 + 1] += Math.sin(t * speed + i) * 0.0012;
      }
      pointsRef.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.035}
        color={accentColor}
        transparent
        opacity={0.65}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

export const AnimeAvatar3D: React.FC<AnimeAvatar3DProps> = ({
  state = 'idle',
  emotion = 'warm',
  onClick,
  onStartSession,
  accentColor = '#00A3FF',
  className = '',
}) => {
  const [cameraFraming, setCameraFraming] = useState<'portrait' | 'upper_body'>('portrait');
  const [waveGreeting, setWaveGreeting] = useState<boolean>(true); // Initial greeting wave
  const [modelUrl, setModelUrl] = useState<string>('/models/mery.glb');
  const [customVRM, setCustomVRM] = useState<VRMController | null>(null);
  const [isLoadingVRM, setIsLoadingVRM] = useState(false);
  const [vrmError, setVrmError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Live audio lip-sync state updated every animation frame
  const [visemes, setVisemes] = useState<VisemeWeights>({
    mouthOpen: 0,
    aa: 0,
    ih: 0,
    ou: 0,
    ee: 0,
    oh: 0,
    volume: 0,
  });

  // Global lip-sync tick loop
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();

    const loop = () => {
      const now = performance.now();
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      const current = lipSyncAnalyzer.update(dt, state === 'speaking');
      setVisemes({ ...current });
      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [state]);

  // Handle manual 3D model upload (.glb / .gltf / .vrm)
  const handleVRMUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsLoadingVRM(true);
      setVrmError(null);
      const blobUrl = URL.createObjectURL(file);

      if (file.name.toLowerCase().endsWith('.vrm')) {
        const controller = await loadVRMModel(blobUrl);
        if (customVRM) {
          customVRM.dispose();
        }
        setCustomVRM(controller);
      } else {
        // Standard GLB / GLTF model
        if (customVRM) {
          customVRM.dispose();
          setCustomVRM(null);
        }
        setModelUrl(blobUrl);
      }
      setIsLoadingVRM(false);
    } catch (err: any) {
      console.warn('Model load notice:', err);
      setVrmError('Notice loading custom model. Using built-in 3D avatar.');
      setIsLoadingVRM(false);
    }
  };

  // Trigger Wave Greeting
  const handleTriggerWave = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setWaveGreeting(true);
  };

  return (
    <div
      className={`w-full h-full relative flex items-center justify-center select-none ${className}`}
      onClick={onClick}
    >
      {/* Hidden file input for 3D model loading */}
      <input
        type="file"
        ref={fileInputRef}
        accept=".vrm,.glb,.gltf"
        className="hidden"
        onChange={handleVRMUpload}
      />

      {/* Cyber Glow Halo Aura */}
      <div
        className="absolute w-64 h-64 sm:w-80 sm:h-80 rounded-full pointer-events-none transition-all duration-700 -z-10"
        style={{
          background: `radial-gradient(circle, ${accentColor}28 0%, #0055FF15 45%, transparent 70%)`,
          filter: 'blur(50px)',
          transform: state === 'speaking' ? 'scale(1.2)' : 'scale(1.0)',
        }}
      />

      {/* Interactive 3D Canvas */}
      <div className="w-full h-full aspect-square relative flex items-center justify-center">
        <Canvas
          camera={{ position: [0, 0.35, 1.45], fov: 36 }}
          style={{ width: '100%', height: '100%' }}
          dpr={[1, 1.75]} // Clamped for mobile 60 FPS performance
          gl={{
            antialias: true,
            alpha: true,
            powerPreference: 'high-performance',
          }}
        >
          <Suspense fallback={null}>
            <AvatarScene
              state={state}
              emotion={emotion}
              visemes={visemes}
              waveGreeting={waveGreeting}
              onWaveComplete={() => setWaveGreeting(false)}
              accentColor={accentColor}
              cameraFraming={cameraFraming}
              customVRM={customVRM}
              modelUrl={modelUrl}
            />
          </Suspense>
        </Canvas>

        {/* Loading / Error indicator */}
        {isLoadingVRM && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-20 text-xs text-[#00A3FF] font-telemetry animate-pulse">
            <RefreshCw className="w-4 h-4 animate-spin mr-2" />
            LOADING VRM AVATAR...
          </div>
        )}
        {vrmError && (
          <div className="absolute top-2 left-2 right-2 px-3 py-1.5 bg-rose-950/80 border border-rose-500/40 rounded text-[11px] text-rose-200 z-20 font-telemetry text-center">
            {vrmError}
          </div>
        )}
      </div>

      {/* Avatar Floating Mini Action Bar */}
      <div
        className="absolute bottom-2 flex items-center gap-1.5 z-20 pointer-events-auto bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Wave Greeting Button */}
        <button
          id="btn_avatar_wave_action"
          onClick={handleTriggerWave}
          className="p-1.5 text-white/70 hover:text-[#00A3FF] hover:bg-white/10 rounded-full transition-colors flex items-center gap-1 text-[10px] font-telemetry"
          title="Trigger Greeting Wave Gesture"
        >
          <Hand className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Wave</span>
        </button>

        {/* Camera Zoom Framing Toggle (Portrait Close-up vs Upper Body) */}
        <button
          id="btn_avatar_toggle_framing"
          onClick={() => setCameraFraming((prev) => (prev === 'portrait' ? 'upper_body' : 'portrait'))}
          className="p-1.5 text-white/70 hover:text-[#00A3FF] hover:bg-white/10 rounded-full transition-colors flex items-center gap-1 text-[10px] font-telemetry"
          title={`Camera view: ${cameraFraming === 'portrait' ? 'Portrait (Chest Up)' : 'Upper Body'}`}
        >
          {cameraFraming === 'portrait' ? (
            <>
              <ZoomOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Bust</span>
            </>
          ) : (
            <>
              <ZoomIn className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Portrait</span>
            </>
          )}
        </button>

        {/* Custom VRM Upload Button */}
        <button
          id="btn_avatar_upload_vrm"
          onClick={() => fileInputRef.current?.click()}
          className="p-1.5 text-white/70 hover:text-[#00A3FF] hover:bg-white/10 rounded-full transition-colors flex items-center gap-1 text-[10px] font-telemetry"
          title="Load Custom VRM / GLTF Anime Model"
        >
          <Upload className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">VRM</span>
        </button>

        {/* Current Emotion Badge */}
        <span className="px-2 py-0.5 rounded-full text-[9px] font-telemetry tracking-wider uppercase bg-[#00A3FF]/20 text-[#00A3FF] border border-[#00A3FF]/30 flex items-center gap-1">
          <Sparkles className="w-2.5 h-2.5" />
          {emotion}
        </span>
      </div>
    </div>
  );
};

export default AnimeAvatar3D;
