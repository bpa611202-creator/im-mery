import path from "path";
import fs from "fs";
import { DatabaseSync } from "node:sqlite";

const DATA_DIR = path.join(process.cwd(), "data");
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, "mery_memory.db");

let dbInstance: DatabaseSync | null = null;

export function getDatabase(): DatabaseSync {
  if (dbInstance) {
    return dbInstance;
  }

  dbInstance = new DatabaseSync(DB_PATH);

  // Configure SQLite performance and integrity
  dbInstance.exec("PRAGMA journal_mode = WAL;");
  dbInstance.exec("PRAGMA synchronous = NORMAL;");
  dbInstance.exec("PRAGMA foreign_keys = ON;");

  initializeSchema(dbInstance);
  return dbInstance;
}

function initializeSchema(db: DatabaseSync) {
  // 1. Core Memories table
  db.exec(`
    CREATE TABLE IF NOT EXISTS memories (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL DEFAULT 'default_user',
      type TEXT NOT NULL,
      content TEXT NOT NULL,
      normalized_category TEXT NOT NULL,
      normalized_key TEXT NOT NULL,
      normalized_value TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      importance REAL NOT NULL DEFAULT 0.5,
      future_usefulness REAL NOT NULL DEFAULT 0.5,
      stability REAL NOT NULL DEFAULT 0.5,
      explicitness REAL NOT NULL DEFAULT 0.0,
      confidence REAL NOT NULL DEFAULT 0.8,
      access_count INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      last_accessed_at INTEGER NOT NULL,
      last_confirmed_at INTEGER NOT NULL,
      expires_at INTEGER,
      source_session_id TEXT,
      source_message_id TEXT,
      version INTEGER NOT NULL DEFAULT 1,
      tags TEXT NOT NULL DEFAULT '[]',
      provenance TEXT
    );
  `);

  // Indexes for high-speed retrieval and conflict checks
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_memories_status_type ON memories(status, type);
    CREATE INDEX IF NOT EXISTS idx_memories_norm_key ON memories(normalized_key);
    CREATE INDEX IF NOT EXISTS idx_memories_importance ON memories(importance);
    CREATE INDEX IF NOT EXISTS idx_memories_updated_at ON memories(updated_at);
    CREATE INDEX IF NOT EXISTS idx_memories_expires_at ON memories(expires_at);
  `);

  // 2. Memory Embeddings table for Vector Indexing
  db.exec(`
    CREATE TABLE IF NOT EXISTS memory_embeddings (
      id TEXT PRIMARY KEY,
      memory_id TEXT NOT NULL,
      embedding TEXT NOT NULL, -- JSON array of floats
      embedding_model TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (memory_id) REFERENCES memories(id) ON DELETE CASCADE
    );
  `);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_embeddings_memory_id ON memory_embeddings(memory_id);`);

  // 3. Memory Relations table (Graph / Entity linking)
  db.exec(`
    CREATE TABLE IF NOT EXISTS memory_relations (
      id TEXT PRIMARY KEY,
      source_memory_id TEXT NOT NULL,
      target_memory_id TEXT NOT NULL,
      relation_type TEXT NOT NULL,
      confidence REAL NOT NULL DEFAULT 0.8,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (source_memory_id) REFERENCES memories(id) ON DELETE CASCADE,
      FOREIGN KEY (target_memory_id) REFERENCES memories(id) ON DELETE CASCADE
    );
  `);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_relations_source ON memory_relations(source_memory_id);`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_relations_target ON memory_relations(target_memory_id);`);

  // 4. Memory Access Log (Observability & Access Tracking)
  db.exec(`
    CREATE TABLE IF NOT EXISTS memory_access_log (
      id TEXT PRIMARY KEY,
      memory_id TEXT NOT NULL,
      query_id TEXT,
      query_text TEXT,
      retrieved_at INTEGER NOT NULL,
      relevance_score REAL NOT NULL,
      used_in_response INTEGER NOT NULL DEFAULT 1,
      FOREIGN KEY (memory_id) REFERENCES memories(id) ON DELETE CASCADE
    );
  `);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_access_log_memory_id ON memory_access_log(memory_id);`);

  // 5. Memory Versions table (Audit & Change Tracking)
  db.exec(`
    CREATE TABLE IF NOT EXISTS memory_versions (
      id TEXT PRIMARY KEY,
      memory_id TEXT NOT NULL,
      previous_content TEXT NOT NULL,
      new_content TEXT NOT NULL,
      change_type TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (memory_id) REFERENCES memories(id) ON DELETE CASCADE
    );
  `);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_versions_memory_id ON memory_versions(memory_id);`);

  // 6. Session Summaries table
  db.exec(`
    CREATE TABLE IF NOT EXISTS session_summaries (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      topics TEXT NOT NULL, -- JSON array
      decisions TEXT NOT NULL, -- JSON array
      facts TEXT NOT NULL, -- JSON array
      unfinished_tasks TEXT NOT NULL, -- JSON array
      preferences_discovered TEXT NOT NULL, -- JSON array
      emotional_context TEXT,
      created_at INTEGER NOT NULL
    );
  `);

  // Seed default baseline memories if database is completely empty
  const countStmt = db.prepare("SELECT COUNT(*) as count FROM memories");
  const row: any = countStmt.get();
  if (row && row.count === 0) {
    seedInitialMemories(db);
  }
}

function seedInitialMemories(db: DatabaseSync) {
  const now = Date.now();
  const initialMemories = [
    {
      id: "mem-sys-1",
      user_id: "default_user",
      type: "semantic",
      content: "User runs a creator YouTube channel and develops voice-native AI systems.",
      normalized_category: "creator",
      normalized_key: "creator_channel",
      normalized_value: "active_youtube",
      status: "active",
      importance: 0.92,
      future_usefulness: 0.95,
      stability: 0.90,
      explicitness: 0.85,
      confidence: 0.95,
      created_at: now,
      updated_at: now,
      last_accessed_at: now,
      last_confirmed_at: now,
      version: 1,
      tags: JSON.stringify(["creator", "youtube", "development"]),
      provenance: "System Bootstrap / Initial Fact",
    },
    {
      id: "mem-sys-2",
      user_id: "default_user",
      type: "project",
      content: "Actively developing MERY as a voice-native AI companion and system interface for M4.",
      normalized_category: "development",
      normalized_key: "primary_project",
      normalized_value: "mery_ai_companion",
      status: "active",
      importance: 0.98,
      future_usefulness: 0.98,
      stability: 0.92,
      explicitness: 1.0,
      confidence: 0.98,
      created_at: now,
      updated_at: now,
      last_accessed_at: now,
      last_confirmed_at: now,
      version: 1,
      tags: JSON.stringify(["mery", "m4", "voice_assistant"]),
      provenance: "System Bootstrap / Project Core",
    },
    {
      id: "mem-sys-3",
      user_id: "default_user",
      type: "preference",
      content: "Prefers deep, elegant dark mode UI and ambient acoustic rain when deep-focus coding.",
      normalized_category: "ui_ambiance",
      normalized_key: "ui_theme_preference",
      normalized_value: "dark_mode_ambient_rain",
      status: "active",
      importance: 0.85,
      future_usefulness: 0.90,
      stability: 0.88,
      explicitness: 0.90,
      confidence: 0.92,
      created_at: now,
      updated_at: now,
      last_accessed_at: now,
      last_confirmed_at: now,
      version: 1,
      tags: JSON.stringify(["preference", "dark_mode", "focus"]),
      provenance: "User Configuration / System Setting",
    },
    {
      id: "mem-sys-4",
      user_id: "default_user",
      type: "goal",
      content: "Wants to build the premier voice-first autonomous AI companion with genuine emotional intelligence.",
      normalized_category: "vision",
      normalized_key: "long_term_ai_vision",
      normalized_value: "autonomous_voice_companion",
      status: "active",
      importance: 0.95,
      future_usefulness: 0.96,
      stability: 0.95,
      explicitness: 0.95,
      confidence: 0.96,
      created_at: now,
      updated_at: now,
      last_accessed_at: now,
      last_confirmed_at: now,
      version: 1,
      tags: JSON.stringify(["vision", "ai", "mery", "long_term"]),
      provenance: "Initial Strategic Goal",
    },
  ];

  const insertStmt = db.prepare(`
    INSERT INTO memories (
      id, user_id, type, content, normalized_category, normalized_key, normalized_value,
      status, importance, future_usefulness, stability, explicitness, confidence, access_count,
      created_at, updated_at, last_accessed_at, last_confirmed_at, expires_at,
      source_session_id, source_message_id, version, tags, provenance
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?, 0,
      ?, ?, ?, ?, NULL,
      NULL, NULL, ?, ?, ?
    )
  `);

  for (const m of initialMemories) {
    insertStmt.run(
      m.id,
      m.user_id,
      m.type,
      m.content,
      m.normalized_category,
      m.normalized_key,
      m.normalized_value,
      m.status,
      m.importance,
      m.future_usefulness,
      m.stability,
      m.explicitness,
      m.confidence,
      m.created_at,
      m.updated_at,
      m.last_accessed_at,
      m.last_confirmed_at,
      m.version,
      m.tags,
      m.provenance
    );
  }
}
