import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { EmotionType } from '../types';

export interface JarvisProps {
  state?: 'idle' | 'listening' | 'thinking' | 'speaking';
  isLive?: boolean;
  emotion?: EmotionType;
  onClick?: () => void;
}

// ૧. JARVIS સેન્ટ્રલ પલ્સિંગ કોર
function CentralCore({ pulseRate, color }: { pulseRate: number; color: string }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime * pulseRate;
    const scale = 1 + Math.sin(t * 3) * 0.08;
    if (meshRef.current) {
      meshRef.current.scale.set(scale, scale, scale);
    }
    if (glowRef.current) {
      const glowScale = 1.2 + Math.sin(t * 2) * 0.12;
      glowRef.current.scale.set(glowScale, glowScale, glowScale);
    }
  });

  return (
    <group>
      {/* અંદરનો સોલિડ ગ્લો સ્ફિયર */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[0.45, 32, 32]} />
        <meshBasicMaterial color="#E0F7FF" />
      </mesh>
      {/* બહારનો ટ્રાન્સપરન્ટ હોલો ગ્લો */}
      <mesh ref={glowRef}>
        <sphereGeometry args={[0.7, 32, 32]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.3}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  );
}

// ૨. JARVIS રોટેટિંગ ટેક રિંગ્સ (HUD Rings)
function JarvisHudRings({ pulseRate, color }: { pulseRate: number; color: string }) {
  const r1 = useRef<THREE.Group>(null);
  const r2 = useRef<THREE.Group>(null);
  const r3 = useRef<THREE.Group>(null);
  const r4 = useRef<THREE.Group>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime * pulseRate;
    if (r1.current) r1.current.rotation.z = t * 0.6;
    if (r2.current) r2.current.rotation.z = -t * 0.45;
    if (r3.current) {
      r3.current.rotation.x = 1.1 + Math.sin(t * 0.5) * 0.15;
      r3.current.rotation.y = t * 0.5;
    }
    if (r4.current) {
      r4.current.rotation.x = -0.9 + Math.cos(t * 0.4) * 0.15;
      r4.current.rotation.y = -t * 0.4;
    }
  });

  return (
    <group>
      {/* મુખ્ય આઉટર આર્ક રિંગ */}
      <group ref={r1}>
        <mesh>
          <ringGeometry args={[1.6, 1.63, 64]} />
          <meshBasicMaterial
            color={color}
            side={THREE.DoubleSide}
            transparent
            opacity={0.85}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
        {/* સેગમેન્ટ્સ / ડેશ માર્કર્સ */}
        <mesh>
          <ringGeometry args={[1.72, 1.76, 24]} />
          <meshBasicMaterial
            color="#FFFFFF"
            side={THREE.DoubleSide}
            wireframe
            transparent
            opacity={0.6}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      </group>

      {/* સેકન્ડરી રિવર્સ રિંગ */}
      <group ref={r2}>
        <mesh>
          <ringGeometry args={[1.25, 1.28, 48]} />
          <meshBasicMaterial
            color="#C6A0FF"
            side={THREE.DoubleSide}
            transparent
            opacity={0.7}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
        <mesh>
          <ringGeometry args={[1.35, 1.37, 16]} />
          <meshBasicMaterial
            color={color}
            side={THREE.DoubleSide}
            wireframe
            transparent
            opacity={0.5}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      </group>

      {/* 3D ઓર્બિટલ રિંગ્સ (ઝુકાવ વાળી રિંગ્સ) */}
      <group ref={r3}>
        <mesh>
          <torusGeometry args={[1.95, 0.015, 16, 100]} />
          <meshBasicMaterial
            color="#00A3FF"
            transparent
            opacity={0.75}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      </group>

      <group ref={r4}>
        <mesh>
          <torusGeometry args={[2.1, 0.012, 16, 100]} />
          <meshBasicMaterial
            color="#9F2B68"
            transparent
            opacity={0.5}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      </group>
    </group>
  );
}

// ૩. સેન્ટ્રલ પાર્ટિકલ સ્વારમ્ (Perfect Spherical Distribution)
function TechParticles({ count = 900, color, pulseRate = 1.0 }: { count?: number; color: string; pulseRate?: number }) {
  const pointsRef = useRef<THREE.Points>(null);

  const [positions] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      // પરફેક્ટ યુનિફોર્મ સ્ફિયર મેથ
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const r = 0.85 + Math.random() * 0.45;

      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);
    }
    return [pos];
  }, [count]);

  useFrame((state) => {
    if (!pointsRef.current) return;
    const t = state.clock.elapsedTime * 0.25 * pulseRate;
    pointsRef.current.rotation.y = t;
    pointsRef.current.rotation.x = t * 0.5;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.028}
        color={color}
        transparent
        opacity={0.8}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

// મુખ્ય કમ્પોનન્ટ એક્સપોર્ટ
export const JarvisHologram3D: React.FC<JarvisProps> = ({
  state = 'idle',
  isLive = false,
  emotion,
  onClick,
}) => {
  // Neural Cyan/Blue HUD કલર પેલેટ
  const neuralBlue =
    emotion === 'excited'
      ? '#38BDF8'
      : emotion === 'playful'
      ? '#60A5FA'
      : emotion === 'thoughtful'
      ? '#2563EB'
      : '#00A3FF';
  const pulseRate =
    state === 'speaking' ? 2.6 : state === 'thinking' ? 2.1 : state === 'listening' ? 1.7 : 1.0;

  return (
    <div
      onClick={onClick}
      className={`w-full flex items-center justify-center relative my-1 sm:my-2 ${
        onClick ? 'cursor-pointer' : ''
      }`}
    >
      {/* Cyan-Blue HUD બેકગ્રાઉન્ડ ગ્લો */}
      <div
        className="absolute w-56 h-56 sm:w-72 sm:h-72 md:w-84 md:h-84 rounded-full pointer-events-none transition-all duration-700"
        style={{
          background:
            'radial-gradient(circle, rgba(0, 163, 255, 0.32) 0%, rgba(0, 85, 255, 0.14) 45%, transparent 70%)',
          filter: 'blur(45px)',
          transform:
            state === 'speaking'
              ? 'scale(1.25)'
              : state === 'thinking'
              ? 'scale(1.15)'
              : 'scale(1)',
        }}
      />

      {/* સ્ક્વેર એસ્પેક્ત રેશિયો કન્ટેનર - જેથી ઓબ્જેક્ટ ખેંચાય (stretch) નહીં */}
      <div className="w-full h-full aspect-square relative select-none flex items-center justify-center mx-auto">
        <Canvas
          camera={{ position: [0, 0, 5.2], fov: 45 }}
          style={{ width: '100%', height: '100%' }}
          gl={{ antialias: true, alpha: true }}
        >
          <ambientLight intensity={0.5} />
          <group position={[0, 0, 0]}>
            <CentralCore pulseRate={pulseRate} color={neuralBlue} />
            <JarvisHudRings pulseRate={pulseRate} color={neuralBlue} />
            <TechParticles pulseRate={pulseRate} color={neuralBlue} />
          </group>
        </Canvas>
      </div>
    </div>
  );
};

export default JarvisHologram3D;
