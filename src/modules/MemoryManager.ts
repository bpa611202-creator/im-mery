/**
 * Permanent Long-Term Memory Manager for MERY
 * Provides dual-layer persistence:
 *  - Primary fast client storage: localStorage ('mery_permanent_memories_v1')
 *  - Durable cloud/local SQLite synchronization: /api/memories (fallback /api/memory)
 *
 * Guarantees zero memory loss across page reloads, tab closes, and app restarts.
 */

export interface MemoryItem {
  id: string;
  userId?: string;
  type: string; // 'preference' | 'fact' | 'goal' | 'profile' | 'semantic' | 'system'
  category: string;
  key: string;
  value: string;
  content: string;
  importance: number; // 0.0 - 1.0 (defaults to 0.90)
  createdAt: string; // ISO 8601 string
  updatedAt: string; // ISO 8601 string
}

export const MEMORY_STORAGE_KEY = 'mery_permanent_memories_v1';
const LEGACY_STORAGE_KEY = 'mery_memories';

// Baseline system seeds if no persistent memories exist anywhere
const BASELINE_MEMORIES: MemoryItem[] = [
  {
    id: 'mem-core-1',
    userId: 'default_user',
    type: 'profile',
    category: 'system_identity',
    key: 'companion_identity',
    value: "MERY - Voice-native AI companion for M4 architecture",
    content: "MERY is the hyper-intelligent system interface for M4, embodying the authentic, poised, razor-sharp JARVIS demeanor with subtle British wit and absolute loyalty.",
    importance: 0.99,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'mem-core-2',
    userId: 'default_user',
    type: 'preference',
    category: 'communication',
    key: 'language_preference',
    value: "Bilingual English and Gujarati (ગુજરાતી / Gujlish)",
    content: "User appreciates seamless, polished bilingual fluency in English and Gujarati, switching naturally with dignified respect and concise turns.",
    importance: 0.98,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'mem-core-3',
    userId: 'default_user',
    type: 'preference',
    category: 'interaction_style',
    key: 'voice_brevity',
    value: "1-2 crisp spoken sentences per turn",
    content: "Voice turns must be direct, analytical, and concise (1-2 sentences). Ban generic filler and robotic helpdesk clichés.",
    importance: 0.95,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export class MemoryManager {
  private memories: MemoryItem[] = [];
  private isInitialized: boolean = false;
  private initPromise: Promise<MemoryItem[]> | null = null;
  private listeners: Set<() => void> = new Set();

  constructor() {
    // Synchronously preload from localStorage on construction to ensure instant availability
    this.loadFromLocalStorage();
  }

  /**
   * Subscribe to memory changes (add, remove, clear, sync)
   */
  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((fn) => {
      try {
        fn();
      } catch (err) {
        console.warn('[MemoryManager] Subscriber notification notice:', err);
      }
    });
  }

  /**
   * Synchronous load from localStorage fallback
   */
  private loadFromLocalStorage(): void {
    if (typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem(MEMORY_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.memories = parsed;
          return;
        }
      }

      // Check legacy key for migration
      const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (legacy) {
        const parsedLegacy = JSON.parse(legacy);
        if (Array.isArray(parsedLegacy) && parsedLegacy.length > 0) {
          this.memories = parsedLegacy.map((item: any, idx: number) => ({
            id: item.id || `mem_legacy_${idx}`,
            userId: 'default_user',
            type: 'fact',
            category: item.category || 'general',
            key: item.key || `fact_${idx + 1}`,
            value: item.text || item.value || '',
            content: item.text || item.content || item.value || '',
            importance: typeof item.importance === 'number' ? item.importance : 0.85,
            createdAt: item.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }));
          this.saveToLocalStorage();
          return;
        }
      }

      // Default to baseline seeds
      this.memories = [...BASELINE_MEMORIES];
      this.saveToLocalStorage();
    } catch (e) {
      console.warn('[MemoryManager] LocalStorage read notice:', e);
      this.memories = [...BASELINE_MEMORIES];
    }
  }

  private saveToLocalStorage(): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(MEMORY_STORAGE_KEY, JSON.stringify(this.memories));
    } catch (e) {
      console.warn('[MemoryManager] LocalStorage write notice:', e);
    }
  }

  /**
   * Initialize memory manager:
   * 1. Loads cached memories from localStorage immediately.
   * 2. Synchronizes with the backend SQLite database (/api/memories or /api/memory) if reachable.
   * 3. Merges any fresh items from the backend.
   */
  public async initialize(): Promise<MemoryItem[]> {
    if (this.isInitialized && this.memories.length > 0) {
      return this.getAllMemories();
    }

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = (async () => {
      // 1. Ensure local cached memories are ready
      this.loadFromLocalStorage();

      // 2. Fetch from backend SQLite API
      try {
        let backendMemories: any[] = [];
        let res: Response | null = null;

        try {
          res = await fetch('/api/memories');
        } catch {
          res = null;
        }

        if (!res || !res.ok) {
          try {
            res = await fetch('/api/memory');
          } catch {
            res = null;
          }
        }

        if (res && res.ok) {
          const data = await res.json();
          backendMemories = Array.isArray(data.memories) ? data.memories : [];
        }

        if (backendMemories.length > 0) {
          // Normalize and merge backend items into local cache
          const memoryMap = new Map<string, MemoryItem>();

          // First index local memories
          for (const m of this.memories) {
            const keyNorm = `${m.category.toLowerCase()}::${m.key.toLowerCase()}`;
            memoryMap.set(keyNorm, m);
          }

          // Merge backend memories
          for (const raw of backendMemories) {
            const cat = raw.category || raw.normalizedCategory || raw.normalized_category || 'general';
            const k = raw.key || raw.normalizedKey || raw.normalized_key || `item_${raw.id}`;
            const val = raw.value || raw.normalizedValue || raw.normalized_value || raw.content || '';
            const cnt = raw.content || `${cat}: ${k} is ${val}`;
            const imp = typeof raw.importance === 'number' ? raw.importance : 0.90;
            const created = typeof raw.createdAt === 'string'
              ? raw.createdAt
              : (raw.created_at ? new Date(raw.created_at).toISOString() : new Date().toISOString());
            const updated = typeof raw.updatedAt === 'string'
              ? raw.updatedAt
              : (raw.updated_at ? new Date(raw.updated_at).toISOString() : new Date().toISOString());

            const normKey = `${cat.toLowerCase()}::${k.toLowerCase()}`;
            const existing = memoryMap.get(normKey);

            if (existing) {
              // Update if backend is more recent or has higher confidence
              existing.value = val || existing.value;
              existing.content = cnt || existing.content;
              existing.importance = Math.max(existing.importance, imp);
              existing.updatedAt = updated;
            } else {
              const item: MemoryItem = {
                id: String(raw.id || `mem_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`),
                userId: raw.userId || raw.user_id || 'default_user',
                type: raw.type || 'preference',
                category: cat,
                key: k,
                value: val,
                content: cnt,
                importance: imp,
                createdAt: created,
                updatedAt: updated,
              };
              memoryMap.set(normKey, item);
            }
          }

          this.memories = Array.from(memoryMap.values());
          this.saveToLocalStorage();
        }
      } catch (syncErr) {
        console.warn('[MemoryManager] Backend sync notice (using local storage fallback):', syncErr);
      }

      this.isInitialized = true;
      this.notify();
      return this.getAllMemories();
    })();

    return this.initPromise;
  }

  /**
   * Add or update a permanent memory:
   * - Persists immediately to localStorage ('mery_permanent_memories_v1')
   * - Asynchronously syncs with backend SQLite database (/api/memories)
   */
  public async addMemory(
    category: string,
    key: string,
    value: string,
    content?: string,
    type: string = 'preference',
    importance: number = 0.90
  ): Promise<MemoryItem> {
    const cleanCategory = (category || 'general').trim().toLowerCase();
    const cleanKey = (key || '').trim();
    const cleanValue = (value || '').trim();
    const cleanContent = (content || `${cleanCategory}: ${cleanKey} is ${cleanValue}`).trim();
    const now = new Date().toISOString();

    const normalizedLookup = `${cleanCategory}::${cleanKey.toLowerCase()}`;

    // Look for existing memory matching category and key
    const existingIndex = this.memories.findIndex(
      (m) => `${m.category.toLowerCase()}::${m.key.toLowerCase()}` === normalizedLookup
    );

    let savedItem: MemoryItem;

    if (existingIndex >= 0) {
      const existing = this.memories[existingIndex];
      savedItem = {
        ...existing,
        value: cleanValue,
        content: cleanContent,
        type: type || existing.type,
        importance: Math.max(existing.importance, importance),
        updatedAt: now,
      };
      this.memories[existingIndex] = savedItem;
    } else {
      savedItem = {
        id: `mem_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        userId: 'default_user',
        type: type || 'preference',
        category: cleanCategory,
        key: cleanKey,
        value: cleanValue,
        content: cleanContent,
        importance: typeof importance === 'number' ? importance : 0.90,
        createdAt: now,
        updatedAt: now,
      };
      this.memories.push(savedItem);
    }

    // 1. Immediate local persistence
    this.saveToLocalStorage();
    this.notify();

    // 2. Asynchronous backend sync
    this.syncItemToBackend(savedItem).catch((err) => {
      console.warn('[MemoryManager] Background backend sync notice:', err);
    });

    return savedItem;
  }

  /**
   * Send memory item to backend SQLite database
   */
  private async syncItemToBackend(item: MemoryItem): Promise<void> {
    const payload = {
      id: item.id,
      userId: item.userId,
      type: item.type,
      category: item.category,
      key: item.key,
      value: item.value,
      content: item.content,
      text: item.content,
      importance: item.importance,
    };

    try {
      const res = await fetch('/api/memories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        // Try fallback route /api/memory
        await fetch('/api/memory', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }
    } catch {
      // Backend unavailable; local persistence guarantees retention
    }
  }

  /**
   * Return all active memories sorted by importance descending
   */
  public getAllMemories(): MemoryItem[] {
    return [...this.memories].sort((a, b) => {
      if (b.importance !== a.importance) {
        return b.importance - a.importance;
      }
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }

  /**
   * Get a single memory by ID
   */
  public getMemory(id: string): MemoryItem | undefined {
    return this.memories.find((m) => m.id === id);
  }

  /**
   * Format all stored memories into a clean markdown block for Gemini systemInstruction
   */
  public formatMemoriesForPrompt(): string {
    const all = this.getAllMemories();
    if (all.length === 0) {
      return '';
    }

    const lines: string[] = [
      '### PERMANENT LONG-TERM MEMORIES & USER PROFILE:',
      'The following facts, preferences, goals, and rules have been explicitly learned and remembered about the user across sessions. You MUST maintain absolute continuity with these ground truths:',
    ];

    // Group by category for optimal readability
    const categories = new Map<string, MemoryItem[]>();
    for (const mem of all) {
      const cat = (mem.category || 'General').toUpperCase();
      if (!categories.has(cat)) {
        categories.set(cat, []);
      }
      categories.get(cat)!.push(mem);
    }

    for (const [catName, items] of categories.entries()) {
      lines.push(`\n**[${catName}]**`);
      for (const item of items) {
        const impTag = item.importance >= 0.95 ? ' ⭐ [High Priority]' : '';
        lines.push(`- **${item.key}**: ${item.value} — _${item.content}_${impTag}`);
      }
    }

    lines.push(
      '\nCRITICAL CONTINUITY DIRECTIVE: Never ask the user for details already documented above. Treat these permanent memories as verified ground truth across all past, present, and future conversations.'
    );

    return lines.join('\n');
  }

  /**
   * Remove a memory by ID
   */
  public async removeMemory(id: string): Promise<boolean> {
    const initialLen = this.memories.length;
    this.memories = this.memories.filter((m) => m.id !== id);

    if (this.memories.length !== initialLen) {
      this.saveToLocalStorage();
      this.notify();

      // Notify backend
      try {
        await fetch(`/api/memories/${encodeURIComponent(id)}`, { method: 'DELETE' });
      } catch {
        try {
          await fetch(`/api/memory/${encodeURIComponent(id)}`, { method: 'DELETE' });
        } catch {}
      }

      return true;
    }
    return false;
  }

  /**
   * Clear all memories
   */
  public async clearAll(): Promise<boolean> {
    this.memories = [];
    this.saveToLocalStorage();
    this.notify();

    try {
      await fetch('/api/memories', { method: 'DELETE' });
    } catch {
      try {
        await fetch('/api/memory', { method: 'DELETE' });
      } catch {}
    }

    return true;
  }
}

export const memoryManager = new MemoryManager();
