export type MemoryType =
  | 'semantic'      // Stable facts about the user (e.g. "I run a YouTube channel", "I prefer dark UI")
  | 'preference'    // User preferences (games, music, language, response style, voice)
  | 'project'       // Ongoing projects (MERY development, software, YouTube projects)
  | 'goal'          // Long-term goals ("I want to build my own AI assistant")
  | 'habit'         // Recurring patterns/behavior (requires evidence, not 1 occurrence)
  | 'relationship'  // Known entities & relations (people, channels, games, apps, devices)
  | 'conversation'; // Important milestone events from conversations (lower priority than stable facts)

export type MemoryStatus = 'active' | 'superseded' | 'archived' | 'deleted';

export type MemoryDecisionAction = 'SAVE' | 'UPDATE' | 'MERGE' | 'IGNORE' | 'DELETE';

export type RelationType = 'related_to' | 'contradicts' | 'supports' | 'belongs_to' | 'part_of';

export interface NormalizedContent {
  category: string;  // e.g. "gaming", "creator", "audio", "ui", "lifestyle"
  key: string;       // e.g. "favorite_game", "youtube_channel", "working_schedule"
  value: string;     // e.g. "GTA 6", "active", "night_owl"
  entities?: string[];
  attributes?: Record<string, any>;
}

export interface MemoryValueScores {
  importance: number;        // 0.0 - 1.0 (how critical this fact is)
  futureUsefulness: number;  // 0.0 - 1.0 (likelihood of future relevance)
  stability: number;         // 0.0 - 1.0 (is it permanent vs fleeting)
  explicitness: number;      // 0.0 - 1.0 (did user explicitly ask to remember)
  repetition?: number;       // frequency of observation
  specificity?: number;      // 0.0 - 1.0 (concrete vs vague)
  confidence: number;        // 0.0 - 1.0 (certainty of extraction)
  recency?: number;          // normalized recency score
}

export interface MemoryCandidate {
  type: MemoryType;
  content: string;
  normalizedContent: NormalizedContent;
  scores: MemoryValueScores;
  source: 'explicit_user_request' | 'conversation_inference' | 'system_observation';
  action: MemoryDecisionAction;
  existingMemoryId?: string;
  conflictReason?: string;
  expiresAt?: number | null;
}

export interface MemoryRelation {
  id: string;
  sourceMemoryId: string;
  targetMemoryId: string;
  relationType: RelationType;
  confidence: number;
  createdAt: number;
}

export interface MemoryItem {
  id: string;
  userId: string;
  type: MemoryType;
  content: string;
  normalizedCategory: string;
  normalizedKey: string;
  normalizedValue: string;
  status: MemoryStatus;
  importance: number;
  futureUsefulness: number;
  stability: number;
  explicitness: number;
  confidence: number;
  accessCount: number;
  createdAt: number;
  updatedAt: number;
  lastAccessedAt: number;
  lastConfirmedAt: number;
  expiresAt?: number | null;
  sourceSessionId?: string;
  sourceMessageId?: string;
  version: number;
  tags: string[];
  relations?: MemoryRelation[];
  provenance?: string;
  // Dynamic fields during retrieval
  relevanceScore?: number;
  scoreBreakdown?: {
    semantic: number;
    importance: number;
    recency: number;
    confidence: number;
    contextual: number;
    final: number;
  };
}

export interface MemoryEmbedding {
  id: string;
  memoryId: string;
  embedding: number[];
  embeddingModel: string;
  createdAt: number;
}

export interface MemoryAccessLog {
  id: string;
  memoryId: string;
  queryId: string;
  queryText: string;
  retrievedAt: number;
  relevanceScore: number;
  usedInResponse: boolean;
}

export interface MemoryVersion {
  id: string;
  memoryId: string;
  previousContent: string;
  newContent: string;
  changeType: 'created' | 'updated' | 'superseded' | 'archived' | 'deleted';
  createdAt: number;
}

export interface SessionSummary {
  id: string;
  sessionId: string;
  topics: string[];
  decisions: string[];
  facts: string[];
  unfinishedTasks: string[];
  preferencesDiscovered: string[];
  emotionalContext?: string;
  createdAt: number;
}

export interface MemoryRankingWeights {
  semanticSimilarity: number;  // default 0.35
  importance: number;          // default 0.20
  recency: number;             // default 0.10
  confidence: number;          // default 0.15
  contextualRelevance: number; // default 0.20
}

export interface MemoryQuery {
  text: string;
  types?: MemoryType[];
  category?: string;
  entities?: string[];
  limit?: number;
  threshold?: number;
  includeSuperseded?: boolean;
}

export interface MemoryContextResult {
  memories: MemoryItem[];
  formattedContext: string;
  diagnostics: {
    totalCandidates: number;
    filteredCount: number;
    retrievalTimeMs: number;
  };
}

export interface MemoryExtractionResult {
  candidates: MemoryCandidate[];
  ignoredCount: number;
  decisions: Array<{
    action: MemoryDecisionAction;
    type: MemoryType;
    content: string;
    reason: string;
  }>;
}

export interface MemoryStats {
  totalActive: number;
  totalSuperseded: number;
  totalArchived: number;
  byType: Record<MemoryType, number>;
  byCategory: Record<string, number>;
  totalAccesses: number;
  lastExtractionAt?: number;
  databaseSizeKb: number;
  isVectorEngineReady: boolean;
}
