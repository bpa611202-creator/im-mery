/**
 * Interactive 3D Anime Companion Avatar Component for MERY
 * Hosts the exact 3D model matching the character image:
 * - Sleeveless blush pink flared A-line dress with realistic pleats
 * - Long wavy dark chocolate brown hair parted in middle cascading past shoulders & back
 * - Traditional Indian silver Jhumka earrings with inertial physics swing
 * - Stacked metallic silver bangles on both wrists
 * - Black bindi on forehead
 * - Expressive warm brown anime eyes with autonomous blinking
 * - Audio-reactive lip-sync
 * - Signature photo pose with natural gestures
 * - Bare feet standing on an intricate engraved circular silver pedestal platform
 */

import React, { useRef, useState, useEffect, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { EmotionType } from '../types';
import { CustomVRMRig } from './vrm/CustomVRMRig';
import { loadVRMFromSource } from './vrm/VRMLoader';
import { VRM } from '@pixiv/three-vrm';
import {
  saveCustomVRM,
  getCustomVRMBlob,
  getCustomVRMMeta,
  deleteCustomVRM,
  CustomVRMMetadata,
} from '../utils/vrmStorage';
import { VRMUploadModal } from './VRMUploadModal';
import { Sparkles, Upload, Loader2 } from 'lucide-react';

export type CameraFramingMode = 'face' | 'portrait' | 'full_body';

export interface AnimeAvatar3DProps {
  state?: 'idle' | 'listening' | 'thinking' | 'speaking';
  emotion?: EmotionType;
  onClick?: () => void;
  onStartSession?: () => void;
  accentColor?: string;
  className?: string;
}

// Sleek holographic wireframe beacon displayed while VRM is initializing
function VRMLoadingBeacon({ accentColor }: { accentColor: string }) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 1.2;
    }
  });

  return (
    <group ref={groupRef} position={[0, -0.15, 0]}>
      {/* Dynamic scan rings */}
      <mesh position={[0, -0.6, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.35, 0.42, 32]} />
        <meshBasicMaterial color={accentColor} transparent opacity={0.6} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.22, 0.28, 32]} />
        <meshBasicMaterial color={accentColor} transparent opacity={0.4} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0.65, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.12, 0.18, 32]} />
        <meshBasicMaterial color={accentColor} transparent opacity={0.5} side={THREE.DoubleSide} />
      </mesh>

      {/* Futuristic wireframe column */}
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[0.06, 0.18, 1.4, 16, 2, true]} />
        <meshBasicMaterial color={accentColor} wireframe transparent opacity={0.25} />
      </mesh>
    </group>
  );
}

// Scene setup with warm studio rim lighting & dynamic framing controller for VRM models
function AvatarScene({
  state,
  emotion,
  waveGreeting,
  onWaveComplete,
  accentColor,
  cameraFraming,
  vrm,
}: {
  state: 'idle' | 'listening' | 'thinking' | 'speaking';
  emotion: EmotionType;
  waveGreeting: boolean;
  onWaveComplete: () => void;
  accentColor: string;
  cameraFraming: CameraFramingMode;
  vrm: VRM | null;
}) {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);
  const currentTargetRef = useRef(new THREE.Vector3(0, 0.35, 0));
  const isUserInteracting = useRef(false);

  // Smooth camera position & target lookAt transition adapted to VRM humanoid bones
  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);

    let headY = 0.55;
    if (vrm && vrm.humanoid) {
      const headBone = vrm.humanoid.getNormalizedBoneNode('head');
      if (headBone) {
        const temp = new THREE.Vector3();
        headBone.getWorldPosition(temp);
        if (temp.y !== 0) {
          headY = temp.y;
        }
      }
    }

    const fullBodyCenterY = (headY - 0.85) / 2;
    const fullBodyZ = 3.25;
    const portraitY = headY - 0.18;
    const portraitZ = 1.65;
    const faceY = headY;
    const faceZ = 0.90;

    let targetZ = portraitZ;
    let targetY = portraitY;
    let lookTargetY = portraitY - 0.08;

    if (cameraFraming === 'face') {
      targetZ = faceZ;
      targetY = faceY;
      lookTargetY = faceY;
    } else if (cameraFraming === 'full_body') {
      targetZ = fullBodyZ;
      targetY = fullBodyCenterY + 0.06;
      lookTargetY = fullBodyCenterY;
    }

    // Auto-lerp camera position and target unless user is actively dragging OrbitControls
    if (!isUserInteracting.current) {
      camera.position.z = THREE.MathUtils.lerp(camera.position.z, targetZ, dt * 5);
      camera.position.y = THREE.MathUtils.lerp(camera.position.y, targetY, dt * 5);
      camera.position.x = THREE.MathUtils.lerp(camera.position.x, 0, dt * 5);

      currentTargetRef.current.y = THREE.MathUtils.lerp(currentTargetRef.current.y, lookTargetY, dt * 5);
      currentTargetRef.current.x = THREE.MathUtils.lerp(currentTargetRef.current.x, 0, dt * 5);
      currentTargetRef.current.z = THREE.MathUtils.lerp(currentTargetRef.current.z, 0, dt * 5);

      if (controlsRef.current) {
        controlsRef.current.target.copy(currentTargetRef.current);
        controlsRef.current.update();
      } else {
        camera.lookAt(currentTargetRef.current);
      }
    }
  });

  return (
    <>
      <OrbitControls
        ref={controlsRef}
        enablePan={false}
        enableZoom={true}
        enableRotate={true}
        minDistance={0.5}
        maxDistance={4.5}
        maxPolarAngle={Math.PI / 2 + 0.08}
        minPolarAngle={Math.PI / 4}
        onStart={() => {
          isUserInteracting.current = true;
        }}
        onEnd={() => {
          setTimeout(() => {
            isUserInteracting.current = false;
          }, 4000);
        }}
      />
      {/* Studio Key Light */}
      <directionalLight
        position={[1.2, 1.8, 1.8]}
        intensity={1.4}
        color="#FFF6F0"
        castShadow
      />

      {/* Fill Light */}
      <directionalLight
        position={[-1.5, 0.8, 1.2]}
        intensity={0.7}
        color="#F8ECE6"
      />

      {/* Rim Lights from Behind */}
      <directionalLight
        position={[0, 1.6, -1.8]}
        intensity={2.2}
        color="#FFE4EB"
      />
      <directionalLight
        position={[-1.2, 1.2, -1.4]}
        intensity={1.5}
        color="#FFBAC8"
      />
      <pointLight
        position={[0, 0.5, -0.7]}
        intensity={1.2}
        distance={2.5}
        color="#F5B2C3"
      />

      {/* Gentle Ambient Studio Light */}
      <ambientLight intensity={0.95} color="#FFF5F2" />

      {/* Exclusively Render VRM Model (or loading beacon while model initializes) */}
      {vrm ? (
        <CustomVRMRig
          vrm={vrm}
          state={state}
          isSpeaking={state === 'speaking'}
          emotion={emotion}
          waveGreeting={waveGreeting}
          onWaveComplete={onWaveComplete}
          accentColor={accentColor}
        />
      ) : (
        <VRMLoadingBeacon accentColor={accentColor} />
      )}

      {/* Soft Floating Sparkle Dust in Aura */}
      <AvatarAuraParticles accentColor={accentColor} isSpeaking={state === 'speaking'} />
    </>
  );
}

// Subtle floating particle dust around the avatar
function AvatarAuraParticles({ accentColor, isSpeaking }: { accentColor: string; isSpeaking: boolean }) {
  const pointsRef = useRef<THREE.Points>(null);
  const count = 32;

  const [positions] = useState(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 1.8;
      arr[i * 3 + 1] = (Math.random() - 0.5) * 2.2;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 1.4;
    }
    return arr;
  });

  useFrame((state) => {
    if (!pointsRef.current) return;
    const t = state.clock.getElapsedTime();
    const speed = isSpeaking ? 0.35 : 0.15;
    pointsRef.current.rotation.y = t * speed * 0.15;
    pointsRef.current.position.y = Math.sin(t * 0.6) * 0.04;
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
        size={0.022}
        color="#F5B2C3"
        transparent
        opacity={0.45}
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
  accentColor = '#00ff66',
  className = '',
}) => {
  // Camera framing: 'face' (eyes & expression), 'portrait' (half body & gestures), 'full_body' (complete model from head to feet)
  const [cameraFraming, setCameraFraming] = useState<CameraFramingMode>('portrait');

  // Trigger wave greeting
  const [waveGreeting, setWaveGreeting] = useState<boolean>(false);

  // Active VRM Model State
  const [vrm, setVrm] = useState<VRM | null>(null);
  const [customMeta, setCustomMeta] = useState<CustomVRMMetadata | null>(null);
  const [usingCustomVRM, setUsingCustomVRM] = useState<boolean>(false);
  const [isLoadingVRM, setIsLoadingVRM] = useState<boolean>(false);
  const [loadProgress, setLoadProgress] = useState<number>(0);
  const [isVRMModalOpen, setIsVRMModalOpen] = useState<boolean>(false);
  const [vrmError, setVrmError] = useState<string | null>(null);
  const [isDraggingVRM, setIsDraggingVRM] = useState<boolean>(false);

  // Helper to load the bundled default VRM model
  const loadDefaultVRM = async (isCancelledRef: { current: boolean }) => {
    try {
      setIsLoadingVRM(true);
      setLoadProgress(15);
      const result = await loadVRMFromSource('/models/default_avatar.vrm', (evt) => {
        if (evt.lengthComputable && evt.total > 0) {
          setLoadProgress(Math.round((evt.loaded / evt.total) * 100));
        }
      });
      if (!isCancelledRef.current) {
        setVrm(result.vrm);
        setCustomMeta({
          name: 'Default VRM Avatar',
          size: 10776032,
          uploadedAt: Date.now(),
          modelTitle: result.name || 'Default VRM Humanoid',
          modelAuthor: result.author,
        });
        setUsingCustomVRM(false);
      }
    } catch (err: any) {
      console.warn('Notice loading default VRM model:', err);
    } finally {
      if (!isCancelledRef.current) {
        setIsLoadingVRM(false);
        setLoadProgress(0);
      }
    }
  };

  // Restore saved custom VRM from IndexedDB, or fallback to default VRM model
  useEffect(() => {
    const isCancelledRef = { current: false };

    const restoreOrLoadDefault = async () => {
      try {
        const meta = await getCustomVRMMeta();
        if (meta) {
          setCustomMeta(meta);
          const blob = await getCustomVRMBlob();
          if (blob && !isCancelledRef.current) {
            setIsLoadingVRM(true);
            setLoadProgress(20);
            const result = await loadVRMFromSource(blob, (evt) => {
              if (evt.lengthComputable && evt.total > 0) {
                setLoadProgress(Math.round((evt.loaded / evt.total) * 100));
              }
            });
            if (!isCancelledRef.current) {
              setVrm(result.vrm);
              setUsingCustomVRM(true);
              setIsLoadingVRM(false);
              return;
            }
          }
        }

        // If no custom VRM in IndexedDB, load default VRM model
        if (!isCancelledRef.current) {
          await loadDefaultVRM(isCancelledRef);
        }
      } catch (err) {
        console.warn('Notice restoring VRM model:', err);
        if (!isCancelledRef.current) {
          await loadDefaultVRM(isCancelledRef);
        }
      }
    };

    restoreOrLoadDefault();

    // Listeners for external triggers from AvatarControlsModal and header
    const handleGlobalOpenVRM = () => {
      setIsVRMModalOpen(true);
    };
    const handleGlobalSetFraming = (e: any) => {
      if (e?.detail) setCameraFraming(e.detail);
    };
    const handleGlobalTriggerWave = () => {
      setWaveGreeting(true);
    };
    const handleGlobalResetVRM = () => {
      handleResetToDefault();
    };

    window.addEventListener('open-vrm-upload', handleGlobalOpenVRM);
    window.addEventListener('set-avatar-framing', handleGlobalSetFraming);
    window.addEventListener('trigger-avatar-wave', handleGlobalTriggerWave);
    window.addEventListener('reset-avatar-vrm', handleGlobalResetVRM);

    return () => {
      isCancelledRef.current = true;
      window.removeEventListener('open-vrm-upload', handleGlobalOpenVRM);
      window.removeEventListener('set-avatar-framing', handleGlobalSetFraming);
      window.removeEventListener('trigger-avatar-wave', handleGlobalTriggerWave);
      window.removeEventListener('reset-avatar-vrm', handleGlobalResetVRM);
    };
  }, []);

  // Broadcast avatar state changes so header and modal stay synced
  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent('avatar-status-change', {
        detail: {
          cameraFraming,
          usingCustomVRM,
          customVRMTitle: customMeta?.name || 'Default VRM Avatar',
        },
      })
    );
  }, [cameraFraming, usingCustomVRM, customMeta]);

  // Handle VRM File Upload
  const handleUploadVRM = async (file: File) => {
    setIsLoadingVRM(true);
    setLoadProgress(10);
    setVrmError(null);

    try {
      const result = await loadVRMFromSource(file, (evt) => {
        if (evt.lengthComputable && evt.total > 0) {
          setLoadProgress(Math.round((evt.loaded / evt.total) * 100));
        }
      });

      const meta = await saveCustomVRM(file, file.name, {
        modelTitle: result.name,
        modelAuthor: result.author,
      });

      setVrm(result.vrm);
      setCustomMeta(meta);
      setUsingCustomVRM(true);
      setIsVRMModalOpen(false);
    } catch (err: any) {
      console.error('Error loading uploaded VRM:', err);
      const msg = err?.message || 'Failed to load VRM model. Ensure the file is a valid .vrm 3D model.';
      setVrmError(msg);
      throw new Error(msg);
    } finally {
      setIsLoadingVRM(false);
      setLoadProgress(0);
    }
  };

  // Revert back to the default VRM avatar model
  const handleResetToDefault = async () => {
    await deleteCustomVRM();
    const isCancelledRef = { current: false };
    await loadDefaultVRM(isCancelledRef);
  };

  return (
    <div
      className={`w-full h-full relative flex items-center justify-center select-none ${className}`}
      onClick={onClick}
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingVRM(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingVRM(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingVRM(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          const file = e.dataTransfer.files[0];
          handleUploadVRM(file).catch(() => {
            setIsVRMModalOpen(true);
          });
        }
      }}
    >
      {/* Soft Glow Halo Aura */}
      <div
        className="absolute w-72 h-72 sm:w-96 sm:h-96 rounded-full pointer-events-none transition-all duration-700 -z-10"
        style={{
          background: `radial-gradient(circle, #F5B2C322 0%, #E39EB012 45%, transparent 70%)`,
          filter: 'blur(55px)',
          transform: state === 'speaking' ? 'scale(1.15)' : 'scale(1.0)',
        }}
      />

      {/* Drag & Drop Visual Overlay */}
      {isDraggingVRM && (
        <div className="absolute inset-2 z-30 flex flex-col items-center justify-center rounded-2xl bg-black/85 backdrop-blur-md border-2 border-dashed border-[#F5B2C3] text-center p-4 pointer-events-none animate-fadeIn">
          <Upload className="w-10 h-10 text-[#F5B2C3] animate-bounce mb-2" />
          <p className="text-sm font-semibold text-white">Drop .VRM 3D Model Here</p>
          <p className="text-xs text-[#F5B2C3]/80 mt-1">Release to load custom avatar for MERY</p>
        </div>
      )}

      {/* VRM Model Loading Progress Indicator */}
      {isLoadingVRM && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/75 backdrop-blur-md border border-[#00ff66]/30 shadow-lg text-white pointer-events-none animate-fadeIn">
          <Loader2 className="w-3.5 h-3.5 text-[#00ff66] animate-spin shrink-0" />
          <span className="text-[11px] font-telemetry tracking-wide text-white/90">
            Loading VRM 3D Model{loadProgress > 0 ? ` (${loadProgress}%)` : '...'}
          </span>
        </div>
      )}

      {/* Interactive 3D Canvas */}
      <div className="w-full h-full aspect-square relative flex items-center justify-center">
        <Canvas
          camera={{ position: [0, 0.36, 1.4], fov: 36 }}
          style={{ width: '100%', height: '100%' }}
          dpr={[1, 1.75]} // Clamped for smooth mobile 60 FPS performance
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
              waveGreeting={waveGreeting}
              onWaveComplete={() => setWaveGreeting(false)}
              accentColor={accentColor}
              cameraFraming={cameraFraming}
              vrm={vrm}
            />
          </Suspense>
        </Canvas>
      </div>

      {/* Subtle Avatar Mode & Framing Trigger */}
      <div
        className="absolute bottom-2 right-2 sm:bottom-3 sm:right-3 z-30 pointer-events-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          id="btn_avatar_mode_trigger"
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            window.dispatchEvent(new CustomEvent('open-avatar-controls'));
          }}
          className="px-2.5 py-1 rounded-full bg-black/65 hover:bg-black/90 border border-white/15 hover:border-[#00ff66]/40 text-white/70 hover:text-white text-[10px] font-telemetry flex items-center gap-1.5 backdrop-blur-md transition-all shadow-md active:scale-95 cursor-pointer"
          title="Open Avatar Framing & VRM Model Settings"
        >
          <Sparkles className="w-3 h-3 text-[#00ff66]" />
          <span>Avatar</span>
          <span className="text-[9px] text-[#00ff66]/90 uppercase font-semibold">
            {cameraFraming === 'full_body' ? 'Full' : cameraFraming === 'face' ? 'Face' : 'Half'}
          </span>
        </button>
      </div>

      {/* VRM 3D Model Upload & Management Modal */}
      <VRMUploadModal
        isOpen={isVRMModalOpen}
        onClose={() => setIsVRMModalOpen(false)}
        onUploadVRM={handleUploadVRM}
        onResetToDefault={handleResetToDefault}
        isLoading={isLoadingVRM}
        loadProgress={loadProgress}
        currentMeta={customMeta}
        usingCustomVRM={usingCustomVRM}
        onToggleModel={(useCustom) => {
          if (!useCustom) {
            handleResetToDefault();
          }
        }}
        errorMessage={vrmError}
      />
    </div>
  );
};

export default AnimeAvatar3D;
