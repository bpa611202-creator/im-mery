import { MemoryRankingWeights, MemoryType } from './memoryTypes';

export const DEFAULT_RANKING_WEIGHTS: MemoryRankingWeights = {
  semanticSimilarity: 0.35,
  importance: 0.20,
  recency: 0.10,
  confidence: 0.15,
  contextualRelevance: 0.20,
};

export const DEFAULT_IMPORTANCE_THRESHOLD = 0.60;
export const DEFAULT_RELEVANCE_THRESHOLD = 0.38;
export const DEFAULT_MEMORY_BUDGET = 6; // Compact 3-8 memories

export const MEMORY_TYPE_META: Record<MemoryType, { label: string; icon: string; description: string; badgeColor: string }> = {
  semantic: {
    label: 'Semantic Fact',
    icon: 'Sparkles',
    description: 'Stable facts about the user and lifestyle',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  },
  preference: {
    label: 'Preference',
    icon: 'Heart',
    description: 'User tastes, favorite games, media, UI & voice preferences',
    badgeColor: 'bg-pink-500/20 text-pink-300 border-pink-500/30',
  },
  project: {
    label: 'Project',
    icon: 'FolderKanban',
    description: 'Ongoing work, software projects & creative tasks',
    badgeColor: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
  },
  goal: {
    label: 'Goal',
    icon: 'Target',
    description: 'Long-term aspirations and targets',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  },
  habit: {
    label: 'Habit & Rhythm',
    icon: 'Clock',
    description: 'Recurring behaviors and daily work patterns',
    badgeColor: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
  },
  relationship: {
    label: 'Entity & Relation',
    icon: 'Network',
    description: 'People, channels, devices, apps and known entities',
    badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
  },
  conversation: {
    label: 'Conversation Milestone',
    icon: 'MessageSquare',
    description: 'Significant conversational milestones and events',
    badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  },
};

// Expressions that indicate pure conversational filler or small talk that must be IGNORED
export const TRIVIAL_CHAT_PATTERNS: RegExp[] = [
  /^(hi|hello|hey|yo|howdy|sup|greetings)\b/i,
  /^(good\s+(morning|afternoon|evening|night))\b/i,
  /^(how\s+are\s+you|how's\s+it\s+going|what's\s+up)\b/i,
  /^(lol|lmao|haha|hehe|rofl)\b/i,
  /^(ok|okay|k|alright|cool|nice|gotcha|yep|yeah|sure|thanks|thank\s+you|thx|bye|see\s+ya)\b/i,
  /^(testing|test|1\s*2\s*3|ping)\b/i,
];

// Explicit request patterns indicating high-priority memory intention
export const EXPLICIT_MEMORY_PATTERNS: RegExp[] = [
  /\b(?:remember\s+(?:this|that)|save\s+this|don'?t\s+forget|keep\s+in\s+mind|make\s+a\s+note\s+that|note\s+that)\b/i,
  /\b(?:always\s+remember|remember\s+to\s+always|keep\s+track\s+of)\b/i,
];
