import React, { useState, useEffect } from 'react';
import {
  CloudSun,
  CloudRain,
  Sun,
  Cloud,
  Zap,
  Heart,
  Clock,
  BookOpen,
  Music,
  ExternalLink,
  PenTool,
  Folder,
  RefreshCw,
  Sparkles,
  Calendar,
  CheckCircle2,
} from 'lucide-react';
import { locationService, WeatherData } from '../utils/locationService';
import { emotionEngine, getEmotionMeta } from '../utils/emotionEngine';
import { systemController } from '../utils/systemController';
import { EmotionType } from '../types';

interface HomeDashboardWidgetsProps {
  onOpenJournal: () => void;
  onOpenDocuments: () => void;
  onOpenWhiteboard: () => void;
  onOpenEmotionRadar: () => void;
  onOpenStudySettings: () => void;
  currentEmotion?: EmotionType;
}

export const HomeDashboardWidgets: React.FC<HomeDashboardWidgetsProps> = ({
  onOpenJournal,
  onOpenDocuments,
  onOpenWhiteboard,
  onOpenEmotionRadar,
  onOpenStudySettings,
  currentEmotion: propEmotion,
}) => {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [studyToday, setStudyToday] = useState<{ totalMinutes: number; sessionCount: number }>({
    totalMinutes: 0,
    sessionCount: 0,
  });
  const [remindersCount, setRemindersCount] = useState<number>(0);
  const [topReminder, setTopReminder] = useState<string | null>(null);
  const [dominantEmotion, setDominantEmotion] = useState<EmotionType>(() => {
    return propEmotion || emotionEngine.getState().dominant || 'warm';
  });

  useEffect(() => {
    loadWeather();
    loadStudy();
    loadReminders();

    const unsubEmotion = emotionEngine.subscribe((st) => {
      setDominantEmotion(st.dominant);
    });

    const interval = setInterval(() => {
      loadStudy();
      loadReminders();
    }, 60000);

    return () => {
      unsubEmotion();
      clearInterval(interval);
    };
  }, []);

  const loadWeather = async () => {
    setWeatherLoading(true);
    try {
      const data = await locationService.getWeather();
      setWeather(data);
    } catch (e) {
      console.warn('Could not fetch home widget weather:', e);
    } finally {
      setWeatherLoading(false);
    }
  };

  const loadStudy = async () => {
    try {
      const res = await fetch('/api/study/today');
      if (res.ok) {
        const data = await res.json();
        setStudyToday({
          totalMinutes: data?.totalMinutes || 0,
          sessionCount: data?.sessionCount ?? data?.sessionsCount ?? (Array.isArray(data?.sessions) ? data.sessions.length : 0),
        });
      }
    } catch (e) {
      // Quiet fail
    }
  };

  const loadReminders = () => {
    try {
      const rawRems = systemController.getReminders();
      const rems = (Array.isArray(rawRems) ? rawRems : []).filter((r) => r && !r.completed);
      setRemindersCount(rems.length);
      setTopReminder(rems.length > 0 && rems[0]?.title ? rems[0].title : null);
    } catch (e) {}
  };

  const emotionMeta = getEmotionMeta(dominantEmotion);

  const getWeatherIcon = (condition: string = '') => {
    const c = condition.toLowerCase();
    if (c.includes('rain') || c.includes('drizzle')) return <CloudRain className="w-4 h-4 text-blue-400" />;
    if (c.includes('cloud') || c.includes('overcast')) return <Cloud className="w-4 h-4 text-slate-300" />;
    if (c.includes('clear') || c.includes('sun')) return <Sun className="w-4 h-4 text-amber-400" />;
    return <CloudSun className="w-4 h-4 text-cyan-400" />;
  };

  return (
    <div
      id="home-dashboard-widgets-bar"
      className="w-full max-w-5xl mx-auto px-3 sm:px-6 pt-1 pb-2 z-20"
    >
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5">
        {/* 1. Weather Card */}
        <div
          onClick={loadWeather}
          className="group relative p-2.5 sm:p-3 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] hover:border-white/20 backdrop-blur-md transition-all cursor-pointer flex flex-col justify-between"
          title="Click to refresh live weather"
        >
          <div className="flex items-center justify-between text-white/50 text-[10px] font-telemetry uppercase tracking-wider mb-1">
            <span className="truncate">{weather?.locationName || 'Weather'}</span>
            <RefreshCw className={`w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity ${weatherLoading ? 'animate-spin' : ''}`} />
          </div>

          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-white/5 border border-white/10 shrink-0">
              {getWeatherIcon(weather?.condition)}
            </div>
            <div className="min-w-0">
              <div className="text-sm sm:text-base font-bold text-white tracking-tight leading-none">
                {weather ? `${Math.round(weather.temperature)}°C` : '--'}
              </div>
              <div className="text-[10px] text-white/60 truncate leading-tight mt-0.5">
                {weather?.condition || 'Tap to load'}
              </div>
            </div>
          </div>
        </div>

        {/* 2. Mood / Energy Card */}
        <div
          onClick={onOpenEmotionRadar}
          className="p-2.5 sm:p-3 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] hover:border-white/20 backdrop-blur-md transition-all cursor-pointer flex flex-col justify-between"
          title="Mery's Emotional State (Tap to open Radar)"
        >
          <div className="flex items-center justify-between text-white/50 text-[10px] font-telemetry uppercase tracking-wider mb-1">
            <span>Companion Mood</span>
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: emotionMeta.color }} />
          </div>

          <div className="flex items-center gap-2">
            <div
              className="p-1.5 rounded-xl border shrink-0"
              style={{
                backgroundColor: `${emotionMeta.color}15`,
                borderColor: `${emotionMeta.color}30`,
                color: emotionMeta.color,
              }}
            >
              <Heart className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-sm sm:text-base font-bold text-white tracking-tight leading-none capitalize truncate">
                {dominantEmotion}
              </div>
              <div className="text-[10px] text-white/60 truncate leading-tight mt-0.5">
                {emotionMeta.fullName}
              </div>
            </div>
          </div>
        </div>

        {/* 3. "Today" Card (Study + Reminders) */}
        <div
          onClick={onOpenStudySettings}
          className="p-2.5 sm:p-3 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] hover:border-white/20 backdrop-blur-md transition-all cursor-pointer flex flex-col justify-between"
          title="Today's Focus & Reminders (Tap to open Study tracker)"
        >
          <div className="flex items-center justify-between text-white/50 text-[10px] font-telemetry uppercase tracking-wider mb-1">
            <span>Today Focus</span>
            <span className="text-[#00ff66] font-mono text-[9px]">
              {studyToday.totalMinutes}m logged
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-[#00ff66]/10 border border-[#00ff66]/20 text-[#00ff66] shrink-0">
              <Clock className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-xs sm:text-sm font-semibold text-white tracking-tight leading-none truncate">
                {topReminder ? topReminder : `${studyToday.sessionCount} sessions`}
              </div>
              <div className="text-[10px] text-white/50 truncate leading-tight mt-0.5">
                {remindersCount > 0 ? `${remindersCount} active reminder` : 'On track today'}
              </div>
            </div>
          </div>
        </div>

        {/* 4. Quick Actions Hub (Journal, Music, Whiteboard, Docs) */}
        <div className="p-2 sm:p-2.5 rounded-2xl bg-white/[0.03] border border-white/[0.06] backdrop-blur-md flex items-center justify-between gap-1">
          {/* Journal Shortcut */}
          <button
            onClick={onOpenJournal}
            className="flex-1 p-2 rounded-xl bg-white/[0.04] hover:bg-amber-500/15 border border-white/[0.06] hover:border-amber-500/30 text-white/70 hover:text-amber-300 transition-all flex flex-col items-center gap-1 cursor-pointer active:scale-95"
            title="Open Journal"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span className="text-[9px] font-telemetry uppercase">Journal</span>
          </button>

          {/* Whiteboard Shortcut */}
          <button
            onClick={onOpenWhiteboard}
            className="flex-1 p-2 rounded-xl bg-white/[0.04] hover:bg-blue-500/15 border border-white/[0.06] hover:border-blue-500/30 text-white/70 hover:text-blue-300 transition-all flex flex-col items-center gap-1 cursor-pointer active:scale-95"
            title="Open Live Whiteboard"
          >
            <PenTool className="w-3.5 h-3.5" />
            <span className="text-[9px] font-telemetry uppercase">Board</span>
          </button>

          {/* Documents Shortcut */}
          <button
            onClick={onOpenDocuments}
            className="flex-1 p-2 rounded-xl bg-white/[0.04] hover:bg-cyan-500/15 border border-white/[0.06] hover:border-cyan-500/30 text-white/70 hover:text-cyan-300 transition-all flex flex-col items-center gap-1 cursor-pointer active:scale-95"
            title="Open Documents (data/documents/)"
          >
            <Folder className="w-3.5 h-3.5" />
            <span className="text-[9px] font-telemetry uppercase">Docs</span>
          </button>

          {/* Music Shortcut (Spotify / YT Music Deep Link) */}
          <div className="relative group">
            <button
              onClick={() => window.open('https://open.spotify.com', '_blank')}
              className="p-2 rounded-xl bg-white/[0.04] hover:bg-emerald-500/15 border border-white/[0.06] hover:border-emerald-500/30 text-white/70 hover:text-emerald-400 transition-all flex flex-col items-center gap-1 cursor-pointer active:scale-95"
              title="Music Deep-Links (Spotify / YouTube Music)"
            >
              <Music className="w-3.5 h-3.5" />
              <span className="text-[9px] font-telemetry uppercase">Music</span>
            </button>

            {/* Quick popup dropdown for Spotify vs YT Music */}
            <div className="absolute bottom-full right-0 mb-2 hidden group-hover:flex flex-col gap-1 p-1.5 rounded-xl bg-[#0e1117] border border-white/10 shadow-2xl z-30 min-w-[130px]">
              <a
                href="https://open.spotify.com"
                target="_blank"
                rel="noreferrer"
                className="px-2.5 py-1.5 rounded-lg hover:bg-emerald-500/20 text-emerald-400 text-[11px] font-medium flex items-center justify-between"
              >
                <span>Spotify</span>
                <ExternalLink className="w-3 h-3" />
              </a>
              <a
                href="https://music.youtube.com"
                target="_blank"
                rel="noreferrer"
                className="px-2.5 py-1.5 rounded-lg hover:bg-rose-500/20 text-rose-400 text-[11px] font-medium flex items-center justify-between"
              >
                <span>YT Music</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
