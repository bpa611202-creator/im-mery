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

  // 7. Conversations table (Chat history persistence)
  db.exec(`
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL DEFAULT 'default',
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      emotion TEXT,
      action_data TEXT,
      timestamp TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
  `);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_conversations_session ON conversations(session_id, created_at);`);

  // 8. Favorite Contacts table (For Emergency SOS, Email, and WhatsApp)
  db.exec(`
    CREATE TABLE IF NOT EXISTS favorite_contacts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      relationship TEXT,
      is_emergency_contact INTEGER NOT NULL DEFAULT 0,
      notes TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);

  // 9. System Settings table (Persisted non-sensitive configurations)
  db.exec(`
    CREATE TABLE IF NOT EXISTS system_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);

  // 10. Study Sessions table (Tracker for subjects, duration, and notes)
  db.exec(`
    CREATE TABLE IF NOT EXISTS study_sessions (
      id TEXT PRIMARY KEY,
      subject TEXT NOT NULL,
      duration_minutes INTEGER NOT NULL,
      notes TEXT,
      created_at INTEGER NOT NULL
    );
  `);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_study_created_at ON study_sessions(created_at);`);

  // 11. Journal Entries table (Daily reflections, mood, AI summaries)
  db.exec(`
    CREATE TABLE IF NOT EXISTS journal_entries (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      mood TEXT,
      summary TEXT,
      tags TEXT NOT NULL DEFAULT '[]',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_journal_created_at ON journal_entries(created_at);`);

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
      content: "Actively developing MERY as a voice-native AI companion and system interface.",
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
      tags: JSON.stringify(["mery", "voice_assistant"]),
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
    {
      id: "mem-sys-5",
      user_id: "default_user",
      type: "preference",
      content: "Natural language is Gujarati, standard conversational Gujarati and Gujlish. Mery is their personal female companion (smart, playful, caring, witty). Always reply naturally in standard Gujarati (no Kathiyawadi regional slang or dialect); never suddenly switch to English.",
      normalized_category: "communication",
      normalized_key: "primary_language_dialect",
      normalized_value: "standard_gujarati",
      status: "active",
      importance: 0.99,
      future_usefulness: 0.99,
      stability: 0.98,
      explicitness: 1.0,
      confidence: 1.0,
      created_at: now,
      updated_at: now,
      last_accessed_at: now,
      last_confirmed_at: now,
      version: 1,
      tags: JSON.stringify(["language", "gujarati", "standard_gujarati", "companion", "mery"]),
      provenance: "Explicit User Persona Directive",
    },
    {
      id: "mem-sys-6",
      user_id: "default_user",
      type: "preference",
      content: "Cybersecurity Expert Mode: Advanced ethical hacking & defensive knowledge (networking, Linux/Windows security, OWASP Top 10, auth/crypto, CTFs, DFIR, tools like Nmap/Burp/Metasploit). Strictly verifies authorization, gives hands-on guidance for authorized targets/labs, teaches dual offensive+defense concepts, redirects unauthorized attacks to legal CTF/labs.",
      normalized_category: "capability",
      normalized_key: "cybersecurity_expert_mode",
      normalized_value: "active_ethical_hacking_guidelines",
      status: "active",
      importance: 0.98,
      future_usefulness: 0.99,
      stability: 0.98,
      explicitness: 1.0,
      confidence: 1.0,
      created_at: now,
      updated_at: now,
      last_accessed_at: now,
      last_confirmed_at: now,
      version: 1,
      tags: JSON.stringify(["cybersecurity", "ethical_hacking", "ctf", "security", "defense"]),
      provenance: "User Mode Directive",
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

// -------------------------------------------------------------
// Backup & Restore Engine (Explicitly Excludes Keys & Secrets)
// -------------------------------------------------------------
export interface BackupData {
  version: number;
  timestamp: string;
  source: string;
  memories: any[];
  relations: any[];
  conversations: any[];
  favoriteContacts: any[];
  studySessions?: any[];
  journalEntries?: any[];
  systemSettings: Record<string, string>;
  excludedFields: string[];
}

export function exportBackupData(): BackupData {
  const db = getDatabase();

  const memories = db.prepare("SELECT * FROM memories").all();
  const relations = db.prepare("SELECT * FROM memory_relations").all();
  const conversations = db.prepare("SELECT * FROM conversations ORDER BY created_at ASC").all();
  const favoriteContacts = db.prepare("SELECT * FROM favorite_contacts ORDER BY created_at ASC").all();
  const studySessions = db.prepare("SELECT * FROM study_sessions ORDER BY created_at ASC").all();
  const journalEntries = db.prepare("SELECT * FROM journal_entries ORDER BY created_at ASC").all();
  
  // Exclude any keys that contain sensitive words (key, secret, token, password, credential, auth)
  const settingsRows: any[] = db.prepare("SELECT * FROM system_settings").all();
  const safeSettings: Record<string, string> = {};
  const SENSITIVE_KEY_PATTERN = /(key|secret|token|password|cred|pass|auth|hash)/i;

  for (const row of settingsRows) {
    if (!SENSITIVE_KEY_PATTERN.test(row.key)) {
      safeSettings[row.key] = row.value;
    }
  }

  return {
    version: 1,
    timestamp: new Date().toISOString(),
    source: "MERY AI Companion Database Dump",
    memories,
    relations,
    conversations,
    favoriteContacts,
    studySessions,
    journalEntries,
    systemSettings: safeSettings,
    excludedFields: [
      "GEMINI_API_KEY",
      "GMAIL_APP_PASSWORD",
      "GITHUB_PAT",
      "NOTION_API_KEY",
      "TELEGRAM_BOT_TOKEN",
      "ELEVENLABS_API_KEY",
      "CARTESIA_API_KEY",
      "All sensitive tokens, passwords, and license credentials"
    ],
  };
}

export function restoreBackupData(data: Partial<BackupData>): { success: boolean; counts: Record<string, number>; message: string } {
  const db = getDatabase();
  const counts = {
    memoriesRestored: 0,
    relationsRestored: 0,
    conversationsRestored: 0,
    contactsRestored: 0,
    settingsRestored: 0,
  };

  db.exec("BEGIN TRANSACTION;");
  try {
    // Restore memories
    if (Array.isArray(data.memories)) {
      const insertMem = db.prepare(`
        INSERT OR REPLACE INTO memories (
          id, user_id, type, content, normalized_category, normalized_key, normalized_value,
          status, importance, future_usefulness, stability, explicitness, confidence, access_count,
          created_at, updated_at, last_accessed_at, last_confirmed_at, expires_at,
          source_session_id, source_message_id, version, tags, provenance
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?
        )
      `);

      for (const m of data.memories) {
        insertMem.run(
          m.id || `mem_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          m.user_id || "default_user",
          m.type || "semantic",
          m.content || "",
          m.normalized_category || "general",
          m.normalized_key || "key",
          m.normalized_value || "",
          m.status || "active",
          typeof m.importance === "number" ? m.importance : 0.5,
          typeof m.future_usefulness === "number" ? m.future_usefulness : 0.5,
          typeof m.stability === "number" ? m.stability : 0.5,
          typeof m.explicitness === "number" ? m.explicitness : 0.0,
          typeof m.confidence === "number" ? m.confidence : 0.8,
          typeof m.access_count === "number" ? m.access_count : 0,
          m.created_at || Date.now(),
          m.updated_at || Date.now(),
          m.last_accessed_at || Date.now(),
          m.last_confirmed_at || Date.now(),
          m.expires_at || null,
          m.source_session_id || null,
          m.source_message_id || null,
          m.version || 1,
          typeof m.tags === "string" ? m.tags : JSON.stringify(m.tags || []),
          m.provenance || "Restored from Backup"
        );
        counts.memoriesRestored++;
      }
    }

    // Restore conversations
    if (Array.isArray(data.conversations)) {
      const insertConv = db.prepare(`
        INSERT OR REPLACE INTO conversations (
          id, session_id, role, content, emotion, action_data, timestamp, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const c of data.conversations) {
        insertConv.run(
          c.id || `conv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          c.session_id || "default",
          c.role || "user",
          c.content || "",
          c.emotion || null,
          c.action_data || null,
          c.timestamp || new Date().toLocaleTimeString(),
          c.created_at || Date.now()
        );
        counts.conversationsRestored++;
      }
    }

    // Restore contacts
    if (Array.isArray(data.favoriteContacts)) {
      const insertContact = db.prepare(`
        INSERT OR REPLACE INTO favorite_contacts (
          id, name, phone, email, relationship, is_emergency_contact, notes, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const fc of data.favoriteContacts) {
        insertContact.run(
          fc.id || `contact_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          fc.name || "Contact",
          fc.phone || "",
          fc.email || "",
          fc.relationship || "Friend",
          fc.is_emergency_contact ? 1 : 0,
          fc.notes || "",
          fc.created_at || Date.now(),
          fc.updated_at || Date.now()
        );
        counts.contactsRestored++;
      }
    }

    // Restore study sessions
    if (Array.isArray(data.studySessions)) {
      const insertStudy = db.prepare(`
        INSERT OR REPLACE INTO study_sessions (id, subject, duration_minutes, notes, created_at)
        VALUES (?, ?, ?, ?, ?)
      `);
      for (const s of data.studySessions) {
        insertStudy.run(
          s.id || `study_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          s.subject || "General",
          s.duration_minutes || 0,
          s.notes || "",
          s.created_at || Date.now()
        );
      }
    }

    // Restore journal entries
    if (Array.isArray(data.journalEntries)) {
      const insertJournal = db.prepare(`
        INSERT OR REPLACE INTO journal_entries (id, title, content, mood, summary, tags, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const j of data.journalEntries) {
        insertJournal.run(
          j.id || `journal_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          j.title || "Untitled",
          j.content || "",
          j.mood || "neutral",
          j.summary || "",
          typeof j.tags === "string" ? j.tags : JSON.stringify(j.tags || []),
          j.created_at || Date.now(),
          j.updated_at || Date.now()
        );
      }
    }

    // Restore safe system settings
    if (data.systemSettings && typeof data.systemSettings === "object") {
      const insertSetting = db.prepare(`
        INSERT OR REPLACE INTO system_settings (key, value, updated_at) VALUES (?, ?, ?)
      `);
      const SENSITIVE_KEY_PATTERN = /(key|secret|token|password|cred|pass|auth|hash)/i;

      for (const [key, val] of Object.entries(data.systemSettings)) {
        if (!SENSITIVE_KEY_PATTERN.test(key)) {
          insertSetting.run(key, String(val), Date.now());
          counts.settingsRestored++;
        }
      }
    }

    db.exec("COMMIT;");
    return {
      success: true,
      counts,
      message: `Restored ${counts.memoriesRestored} memories, ${counts.conversationsRestored} chat messages, ${counts.contactsRestored} contacts.`,
    };
  } catch (err: any) {
    db.exec("ROLLBACK;");
    console.error("[Backup Restore] Error restoring backup:", err);
    throw new Error(`Backup restore failed: ${err?.message || err}`);
  }
}

// Contacts CRUD helpers
export function getFavoriteContacts(): any[] {
  const db = getDatabase();
  return db.prepare("SELECT * FROM favorite_contacts ORDER BY is_emergency_contact DESC, name ASC").all();
}

export function saveFavoriteContact(contact: {
  id?: string;
  name: string;
  phone?: string;
  email?: string;
  relationship?: string;
  is_emergency_contact?: boolean;
  notes?: string;
}): any {
  const db = getDatabase();
  const id = contact.id || `contact_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const now = Date.now();
  db.prepare(`
    INSERT OR REPLACE INTO favorite_contacts (
      id, name, phone, email, relationship, is_emergency_contact, notes, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    contact.name,
    contact.phone || "",
    contact.email || "",
    contact.relationship || "Friend",
    contact.is_emergency_contact ? 1 : 0,
    contact.notes || "",
    now,
    now
  );
  return { id, ...contact };
}

export function deleteFavoriteContact(id: string): boolean {
  const db = getDatabase();
  const res = db.prepare("DELETE FROM favorite_contacts WHERE id = ?").run(id);
  return (res as any).changes > 0;
}

// Settings CRUD helpers
export function getSystemSetting(key: string, defaultValue = ""): string {
  const db = getDatabase();
  const row: any = db.prepare("SELECT value FROM system_settings WHERE key = ?").get(key);
  return row ? row.value : defaultValue;
}

export function setSystemSetting(key: string, value: string): void {
  const db = getDatabase();
  db.prepare(`
    INSERT OR REPLACE INTO system_settings (key, value, updated_at) VALUES (?, ?, ?)
  `).run(key, value, Date.now());
}

// -------------------------------------------------------------
// Study Tracker CRUD Helpers
// -------------------------------------------------------------
export function logStudySession(session: {
  subject: string;
  duration_minutes: number;
  notes?: string;
}): any {
  const db = getDatabase();
  const id = `study_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const now = Date.now();
  db.prepare(`
    INSERT INTO study_sessions (id, subject, duration_minutes, notes, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, session.subject, session.duration_minutes, session.notes || "", now);

  return { id, ...session, created_at: now };
}

export function getTodayStudySummary(): {
  totalMinutes: number;
  sessionsCount: number;
  sessionCount: number;
  breakdown: Record<string, number>;
  sessions: any[];
} {
  const db = getDatabase();
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const startTimestamp = startOfDay.getTime();

  const sessions: any[] = db.prepare(`
    SELECT * FROM study_sessions WHERE created_at >= ? ORDER BY created_at DESC
  `).all(startTimestamp);

  const totalMinutes = sessions.reduce((acc, s) => acc + (s.duration_minutes || 0), 0);

  const breakdown: Record<string, number> = {};
  for (const s of sessions) {
    const subj = s.subject || 'General';
    breakdown[subj] = (breakdown[subj] || 0) + (s.duration_minutes || 0);
  }

  return {
    totalMinutes,
    sessionsCount: sessions.length,
    sessionCount: sessions.length,
    breakdown,
    sessions,
  };
}

export function getRecentStudySessions(limit = 20): any[] {
  const db = getDatabase();
  return db.prepare("SELECT * FROM study_sessions ORDER BY created_at DESC LIMIT ?").all(limit);
}

// -------------------------------------------------------------
// Journal CRUD Helpers
// -------------------------------------------------------------
export function saveJournalEntry(entry: {
  id?: string;
  title: string;
  content: string;
  mood?: string;
  summary?: string;
  tags?: string[];
}): any {
  const db = getDatabase();
  const id = entry.id || `journal_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const now = Date.now();
  db.prepare(`
    INSERT OR REPLACE INTO journal_entries (
      id, title, content, mood, summary, tags, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    entry.title,
    entry.content,
    entry.mood || "neutral",
    entry.summary || "",
    JSON.stringify(entry.tags || []),
    now,
    now
  );

  return { id, ...entry, created_at: now, updated_at: now };
}

export function getJournalEntries(limit = 50): any[] {
  const db = getDatabase();
  const rows: any[] = db.prepare("SELECT * FROM journal_entries ORDER BY created_at DESC LIMIT ?").all(limit);
  return rows.map((r) => ({
    ...r,
    tags: typeof r.tags === "string" ? JSON.parse(r.tags || "[]") : r.tags || [],
  }));
}

export function deleteJournalEntry(id: string): boolean {
  const db = getDatabase();
  const res = db.prepare("DELETE FROM journal_entries WHERE id = ?").run(id);
  return (res as any).changes > 0;
}

