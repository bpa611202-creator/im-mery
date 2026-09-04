import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Sparkles, Radio, Activity, Volume2 } from 'lucide-react';
import { EmotionType } from '../types';

interface AuroraHologramProps {
  state: 'idle' | 'listening' | 'thinking' | 'speaking';
  emotion: EmotionType;
  onClickPrompt?: () => void;
  isAudioPlaying?: boolean;
}

export const AuroraHologram: React.FC<AuroraHologramProps> = ({
  state,
  emotion,
  onClickPrompt,
  isAudioPlaying = false,
}) => {
  const [waveHeights, setWaveHeights] = useState<number[]>([12, 24, 18, 32, 28, 40, 26, 18, 30, 16, 22, 14]);

  // Simulate or animate voice reactive waveforms when speaking or listening
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (state === 'speaking' || state === 'listening' || isAudioPlaying) {
      interval = setInterval(() => {
        setWaveHeights(
          Array.from({ length: 14 }, () => Math.floor(Math.random() * 38) + 10)
        );
      }, 100);
    } else {
      setWaveHeights([8, 12, 16, 14, 20, 18, 22, 18, 14, 16, 12, 8, 10, 6]);
    }
    return () => clearInterval(interval);
  }, [state, isAudioPlaying]);

  // Color mapping based on emotional resonance
  const getAuraColors = () => {
    switch (emotion) {
      case 'curious':
        return {
          core: '#C6A0FF', // Neon lavender
          glow: 'rgba(198, 160, 255, 0.45)',
          ring: '#9D7BFF',
          accent: '#E7B7A5',
          label: 'Curious & Inquisitive',
        };
      case 'playful':
        return {
          core: '#E7B7A5', // Rose gold
          glow: 'rgba(231, 183, 165, 0.5)',
          ring: '#C6A0FF',
          accent: '#FFB2D9',
          label: 'Playful & Lighthearted',
        };
      case 'thoughtful':
        return {
          core: '#9D7BFF', // Soft violet
          glow: 'rgba(157, 123, 255, 0.5)',
          ring: '#7B5FE0',
          accent: '#C6A0FF',
          label: 'Reflective & Attentive',
        };
      case 'supportive':
        return {
          core: '#E7B7A5',
          glow: 'rgba(231, 183, 165, 0.4)',
          ring: '#9D7BFF',
          accent: '#F3D5CA',
          label: 'Warm & Reassuring',
        };
      case 'inspired':
        return {
          core: '#C6A0FF',
          glow: 'rgba(198, 160, 255, 0.6)',
          ring: '#E7B7A5',
          accent: '#9D7BFF',
          label: 'Vibrant & Connected',
        };
      case 'warm':
      default:
        return {
          core: '#9D7BFF',
          glow: 'rgba(157, 123, 255, 0.4)',
          ring: '#E7B7A5',
          accent: '#C6A0FF',
          label: 'Warm & Present',
        };
    }
  };

  const colors = getAuraColors();

  return (
    <div
      id="aurora-hologram-container"
      onClick={onClickPrompt}
      className="relative flex flex-col items-center justify-center p-6 select-none cursor-pointer group"
      title="Click to interact directly with MERY"
    >
      {/* Background ambient radial blur */}
      <div
        className="absolute w-72 h-72 rounded-full pointer-events-none transition-all duration-1000 ease-out"
        style={{
          background: `radial-gradient(circle, ${colors.glow} 0%, rgba(231, 183, 165, 0.15) 45%, transparent 70%)`,
          filter: 'blur(35px)',
          transform: state === 'speaking' ? 'scale(1.25)' : state === 'listening' ? 'scale(1.15)' : 'scale(1)',
        }}
      />

      {/* Hologram Ring HUD Matrix */}
      <div className="relative w-56 h-56 flex items-center justify-center">
        {/* Outer orbital dotted ring */}
        <div
          className="absolute inset-0 rounded-full border border-dashed animate-orbit-slow"
          style={{ borderColor: 'rgba(231, 183, 165, 0.28)' }}
        />

        {/* Secondary counter-rotating telemetry ring */}
        <div
          className="absolute inset-2 rounded-full border animate-orbit-reverse"
          style={{
            borderColor: 'rgba(198, 160, 255, 0.22)',
            borderTopColor: colors.core,
            borderBottomColor: 'rgba(231, 183, 165, 0.5)',
          }}
        />

        {/* Inner thin precision ticks ring */}
        <div
          className="absolute inset-5 rounded-full border border-dotted"
          style={{ borderColor: 'rgba(157, 123, 255, 0.35)' }}
        />

        {/* HUD Crosshair markers (JARVIS inspiration) */}
        <div className="absolute w-full h-[1px] bg-gradient-to-r from-transparent via-[#E7B7A5]/25 to-transparent pointer-events-none" />
        <div className="absolute h-full w-[1px] bg-gradient-to-b from-transparent via-[#9D7BFF]/25 to-transparent pointer-events-none" />

        {/* Dynamic Center Holographic Neural Core */}
        <motion.div
          id="mery-neural-core"
          animate={{
            scale: state === 'speaking' ? [1, 1.14, 1.05, 1.18, 1] : state === 'thinking' ? [1, 0.94, 1.06, 1] : [1, 1.04, 1],
            rotate: state === 'thinking' ? 360 : 0,
          }}
          transition={{
            duration: state === 'thinking' ? 2 : 4,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="relative w-28 h-28 rounded-full flex items-center justify-center shadow-2xl transition-all duration-700"
          style={{
            background: `radial-gradient(circle at 35% 35%, #FFFFFF 0%, ${colors.core} 35%, #24143D 85%, #0A0612 100%)`,
            boxShadow: `0 0 35px ${colors.glow}, inset 0 0 20px rgba(255, 255, 255, 0.4), inset 0 0 35px ${colors.accent}`,
            border: `1.5px solid rgba(231, 183, 165, 0.4)`,
          }}
        >
          {/* Inner pulsating core sheen */}
          <motion.div
            animate={{
              opacity: [0.6, 1, 0.6],
              scale: [0.85, 1.05, 0.85],
            }}
            transition={{
              duration: 2.5,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className="w-14 h-14 rounded-full"
            style={{
              background: `radial-gradient(circle, rgba(255, 255, 255, 0.9) 0%, ${colors.accent} 50%, transparent 80%)`,
              filter: 'blur(3px)',
            }}
          />

          {/* Core Sparkle / Icon indicator */}
          <div className="absolute inset-0 flex items-center justify-center text-white/90">
            {state === 'thinking' ? (
              <Activity className="w-6 h-6 animate-spin text-[#E7B7A5]" />
            ) : state === 'listening' ? (
              <Radio className="w-6 h-6 animate-pulse text-[#C6A0FF]" />
            ) : state === 'speaking' || isAudioPlaying ? (
              <Volume2 className="w-6 h-6 animate-pulse text-[#E7B7A5]" />
            ) : (
              <Sparkles className="w-6 h-6 text-white/80 group-hover:scale-110 transition-transform" />
            )}
          </div>
        </motion.div>

        {/* Orbiting satellite particles */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
          className="absolute inset-0 pointer-events-none"
        >
          <div
            className="w-2.5 h-2.5 rounded-full absolute top-1 left-1/2 -translate-x-1/2 shadow-lg"
            style={{
              backgroundColor: '#E7B7A5',
              boxShadow: '0 0 10px #E7B7A5',
            }}
          />
        </motion.div>
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: 16, repeat: Infinity, ease: 'linear' }}
          className="absolute inset-0 pointer-events-none"
        >
          <div
            className="w-2 h-2 rounded-full absolute bottom-3 right-8 shadow-lg"
            style={{
              backgroundColor: '#C6A0FF',
              boxShadow: '0 0 12px #C6A0FF',
            }}
          />
        </motion.div>
      </div>

      {/* Real-time Acoustic Waveform Bars (AURORA ROSE Equalizer) */}
      <div className="flex items-center gap-1.5 mt-4 h-9 px-4 py-1.5 rounded-full bg-[#120E1E]/60 border border-[#E7B7A5]/20 backdrop-blur-md">
        {waveHeights.map((h, i) => (
          <motion.div
            key={i}
            animate={{ height: `${h}px` }}
            transition={{ duration: 0.12, ease: 'easeOut' }}
            className="w-1 rounded-full"
            style={{
              background:
                i % 2 === 0
                  ? 'linear-gradient(to top, #9D7BFF, #C6A0FF)'
                  : 'linear-gradient(to top, #E7B7A5, #F5D5C8)',
            }}
          />
        ))}
      </div>

      {/* Telemetry & Emotional Resonance Tag */}
      <div className="mt-3 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-[#9D7BFF] animate-ping" />
        <span className="font-telemetry text-xs tracking-wider text-[#E7B7A5] uppercase">
          MERY // {colors.label}
        </span>
        <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#9D7BFF]/20 text-[#C6A0FF] border border-[#9D7BFF]/30 font-telemetry">
          {state.toUpperCase()}
        </span>
      </div>

      <p className="text-[11px] text-[#C6A0FF]/60 mt-1 font-light tracking-wide text-center">
        Tap the core to check in with MERY
      </p>
    </div>
  );
};
