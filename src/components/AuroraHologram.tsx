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

  // Color mapping based on emotional resonance (Black & Blue Theme)
  const getAuraColors = () => {
    switch (emotion) {
      case 'curious':
        return {
          core: '#00A3FF', // Electric cyan blue
          glow: 'rgba(0, 163, 255, 0.45)',
          ring: '#0066FF',
          accent: '#38BDF8',
          label: 'Curious & Inquisitive',
        };
      case 'playful':
        return {
          core: '#38BDF8', // Sky blue
          glow: 'rgba(56, 189, 248, 0.5)',
          ring: '#00A3FF',
          accent: '#60A5FA',
          label: 'Playful & Lighthearted',
        };
      case 'thoughtful':
        return {
          core: '#2563EB', // Royal blue
          glow: 'rgba(37, 99, 235, 0.5)',
          ring: '#1D4ED8',
          accent: '#00A3FF',
          label: 'Reflective & Attentive',
        };
      case 'supportive':
        return {
          core: '#00A3FF',
          glow: 'rgba(0, 163, 255, 0.4)',
          ring: '#2563EB',
          accent: '#93C5FD',
          label: 'Warm & Reassuring',
        };
      case 'inspired':
        return {
          core: '#60A5FA',
          glow: 'rgba(96, 165, 250, 0.6)',
          ring: '#00A3FF',
          accent: '#38BDF8',
          label: 'Vibrant & Connected',
        };
      case 'warm':
      default:
        return {
          core: '#00A3FF',
          glow: 'rgba(0, 163, 255, 0.4)',
          ring: '#2563EB',
          accent: '#38BDF8',
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
          background: `radial-gradient(circle, ${colors.glow} 0%, rgba(0, 163, 255, 0.15) 45%, transparent 70%)`,
          filter: 'blur(35px)',
          transform: state === 'speaking' ? 'scale(1.25)' : state === 'listening' ? 'scale(1.15)' : 'scale(1)',
        }}
      />

      {/* Hologram Ring HUD Matrix */}
      <div className="relative w-56 h-56 flex items-center justify-center">
        {/* Outer orbital dotted ring */}
        <div
          className="absolute inset-0 rounded-full border border-dashed animate-orbit-slow"
          style={{ borderColor: 'rgba(0, 163, 255, 0.28)' }}
        />

        {/* Secondary counter-rotating telemetry ring */}
        <div
          className="absolute inset-2 rounded-full border animate-orbit-reverse"
          style={{
            borderColor: 'rgba(56, 189, 248, 0.22)',
            borderTopColor: colors.core,
            borderBottomColor: 'rgba(0, 163, 255, 0.5)',
          }}
        />

        {/* Inner thin precision ticks ring */}
        <div
          className="absolute inset-5 rounded-full border border-dotted"
          style={{ borderColor: 'rgba(0, 102, 255, 0.35)' }}
        />

        {/* HUD Crosshair markers (JARVIS inspiration) */}
        <div className="absolute w-full h-[1px] bg-gradient-to-r from-transparent via-[#00A3FF]/25 to-transparent pointer-events-none" />
        <div className="absolute h-full w-[1px] bg-gradient-to-b from-transparent via-[#38BDF8]/25 to-transparent pointer-events-none" />

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
            background: `radial-gradient(circle at 35% 35%, #FFFFFF 0%, ${colors.core} 35%, #051937 85%, #020204 100%)`,
            boxShadow: `0 0 35px ${colors.glow}, inset 0 0 20px rgba(255, 255, 255, 0.4), inset 0 0 35px ${colors.accent}`,
            border: `1.5px solid rgba(0, 163, 255, 0.4)`,
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
              <Activity className="w-6 h-6 animate-spin text-[#38BDF8]" />
            ) : state === 'listening' ? (
              <Radio className="w-6 h-6 animate-pulse text-[#00A3FF]" />
            ) : state === 'speaking' || isAudioPlaying ? (
              <Volume2 className="w-6 h-6 animate-pulse text-[#38BDF8]" />
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
              backgroundColor: '#00A3FF',
              boxShadow: '0 0 10px #00A3FF',
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
              backgroundColor: '#38BDF8',
              boxShadow: '0 0 12px #38BDF8',
            }}
          />
        </motion.div>
      </div>

      {/* Real-time Acoustic Waveform Bars (Blue Equalizer) */}
      <div className="flex items-center gap-1.5 mt-4 h-9 px-4 py-1.5 rounded-full bg-[#081426]/70 border border-[#00A3FF]/20 backdrop-blur-md">
        {waveHeights.map((h, i) => (
          <motion.div
            key={i}
            animate={{ height: `${h}px` }}
            transition={{ duration: 0.12, ease: 'easeOut' }}
            className="w-1 rounded-full"
            style={{
              background:
                i % 2 === 0
                  ? 'linear-gradient(to top, #0055FF, #00A3FF)'
                  : 'linear-gradient(to top, #00A3FF, #38BDF8)',
            }}
          />
        ))}
      </div>

      {/* Telemetry & Emotional Resonance Tag */}
      <div className="mt-3 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-[#00A3FF] animate-ping" />
        <span className="font-telemetry text-xs tracking-wider text-[#38BDF8] uppercase">
          MERY // {colors.label}
        </span>
        <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#00A3FF]/20 text-[#38BDF8] border border-[#00A3FF]/30 font-telemetry">
          {state.toUpperCase()}
        </span>
      </div>

      <p className="text-[11px] text-[#38BDF8]/60 mt-1 font-light tracking-wide text-center">
        Tap the core to check in with MERY
      </p>
    </div>
  );
};
