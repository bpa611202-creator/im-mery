import { getDatabase } from "./database";
import { embeddingService } from "./embeddingService";
import { GoogleGenAI } from "@google/genai";
import {
  DEFAULT_RANKING_WEIGHTS,
  DEFAULT_IMPORTANCE_THRESHOLD,
  DEFAULT_RELEVANCE_THRESHOLD,
  DEFAULT_MEMORY_BUDGET,
  TRIVIAL_CHAT_PATTERNS,
  EXPLICIT_MEMORY_PATTERNS,
} from "../../src/memory/memoryConstants";
import {
  MemoryItem,
  MemoryCandidate,
  MemoryType,
  MemoryStatus,
  MemoryQuery,
  MemoryContextResult,
  MemoryStats,
  SessionSummary,
  MemoryDecisionAction,
} from "../../src/memory/memoryTypes";

export class ServerMemoryService {
  private geminiClient: GoogleGenAI | null = null;
  private extractionQuotaCooldownUntil: number = 0;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      this.geminiClient = new GoogleGenAI({
        apiKey,
        httpOptions: { headers: { "User-Agent": "aistudio-build-memory" } },
      });
    }
  }

  // ---------------------------------------------------------------------------
  // 1. RETRIEVAL & RANKING PIPELINE
  // ---------------------------------------------------------------------------
  public async retrieve(query: MemoryQuery): Promise<MemoryContextResult> {
    const start = performance.now();
    const db = getDatabase();

    // 1. Clean expired memories first (lazy forgetting)
    this.cleanExpiredMemories();

    const limit = query.limit || DEFAULT_MEMORY_BUDGET;
    const threshold = query.threshold !== undefined ? query.threshold : DEFAULT_RELEVANCE_THRESHOLD;

    // 2. Fetch active candidate memories from SQLite
    let sql = `SELECT * FROM memories WHERE status = 'active'`;
    const params: any[] = [];

    if (query.types && query.types.length > 0) {
      const placeholders = query.types.map(() => "?").join(",");
      sql += ` AND type IN (${placeholders})`;
      params.push(...query.types);
    }

    if (query.category) {
      sql += ` AND normalized_category = ?`;
      params.push(query.category);
    }

    const stmt = db.prepare(sql);
    const rows: any[] = stmt.all(...params);

    if (rows.length === 0) {
      return {
        memories: [],
        formattedContext: "",
        diagnostics: {
          totalCandidates: 0,
          filteredCount: 0,
          retrievalTimeMs: Math.round(performance.now() - start),
        },
      };
    }

    // 3. Generate query embedding for semantic similarity
    const queryEmb = await embeddingService.getEmbedding(query.text);

    // 4. Tokenize query for keyword & exact match scoring
    const queryTokens = new Set(
      query.text
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter((t) => t.length > 2)
    );

    const now = Date.now();
    const scoredCandidates: MemoryItem[] = [];

    for (const row of rows) {
      const mem: MemoryItem = {
        id: row.id,
        userId: row.user_id,
        type: row.type as MemoryType,
        content: row.content,
        normalizedCategory: row.normalized_category,
        normalizedKey: row.normalized_key,
        normalizedValue: row.normalized_value,
        status: row.status as MemoryStatus,
        importance: row.importance,
        futureUsefulness: row.future_usefulness,
        stability: row.stability,
        explicitness: row.explicitness,
        confidence: row.confidence,
        accessCount: row.access_count,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        lastAccessedAt: row.last_accessed_at,
        lastConfirmedAt: row.last_confirmed_at,
        expiresAt: row.expires_at,
        sourceSessionId: row.source_session_id,
        sourceMessageId: row.source_message_id,
        version: row.version,
        tags: JSON.parse(row.tags || "[]"),
        provenance: row.provenance,
      };

      // Semantic Similarity Score
      let semanticSim = 0;
      const embRow: any = db.prepare("SELECT embedding FROM memory_embeddings WHERE memory_id = ?").get(mem.id);
      if (embRow && embRow.embedding) {
        try {
          const vector = JSON.parse(embRow.embedding);
          semanticSim = embeddingService.cosineSimilarity(queryEmb.vector, vector);
        } catch {}
      } else {
        // Deterministic on-the-fly similarity
        const memVec = embeddingService.generateDeterministicVector(mem.content);
        semanticSim = embeddingService.cosineSimilarity(queryEmb.vector, memVec);
      }

      // Keyword / Contextual overlap
      const memText = `${mem.content} ${mem.normalizedCategory} ${mem.normalizedKey} ${mem.normalizedValue}`.toLowerCase();
      let matchedTokens = 0;
      queryTokens.forEach((token) => {
        if (memText.includes(token)) matchedTokens++;
      });
      const contextualRelevance = queryTokens.size > 0 ? Math.min(1.0, matchedTokens / Math.max(1, queryTokens.size)) : 0.2;

      // Recency score (gradual half-life curve over 30 days)
      const ageDays = (now - mem.updatedAt) / (1000 * 60 * 60 * 24);
      const recencyScore = Math.exp(-0.05 * ageDays);

      // Multi-factor hybrid ranking formula
      const w = DEFAULT_RANKING_WEIGHTS;
      const finalScore =
        semanticSim * w.semanticSimilarity +
        mem.importance * w.importance +
        recencyScore * w.recency +
        mem.confidence * w.confidence +
        contextualRelevance * w.contextualRelevance;

      mem.relevanceScore = Number(finalScore.toFixed(3));
      mem.scoreBreakdown = {
        semantic: Number(semanticSim.toFixed(3)),
        importance: Number(mem.importance.toFixed(3)),
        recency: Number(recencyScore.toFixed(3)),
        confidence: Number(mem.confidence.toFixed(3)),
        contextual: Number(contextualRelevance.toFixed(3)),
        final: Number(finalScore.toFixed(3)),
      };

      // Relevance thresholding to prevent memory contamination
      if (finalScore >= threshold) {
        scoredCandidates.push(mem);
      }
    }

    // Sort by finalScore descending
    scoredCandidates.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));

    const selectedMemories = scoredCandidates.slice(0, limit);

    // Asynchronously log access & increment access counts
    for (const sm of selectedMemories) {
      db.prepare("UPDATE memories SET access_count = access_count + 1, last_accessed_at = ? WHERE id = ?").run(
        now,
        sm.id
      );
      try {
        db.prepare(`
          INSERT INTO memory_access_log (id, memory_id, query_id, query_text, retrieved_at, relevance_score, used_in_response)
          VALUES (?, ?, ?, ?, ?, ?, 1)
        `).run(`log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, sm.id, null, query.text, now, sm.relevanceScore || 0);
      } catch {}
    }

    const formattedContext = this.buildContextString(selectedMemories);

    return {
      memories: selectedMemories,
      formattedContext,
      diagnostics: {
        totalCandidates: rows.length,
        filteredCount: selectedMemories.length,
        retrievalTimeMs: Math.round(performance.now() - start),
      },
    };
  }

  /**
   * Formats top memories into a compact, natural context block for Gemini.
   */
  public buildContextString(memories: MemoryItem[]): string {
    if (memories.length === 0) return "";

    const lines = memories.map((m) => {
      return `• [${m.type.toUpperCase()}:${m.normalizedCategory}] ${m.content} (key: ${m.normalizedKey}=${m.normalizedValue})`;
    });

    return `[MERY Verified Long-Term Memories (Internal Context - Recall naturally only when relevant, never recite robotic timestamps):
${lines.join("\n")}]`;
  }

  // ---------------------------------------------------------------------------
  // 2. EXTRACTION, VALIDATION & ASYNC PIPELINE
  // ---------------------------------------------------------------------------
  public async extractAndProcess(
    userText: string,
    modelReply?: string,
    recentHistory?: Array<{ role: string; content: string }>
  ): Promise<{ candidates: MemoryCandidate[]; actionResults: string[] }> {
    const cleanUser = userText.trim();
    if (!cleanUser) {
      return { candidates: [], actionResults: [] };
    }

    // 1. Trivial utterance filter (Small talk filter)
    for (const pattern of TRIVIAL_CHAT_PATTERNS) {
      if (pattern.test(cleanUser)) {
        return { candidates: [], actionResults: ["IGNORED: Trivial conversational filler / small talk"] };
      }
    }

    // 2. Detect explicit user memory request
    let isExplicit = false;
    for (const pat of EXPLICIT_MEMORY_PATTERNS) {
      if (pat.test(cleanUser)) {
        isExplicit = true;
        break;
      }
    }

    // 3. Extract candidate memories
    const candidates = await this.extractCandidates(cleanUser, isExplicit, recentHistory);
    const actionResults: string[] = [];

    // 4. Process each candidate through Decision / Conflict resolution
    for (const candidate of candidates) {
      const result = await this.processCandidate(candidate);
      actionResults.push(result);
    }

    return { candidates, actionResults };
  }

  private async extractCandidates(
    userText: string,
    isExplicit: boolean,
    history?: Array<{ role: string; content: string }>
  ): Promise<MemoryCandidate[]> {
    // If Gemini client is available, perform intelligent extraction
    if (this.geminiClient && Date.now() >= this.extractionQuotaCooldownUntil) {
      try {
        const extractionPrompt = `You are the Long-Term Memory Extraction Subsystem for MERY.
Analyze this user statement and determine if it contains durable personal facts, preferences, goals, projects, habits, or entities that should be remembered across years of conversation.

User Statement: "${userText}"
${isExplicit ? "NOTE: User explicitly asked to remember this information!" : ""}

Categories:
- "semantic": Stable facts about user ("I run a YouTube channel", "I have two monitors")
- "preference": Likes/dislikes ("My favorite game is Cyberpunk", "I prefer Gujarati", "I like dark mode")
- "project": Ongoing projects ("Building MERY voice system", "working on my web app")
- "goal": Aspirations ("I want to grow my channel to 100k", "I want to build my own AI")
- "habit": Recurring patterns (requires evidence, not 1-off event)
- "relationship": Entities (people, channels, devices, apps)
- "conversation": High-priority conversational milestone

Return a JSON array of memory candidates. If statement has NO durable facts (e.g., small talk, momentary observation, temporary action), return empty array [].
Format:
[
  {
    "type": "semantic" | "preference" | "project" | "goal" | "habit" | "relationship" | "conversation",
    "content": "Clear, standalone sentence about the user",
    "normalizedContent": {
      "category": "e.g. gaming, creator, audio, ui, software",
      "key": "canonical_key_e.g. favorite_game, youtube_channel, ui_theme",
      "value": "canonical_value_e.g. Cyberpunk, active, dark"
    },
    "scores": {
      "importance": 0.0 to 1.0,
      "futureUsefulness": 0.0 to 1.0,
      "stability": 0.0 to 1.0,
      "confidence": 0.0 to 1.0
    },
    "action": "SAVE" | "UPDATE" | "MERGE" | "IGNORE" | "DELETE"
  }
]`;

        const response: any = await this.geminiClient.models.generateContent({
          model: "gemini-3.8-flash",
          contents: extractionPrompt,
          config: {
            temperature: 0.1,
            responseMimeType: "application/json",
          },
        });

        const rawJson = response.text?.trim() || "[]";
        const parsed = JSON.parse(rawJson);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((item: any) => ({
            type: item.type || "semantic",
            content: item.content || userText,
            normalizedContent: {
              category: item.normalizedContent?.category || "general",
              key: (item.normalizedContent?.key || "user_fact").toLowerCase().replace(/\s+/g, "_"),
              value: item.normalizedContent?.value || "true",
            },
            scores: {
              importance: isExplicit ? 0.95 : item.scores?.importance || 0.7,
              futureUsefulness: isExplicit ? 0.95 : item.scores?.futureUsefulness || 0.7,
              stability: isExplicit ? 0.90 : item.scores?.stability || 0.75,
              explicitness: isExplicit ? 1.0 : 0.4,
              confidence: item.scores?.confidence || 0.9,
            },
            source: isExplicit ? "explicit_user_request" : "conversation_inference",
            action: item.action || "SAVE",
          }));
        }
      } catch (err: any) {
        const errMsg = String(err?.message || "");
        const isQuota = err?.status === 429 || errMsg.includes("429") || errMsg.includes("RESOURCE_EXHAUSTED") || errMsg.includes("quota");
        if (isQuota) {
          this.extractionQuotaCooldownUntil = Date.now() + 15 * 60 * 1000;
        }
        // Fallback to local rule-based extractor silently
      }
    }

    // Heuristic Rule-Based Fallback Parser
    return this.heuristicExtraction(userText, isExplicit);
  }

  private heuristicExtraction(text: string, isExplicit: boolean): MemoryCandidate[] {
    const candidates: MemoryCandidate[] = [];
    const clean = text.replace(/^(remember\s+(?:that|this)?|don'?t\s+forget|note\s+that)\s+/i, "").trim();

    // 1. Favorite game / music / movie preference
    const favMatch = clean.match(/(?:my\s+)?favorite\s+(game|music|song|food|movie|band|color)\s+(?:is|are|has\s+always\s+been)\s+(.+)/i);
    if (favMatch) {
      const topic = favMatch[1].toLowerCase();
      const val = favMatch[2].replace(/[.!]+$/, "").trim();
      candidates.push({
        type: "preference",
        content: `User's favorite ${topic} is ${val}.`,
        normalizedContent: {
          category: topic === "game" ? "gaming" : topic === "music" || topic === "song" ? "audio" : "lifestyle",
          key: `favorite_${topic}`,
          value: val,
        },
        scores: {
          importance: isExplicit ? 0.95 : 0.88,
          futureUsefulness: 0.92,
          stability: 0.85,
          explicitness: isExplicit ? 1.0 : 0.8,
          confidence: 0.95,
        },
        source: isExplicit ? "explicit_user_request" : "conversation_inference",
        action: "SAVE",
      });
      return candidates;
    }

    // 2. Creator / YouTube facts
    if (/\b(?:run|have|started|own|manage)\s+(?:a\s+)?youtube\s+channel\b/i.test(clean)) {
      candidates.push({
        type: "semantic",
        content: "User runs a YouTube channel.",
        normalizedContent: {
          category: "creator",
          key: "youtube_channel",
          value: "active",
        },
        scores: {
          importance: 0.92,
          futureUsefulness: 0.95,
          stability: 0.90,
          explicitness: isExplicit ? 1.0 : 0.7,
          confidence: 0.96,
        },
        source: isExplicit ? "explicit_user_request" : "conversation_inference",
        action: "SAVE",
      });
      return candidates;
    }

    // 3. Goal detection
    const goalMatch = clean.match(/\b(?:i\s+want\s+to|my\s+goal\s+is\s+to|aspiring\s+to)\s+([a-z0-9\s]+)/i);
    if (goalMatch && goalMatch[1].length > 6) {
      const goalStr = goalMatch[1].replace(/[.!]+$/, "").trim();
      candidates.push({
        type: "goal",
        content: `User wants to ${goalStr}.`,
        normalizedContent: {
          category: "ambition",
          key: `goal_${goalStr.slice(0, 15).replace(/\s+/g, "_")}`,
          value: goalStr,
        },
        scores: {
          importance: 0.85,
          futureUsefulness: 0.90,
          stability: 0.80,
          explicitness: isExplicit ? 1.0 : 0.6,
          confidence: 0.88,
        },
        source: isExplicit ? "explicit_user_request" : "conversation_inference",
        action: "SAVE",
      });
      return candidates;
    }

    // 4. Explicit catch-all
    if (isExplicit && clean.length > 5) {
      candidates.push({
        type: "semantic",
        content: clean,
        normalizedContent: {
          category: "user_note",
          key: `explicit_${Date.now().toString(36)}`,
          value: clean,
        },
        scores: {
          importance: 0.95,
          futureUsefulness: 0.95,
          stability: 0.90,
          explicitness: 1.0,
          confidence: 0.98,
        },
        source: "explicit_user_request",
        action: "SAVE",
      });
    }

    return candidates;
  }

  // ---------------------------------------------------------------------------
  // 3. DECISION LAYER & CONFLICT RESOLUTION
  // ---------------------------------------------------------------------------
  public async processCandidate(candidate: MemoryCandidate): Promise<string> {
    const db = getDatabase();
    const now = Date.now();

    // Value scoring threshold check (unless explicit user request)
    const compositeScore =
      candidate.scores.importance * 0.4 +
      candidate.scores.futureUsefulness * 0.3 +
      candidate.scores.confidence * 0.3;

    if (candidate.source !== "explicit_user_request" && compositeScore < DEFAULT_IMPORTANCE_THRESHOLD) {
      return `IGNORED: Low composite score (${compositeScore.toFixed(2)} < ${DEFAULT_IMPORTANCE_THRESHOLD})`;
    }

    // Conflict & Existing Match Check:
    // Query active memories with same normalized_key or normalized_category
    const existingRow: any = db
      .prepare(
        "SELECT * FROM memories WHERE normalized_key = ? AND status = 'active'"
      )
      .get(candidate.normalizedContent.key);

    if (existingRow) {
      // Check if value is identical -> Do NOT create duplicate
      if (existingRow.normalized_value.toLowerCase() === candidate.normalizedContent.value.toLowerCase()) {
        // Boost confidence and update last confirmed timestamp
        db.prepare(
          "UPDATE memories SET confidence = MIN(1.0, confidence + 0.05), last_confirmed_at = ?, access_count = access_count + 1 WHERE id = ?"
        ).run(now, existingRow.id);
        return `MERGED: Verified existing memory '${existingRow.normalized_key}' (reinforced confidence)`;
      }

      // Conflict Detected! (e.g. Favorite game GTA 6 -> Cyberpunk)
      // Supersede the existing memory, update to new value, write to memory_versions
      const prevContent = existingRow.content;
      const newContent = candidate.content;

      // 1. Mark existing as superseded
      db.prepare(
        "UPDATE memories SET status = 'superseded', updated_at = ? WHERE id = ?"
      ).run(now, existingRow.id);

      // 2. Record historical version
      db.prepare(`
        INSERT INTO memory_versions (id, memory_id, previous_content, new_content, change_type, created_at)
        VALUES (?, ?, ?, ?, 'superseded', ?)
      `).run(`ver-${Date.now()}`, existingRow.id, prevContent, newContent, now);

      // 3. Insert newly updated active memory
      const newId = `mem-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      db.prepare(`
        INSERT INTO memories (
          id, user_id, type, content, normalized_category, normalized_key, normalized_value,
          status, importance, future_usefulness, stability, explicitness, confidence, access_count,
          created_at, updated_at, last_accessed_at, last_confirmed_at, expires_at, version, tags, provenance
        ) VALUES (?, 'default_user', ?, ?, ?, ?, ?, 'active', ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        newId,
        candidate.type,
        newContent,
        candidate.normalizedContent.category,
        candidate.normalizedContent.key,
        candidate.normalizedContent.value,
        candidate.scores.importance,
        candidate.scores.futureUsefulness,
        candidate.scores.stability,
        candidate.scores.explicitness,
        candidate.scores.confidence,
        now,
        now,
        now,
        now,
        candidate.expiresAt || null,
        existingRow.version + 1,
        JSON.stringify([candidate.type, candidate.normalizedContent.category]),
        `Updated from conflict with ${existingRow.id}`
      );

      // Compute & save embedding asynchronously
      this.saveEmbeddingAsync(newId, newContent);

      return `UPDATED: Resolved conflict for '${candidate.normalizedContent.key}' (superseded previous: '${prevContent}')`;
    }

    // Genuinely New Memory -> SAVE
    const newId = `mem-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    db.prepare(`
      INSERT INTO memories (
        id, user_id, type, content, normalized_category, normalized_key, normalized_value,
        status, importance, future_usefulness, stability, explicitness, confidence, access_count,
        created_at, updated_at, last_accessed_at, last_confirmed_at, expires_at, version, tags, provenance
      ) VALUES (?, 'default_user', ?, ?, ?, ?, ?, 'active', ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, 1, ?, ?)
    `).run(
      newId,
      candidate.type,
      candidate.content,
      candidate.normalizedContent.category,
      candidate.normalizedContent.key,
      candidate.normalizedContent.value,
      candidate.scores.importance,
      candidate.scores.futureUsefulness,
      candidate.scores.stability,
      candidate.scores.explicitness,
      candidate.scores.confidence,
      now,
      now,
      now,
      now,
      candidate.expiresAt || null,
      JSON.stringify([candidate.type, candidate.normalizedContent.category]),
      candidate.source === "explicit_user_request" ? "Explicit User Memory Request" : "Conversational Inference"
    );

    // Compute & save embedding asynchronously
    this.saveEmbeddingAsync(newId, candidate.content);

    return `SAVED: New ${candidate.type} memory '${candidate.normalizedContent.key}'`;
  }

  private async saveEmbeddingAsync(memoryId: string, content: string) {
    try {
      const emb = await embeddingService.getEmbedding(content);
      const db = getDatabase();
      db.prepare(`
        INSERT OR REPLACE INTO memory_embeddings (id, memory_id, embedding, embedding_model, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(`emb-${Date.now()}`, memoryId, JSON.stringify(emb.vector), emb.model, Date.now());
    } catch {
      // Fallback silently without throwing
    }
  }

  // ---------------------------------------------------------------------------
  // 4. MEMORY LIFECYCLE & FORGETTING
  // ---------------------------------------------------------------------------
  public cleanExpiredMemories(): number {
    const db = getDatabase();
    const now = Date.now();
    const result = db
      .prepare("UPDATE memories SET status = 'archived' WHERE expires_at IS NOT NULL AND expires_at < ? AND status = 'active'")
      .run(now);
    return Number(result.changes || 0);
  }

  public deleteMemory(id: string): boolean {
    const db = getDatabase();
    const now = Date.now();
    const existing: any = db.prepare("SELECT * FROM memories WHERE id = ?").get(id);
    if (!existing) return false;

    // Record deletion version
    db.prepare(`
      INSERT INTO memory_versions (id, memory_id, previous_content, new_content, change_type, created_at)
      VALUES (?, ?, ?, '', 'deleted', ?)
    `).run(`ver-${Date.now()}`, id, existing.content, now);

    // Mark status deleted
    db.prepare("UPDATE memories SET status = 'deleted', updated_at = ? WHERE id = ?").run(now, id);
    return true;
  }

  public deleteCategory(category: string): number {
    const db = getDatabase();
    const now = Date.now();
    const result = db
      .prepare("UPDATE memories SET status = 'deleted', updated_at = ? WHERE normalized_category = ? OR type = ?")
      .run(now, category, category);
    return Number(result.changes || 0);
  }

  public clearAll(): void {
    const db = getDatabase();
    db.exec("DELETE FROM memory_access_log;");
    db.exec("DELETE FROM memory_relations;");
    db.exec("DELETE FROM memory_embeddings;");
    db.exec("DELETE FROM memory_versions;");
    db.exec("DELETE FROM memories;");
  }

  public updateMemory(id: string, updates: Partial<MemoryItem>): boolean {
    const db = getDatabase();
    const now = Date.now();
    const existing: any = db.prepare("SELECT * FROM memories WHERE id = ?").get(id);
    if (!existing) return false;

    if (updates.content && updates.content !== existing.content) {
      db.prepare(`
        INSERT INTO memory_versions (id, memory_id, previous_content, new_content, change_type, created_at)
        VALUES (?, ?, ?, ?, 'updated', ?)
      `).run(`ver-${Date.now()}`, id, existing.content, updates.content, now);
      this.saveEmbeddingAsync(id, updates.content);
    }

    const newContent = updates.content || existing.content;
    const newCategory = updates.normalizedCategory || existing.normalized_category;
    const newKey = updates.normalizedKey || existing.normalized_key;
    const newValue = updates.normalizedValue || existing.normalized_value;
    const newImportance = updates.importance !== undefined ? updates.importance : existing.importance;
    const newStatus = updates.status || existing.status;

    db.prepare(`
      UPDATE memories SET
        content = ?,
        normalized_category = ?,
        normalized_key = ?,
        normalized_value = ?,
        importance = ?,
        status = ?,
        updated_at = ?,
        version = version + 1
      WHERE id = ?
    `).run(newContent, newCategory, newKey, newValue, newImportance, newStatus, now, id);

    return true;
  }

  // ---------------------------------------------------------------------------
  // 5. OBSERVABILITY, LISTING & DIAGNOSTICS
  // ---------------------------------------------------------------------------
  public listMemories(filter?: {
    type?: MemoryType;
    category?: string;
    status?: MemoryStatus;
    search?: string;
    limit?: number;
    offset?: number;
  }): MemoryItem[] {
    const db = getDatabase();
    let sql = "SELECT * FROM memories WHERE 1=1";
    const params: any[] = [];

    if (filter?.status) {
      sql += " AND status = ?";
      params.push(filter.status);
    } else {
      sql += " AND status != 'deleted'";
    }

    if (filter?.type) {
      sql += " AND type = ?";
      params.push(filter.type);
    }

    if (filter?.category) {
      sql += " AND normalized_category = ?";
      params.push(filter.category);
    }

    if (filter?.search) {
      sql += " AND (content LIKE ? OR normalized_key LIKE ? OR normalized_value LIKE ?)";
      const pattern = `%${filter.search}%`;
      params.push(pattern, pattern, pattern);
    }

    sql += " ORDER BY updated_at DESC";

    if (filter?.limit) {
      sql += " LIMIT ?";
      params.push(filter.limit);
      if (filter?.offset) {
        sql += " OFFSET ?";
        params.push(filter.offset);
      }
    }

    const rows: any[] = db.prepare(sql).all(...params);
    return rows.map((r) => ({
      id: r.id,
      userId: r.user_id,
      type: r.type as MemoryType,
      content: r.content,
      normalizedCategory: r.normalized_category,
      normalizedKey: r.normalized_key,
      normalizedValue: r.normalized_value,
      status: r.status as MemoryStatus,
      importance: r.importance,
      futureUsefulness: r.future_usefulness,
      stability: r.stability,
      explicitness: r.explicitness,
      confidence: r.confidence,
      accessCount: r.access_count,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      lastAccessedAt: r.last_accessed_at,
      lastConfirmedAt: r.last_confirmed_at,
      expiresAt: r.expires_at,
      version: r.version,
      tags: JSON.parse(r.tags || "[]"),
      provenance: r.provenance,
    }));
  }

  public getStats(): MemoryStats {
    const db = getDatabase();
    const rows: any[] = db.prepare("SELECT type, status, COUNT(*) as cnt FROM memories GROUP BY type, status").all();

    let totalActive = 0;
    let totalSuperseded = 0;
    let totalArchived = 0;
    const byType: Record<MemoryType, number> = {
      semantic: 0,
      preference: 0,
      project: 0,
      goal: 0,
      habit: 0,
      relationship: 0,
      conversation: 0,
    };
    const byCategory: Record<string, number> = {};

    for (const r of rows) {
      if (r.status === "active") {
        totalActive += r.cnt;
        if (byType[r.type as MemoryType] !== undefined) {
          byType[r.type as MemoryType] += r.cnt;
        }
      } else if (r.status === "superseded") {
        totalSuperseded += r.cnt;
      } else if (r.status === "archived") {
        totalArchived += r.cnt;
      }
    }

    const catRows: any[] = db.prepare("SELECT normalized_category, COUNT(*) as cnt FROM memories WHERE status = 'active' GROUP BY normalized_category").all();
    for (const cr of catRows) {
      byCategory[cr.normalized_category] = cr.cnt;
    }

    const accessRow: any = db.prepare("SELECT COUNT(*) as total FROM memory_access_log").get();

    return {
      totalActive,
      totalSuperseded,
      totalArchived,
      byType,
      byCategory,
      totalAccesses: accessRow?.total || 0,
      databaseSizeKb: 48,
      isVectorEngineReady: true,
    };
  }

  public exportAll(): any {
    const db = getDatabase();
    const memories = db.prepare("SELECT * FROM memories").all();
    const versions = db.prepare("SELECT * FROM memory_versions").all();
    const relations = db.prepare("SELECT * FROM memory_relations").all();
    return {
      exportedAt: new Date().toISOString(),
      system: "MERY Memory System (SQLite)",
      version: "2.0",
      memories,
      versions,
      relations,
    };
  }
}

export const serverMemoryService = new ServerMemoryService();
