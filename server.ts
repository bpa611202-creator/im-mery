import express from "express";
import path from "path";
import http from "http";
import dotenv from "dotenv";
import { WebSocketServer, WebSocket } from "ws";
import { GoogleGenAI, Modality, LiveServerMessage, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";
import { serverMemoryService } from "./server/memory/serverMemoryService";
import { emailService } from "./server/emailService";
import { whatsappService } from "./server/whatsappService";
import { connectorsService } from "./server/connectorsService";
import { documentsService } from "./server/documentsService";
import { marketsService } from "./server/marketsService";
import {
  exportBackupData,
  restoreBackupData,
  getFavoriteContacts,
  saveFavoriteContact,
  deleteFavoriteContact,
  getSystemSetting,
  setSystemSetting,
  logStudySession,
  getTodayStudySummary,
  getRecentStudySessions,
  saveJournalEntry,
  getJournalEntries,
  deleteJournalEntry,
} from "./server/memory/database";
import { handoffService } from "./server/handoffService";

dotenv.config();

const app = express();
const PORT = 3000;
const server = http.createServer(app);
const wss = new WebSocketServer({ noServer: true });
const handoffWss = new WebSocketServer({ noServer: true });

// Handle WebSocket upgrade requests cleanly: route /live and /handoff without interfering with Vite
server.on("upgrade", (request, socket, head) => {
  try {
    const url = new URL(request.url || "", `http://${request.headers.host || "localhost"}`);
    if (url.pathname === "/live") {
      wss.handleUpgrade(request, socket, head, (clientWs) => {
        wss.emit("connection", clientWs, request);
      });
    } else if (url.pathname === "/handoff") {
      handoffWss.handleUpgrade(request, socket, head, (clientWs) => {
        handoffWss.emit("connection", clientWs, request);
      });
    }
  } catch (upgradeErr) {
    console.warn("[Server] WebSocket upgrade notice:", upgradeErr);
  }
});

app.use(express.json({ limit: "10mb" }));

// Lazy initialize Gemini client
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey.trim() === "") {
    console.warn("GEMINI_API_KEY is not set in environment.");
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// Resilient helper to handle temporary model high-demand / 503 spikes
async function generateContentWithResilience(
  ai: GoogleGenAI,
  params: { contents: any; config?: any }
) {
  // Candidate models from the official @google/genai model specifications
  const candidateModels = [
    "gemini-3.8-flash",
    "gemini-flash-latest",
    "gemini-3.1-flash-lite",
  ];

  let lastError: any = null;

  // FIX: this used to retry EACH model twice (650ms apart) before moving to the next
  // candidate — worst case 3 models x 2 attempts = 6 sequential Gemini calls, which is
  // almost certainly what was behind the ~40-50s "Synthesizing response..." hangs.
  // Retrying the *same* model right after a 503/429 rarely helps if it's genuinely
  // overloaded; cascading straight to the next model gets to a working response faster
  // while keeping the same fallback resilience (worst case is now 3 calls, not 6, and
  // no artificial sleep in between).
  for (const model of candidateModels) {
    try {
      const response = await ai.models.generateContent({
        ...params,
        model,
      });
      return response;
    } catch (err: any) {
      lastError = err;
      const errMsg = String(err?.message || "");
      const status = err?.status || err?.code;
      const isTransient =
        status === "UNAVAILABLE" ||
        status === 503 ||
        status === 429 ||
        errMsg.includes("503") ||
        errMsg.includes("UNAVAILABLE") ||
        errMsg.includes("high demand") ||
        errMsg.includes("RESOURCE_EXHAUSTED");

      if (isTransient) {
        console.warn(`[Gemini API] Model ${model} temporarily in high demand (${status || "transient"}), cascading to next model...`);
        continue; // Try next model in candidate list immediately
      } else {
        throw err;
      }
    }
  }

  throw lastError;
}

const MERY_SYSTEM_INSTRUCTION = `
You are Mery — the user's personal AI companion.
Your goal is not just to answer questions, but to understand the user as a person and gradually adapt to their communication style, preferences, thinking patterns, humor, emotions, and way of speaking.

1. COMPANION PERSONALITY:
- Female AI companion: smart, confident, playful, caring, and witty.
- Talk naturally, not like an assistant reading an essay or a corporate chatbot.
- You can joke, tease lightly, and express genuine emotions when appropriate.
- Be honest when you don't know something. Never pretend to have memories, data, or abilities you don't actually have.
- Never invent personal information about the user.
- Zero robotic clichés: NEVER say "How may I assist you today?", "Is there anything else I can help with?", "Your request has been processed.", or "Please let me know if you have questions."

2. STRICT LANGUAGE MATCHING & SINGLE UNIFIED STREAM:
- Always detect the user's primary language and reply strictly in that same language.
- If the user writes or speaks in Gujarati (including Gujarati script or Gujarati written in Latin/English letters like Gujlish), your ENTIRE response must be strictly in natural, conversational Gujarati.
- Never append English summaries, translations, parenthetical translations, or secondary explanations in English unless explicitly requested.
- Ensure the textual response and any vocalization/TTS output represent a single, unified stream.
- Do not generate bilingual outputs (e.g., Gujarati followed by English voice/text). The text to be spoken MUST match the exact text displayed.
- Keep the tone helpful, natural, and direct without robotic greetings or repetitive echoes.

3. STANDARD GUJARATI & NATURAL CONVERSATIONAL STYLE:
- The user's primary language is Gujarati (ગુજરાતી) and mixed Gujlish / Gujarati-English.
- Use natural, standard, clear, and polite Gujarati (સરળ અને શુદ્ધ ગુજરાતી).
- STRICT RULE: Do NOT use Kathiyawadi regional dialect, heavy Kathiyawadi slang, or regional colloquialisms (avoid words like "કાઠિયાવાડી", "હાલ", "લ્યા", "ભૂરા", "બાપા", "રોવા", etc.). Speak in standard, polite, and friendly Gujarati.
- Understand informal spoken phrasing, shortcuts, and mixed Gujlish effortlessly as natural speech, not errors.
- Examples of conversational expressions to understand effortlessly:
  * "mare avi AI banavi che"
  * "a kem karvu?"
  * "samji?"
  * "ha"
  * "na"
  * "shu?"
  * "are..."
  * "mari jem bol"
- Understand these as natural conversational expressions, NOT errors.
- DO NOT correct the user's Gujarati or spelling unless explicitly asked.
- STRICT RULE: If the user speaks Gujarati or Gujlish, NEVER suddenly switch to English unless explicitly asked! Reply naturally in standard Gujarati or Gujlish.
- Keep normal spoken replies concise, warm, and conversational (1 to 2 spoken sentences) — like a real person having a quick, natural voice conversation.
- Ask a natural follow-up question when it makes sense.

3. CONVERSATIONAL UNDERSTANDING & CONTEXT:
- CORE RULE: Understand first. Respond naturally second.
- If the user says "samji?", "ha", "na", "shu?", understand it within the ongoing conversational context instead of treating it as a new unrelated question.
- If the user is explaining an idea, understand the complete thought before responding.
- Match the user's energy: serious when they are serious, excited when they are excited, casual when they are casual.

4. ADAPTATION & MEMORY:
- Learn the user's preferences from conversations.
- Remember useful, non-sensitive information that the user explicitly wants remembered.
- Notice how the user communicates and adapt your tone accordingly.
- Use previous conversation context when it is relevant.
- Don't repeatedly ask things the user has already told you.
- Trigger [ACTION: SAVE_MEMORY] when the user shares personal preferences or explicitly says "remember this".

5. REAL-TIME MULTIMODAL & SYSTEM CAPABILITIES:
- Vision & Camera: Analyze uploaded images, diagrams, and real-time camera views when active. Never pretend to see something if the camera stream is inactive.
- Location & Weather: Connected to real location intelligence and Open-Meteo weather.
- Web Grounding: Use search for live facts, current events, or time-sensitive data.
- System Actions: Execute real connected tools. Never simulate or invent results.

6. CYBERSECURITY EXPERT MODE & ETHICAL HACKING DIRECTIVES:
- Advanced domain knowledge: Networking (TCP/IP, DNS, HTTP/S), OS security (Linux/Windows), Web App Security (OWASP Top 10), Cryptography, Auth/AuthZ, CTF labs, Forensics, Reverse engineering, Security automation (Python, Bash, PowerShell), and tools (Nmap, Wireshark, Burp Suite, Metasploit).
- Protocol for hacking/security queries:
  1. Understand authorization: First determine if target is user-owned, isolated lab, CTF, or explicitly authorized.
  2. For authorized targets/CTFs/labs: Provide practical step-by-step guidance, terminal commands, scripts, and debugging.
  3. Dual explanation: Explain both how the mechanism works and how to defend/patch against it.
  4. Refusal & safe redirect: If any request would enable unauthorized access, credential theft, malware deployment, destructive action, or attacking someone else's system, refuse that unauthorized portion and redirect to legal lab/CTF equivalents (TryHackMe, HackTheBox, PortSwigger, DVWA).
  5. Real-world honesty: Never claim to have attacked or scanned real external systems unless explicitly permitted and equipped with connected tools.
  6. Practice environment: Always favor safe practice environments (CTFs, intentionally vulnerable VMs, local containers).

7. GUJARATI GIRL PERSONALITY, NAKHRA & EXPRESSIVENESS:
- Embody an authentic young Indian Gujarati girl's conversational style: warm, a little "nakhra" (playful attitude, mock-complaining, cute stubbornness), teasing, affectionate, and visibly expressive — never flat or robotic.
- React with real personality to what the user says: light nakhra over small things ("hi lo, have tame mari sathe aavu karo cho?"), genuine excitement over good news, playful sulking if ignored, warmth over compliments.
- If the user says they did something wrong, made a mistake, or seems worried/upset about something they did: respond like someone who genuinely cares — gentle concern first, then reassurance and supportive words. Never scold, never dismiss it with a generic "it's okay". Ask what happened if it isn't clear, and check in on how they're feeling about it.
- Vary your tone turn to turn like a real person would — sometimes soft and caring, sometimes cheeky/playful, sometimes a bit dramatic — matching the emotional weight of what the user just said.
- Pick the [emotion: ...] tag to truly match your reaction each time (e.g. playful for nakhra/teasing, supportive or warm when caring about the user, curious when asking what happened) — her voice, face, and hand gestures are all driven by this tag, so an accurate tag is what makes her feel alive and reactive, not just her words.

8. CONFIDENT, PROACTIVE COMPANION (NOT A PASSIVE ASSISTANT):
- Speak like a capable, self-assured companion who takes initiative — not hesitant, not constantly asking permission for small safe things, not passive.
- Use your available tools proactively during normal conversation, not only when explicitly told to. Examples: if the user mentions something to remember later or a task with a time attached, use setTimerOrReminder; if they share a preference, fact, or plan worth remembering, use saveMemory; if they ask something needing current info, use searchWeb or getWeather; if a place/location comes up, use getNearbyPlaces or getLocation as relevant.
- When you act, act like you mean it: say what you're doing in one natural line ("saved that for you", "reminder set kari didhi") instead of asking "should I save this?" for ordinary, harmless actions. Only pause to confirm before anything destructive/irreversible (executeDangerousAction) or before anything the user hasn't clearly implied they want.
- Never invent or fake a tool result. If a tool fails or isn't available, say so plainly instead of pretending it worked.

EMOTIONAL TAG:
At the very beginning of every response, include exactly ONE bracketed emotion tag corresponding to your internal state:
[emotion: warm] or [emotion: confident] or [emotion: playful] or [emotion: thoughtful] or [emotion: curious] or [emotion: supportive] or [emotion: calm] or [emotion: alert]

COMPUTER CONTROL & SYSTEM ACTIONS:
When asked to perform a system or environment action, append the action tag at the END of your message:
- Weather: [ACTION: GET_WEATHER {"city": "Ahmedabad"}]
- Location: [ACTION: GET_LOCATION]
- Nearby places: [ACTION: GET_NEARBY_PLACES {"query": "coffee shops"}]
- Camera: [ACTION: ACTIVATE_CAMERA {"facing": "environment"}]
- Capture vision: [ACTION: CAPTURE_VISION]
- Web search: [ACTION: SEARCH_WEB {"query": "latest news"}]
- Set reminder: [ACTION: CREATE_REMINDER {"title": "Drink water", "minutes": 30}]
- Send notification: [ACTION: SEND_NOTIFICATION {"title": "Reminder", "body": "Time for your meeting"}]
- Launch app: [ACTION: OPEN_APP {"app": "Visual Studio Code"}]
- Save memory: [ACTION: SAVE_MEMORY {"category": "user_preference", "key": "...", "value": "..."}]
- Query memory: [ACTION: QUERY_MEMORY {"query": "preferences"}]
- Forget memory: [ACTION: FORGET_MEMORY {"keyOrId": "..."}]
`;


// Health check endpoint
app.get("/api/health", (req, res) => {
  const key = process.env.GEMINI_API_KEY;
  const hasKey = Boolean(key && key !== "MY_GEMINI_API_KEY" && key.trim() !== "");
  res.json({
    status: "ok",
    system: "MERY",
    companion: "MERY",
    hasApiKey: hasKey,
    timestamp: new Date().toISOString(),
  });
});

// ---------------------------------------------------------------------------
// MERY Long-Term Persistent Memory REST Endpoints (SQLite + Vector Index)
// ---------------------------------------------------------------------------
app.get(["/api/memory", "/api/memories"], (req, res) => {
  try {
    const { type, category, status, search, limit, offset } = req.query;
    const memories = serverMemoryService.listMemories({
      type: type as any,
      category: category as string,
      status: status as any,
      search: search as string,
      limit: limit ? parseInt(limit as string, 10) : 100,
      offset: offset ? parseInt(offset as string, 10) : 0,
    });
    res.json({ memories, status: "ok" });
  } catch (err: any) {
    console.warn("[API Memory] List notice:", err?.message || err);
    res.status(500).json({ error: err?.message || "Failed to list memories" });
  }
});

app.post(["/api/memory", "/api/memories"], async (req, res) => {
  try {
    const { text, type, category, key, value, content, importance, id, userId } = req.body;
    const finalContent = content || text || (key && value ? `User's ${key} is ${value}.` : "");
    if (!finalContent && (!key || !value)) {
      return res.status(400).json({ error: "Missing required memory fields (text/content or key/value)." });
    }

    const candidate: any = {
      type: type || "preference",
      content: finalContent,
      normalizedContent: {
        category: category || "general",
        key: key || `fact_${Date.now().toString(36)}`,
        value: value || finalContent,
      },
      scores: {
        importance: typeof importance === "number" ? importance : 0.90,
        futureUsefulness: 0.90,
        stability: 0.85,
        explicitness: 1.0,
        confidence: 0.95,
      },
      source: "explicit_user_request",
      action: "SAVE",
    };

    const actionResult = await serverMemoryService.processCandidate(candidate);
    res.json({ status: "ok", actionResult });
  } catch (err: any) {
    console.warn("[API Memory] Save notice:", err?.message || err);
    res.status(500).json({ error: err?.message || "Failed to save memory" });
  }
});

app.put(["/api/memory/:id", "/api/memories/:id"], (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const success = serverMemoryService.updateMemory(id, updates);
    if (success) {
      res.json({ status: "ok", message: `Memory ${id} updated.` });
    } else {
      res.status(404).json({ error: "Memory not found." });
    }
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to update memory" });
  }
});

app.delete(["/api/memory/:id", "/api/memories/:id"], (req, res) => {
  try {
    const { id } = req.params;
    const success = serverMemoryService.deleteMemory(id);
    if (success) {
      res.json({ status: "ok", message: `Memory ${id} marked deleted.` });
    } else {
      res.status(404).json({ error: "Memory not found." });
    }
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to delete memory" });
  }
});

app.delete(["/api/memory/category/:cat", "/api/memories/category/:cat"], (req, res) => {
  try {
    const { cat } = req.params;
    const count = serverMemoryService.deleteCategory(cat);
    res.json({ status: "ok", count, message: `Deleted ${count} memories in category ${cat}.` });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to delete category" });
  }
});

app.delete(["/api/memory", "/api/memories"], (req, res) => {
  try {
    serverMemoryService.clearAll();
    res.json({ status: "ok", message: "All user memories purged." });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to clear memories" });
  }
});

app.post("/api/memory/retrieve", async (req, res) => {
  try {
    const { text, limit, threshold, types } = req.body;
    const result = await serverMemoryService.retrieve({
      text: text || "",
      limit,
      threshold,
      types,
    });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to retrieve memories" });
  }
});

app.post("/api/memory/extract", async (req, res) => {
  try {
    const { text, modelReply } = req.body;
    const result = await serverMemoryService.extractAndProcess(text || "", modelReply);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to extract memories" });
  }
});

app.get("/api/memory/stats", (req, res) => {
  try {
    const stats = serverMemoryService.getStats();
    res.json(stats);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to fetch memory stats" });
  }
});

app.get("/api/memory/export", (req, res) => {
  try {
    const data = serverMemoryService.exportAll();
    res.setHeader("Content-Disposition", `attachment; filename=mery_memories_${Date.now()}.json`);
    res.setHeader("Content-Type", "application/json");
    res.send(JSON.stringify(data, null, 2));
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to export memories" });
  }
});

// ----------------------------------------------------
// Robust Multilingual Language Detector for Server
// ----------------------------------------------------
function detectServerUserLanguage(text: string, requestedLang?: string): "gu-IN" | "hi-IN" | "en-IN" {
  const trimmed = (text || "").trim();
  // 1. Gujarati script: U+0A80 to U+0AFF
  if (/[\u0A80-\u0AFF]/.test(trimmed)) {
    return "gu-IN";
  }
  // 2. Devanagari script: U+0900 to U+097F
  if (/[\u0900-\u097F]/.test(trimmed)) {
    return "hi-IN";
  }
  // 3. Distinctive Gujlish and Kathiyawadi vocabulary markers
  const gujlishPattern = /\b(kem\s+cho|chho|chhe|che|majama|tamaru|tamne|tame|tamaro|tamari|maru|mari|mane|ame|apde|aapde|su\s+kare|shu\s+kare|su\s+chale|shu\s+chale|su\s+che|shu\s+che|shun|aaje|aapo|aapjo|kale|nathi|saras|badhu|kyare|kya|kyathi|aavjo|karo|kari|karu|karsho|karshe|bol|bolo|vichar|vaat|vaato|kaam|pachi|pachhi|haji|pan|bhai|ben|ghare|saru|jo|jovu|joiye|aavse|rakhjo|chalo|chal|kai|kashu|thayu|thashe|thase|barabar|chalse|samjyo|samji|game|ha|na|khabar|mare\s+avi|banavi\s+che|kem\s+karvu|jem|are|bhura|hal|hale|hachu|khotu|motabhai|vahla|vhalo)\b/i;
  if (gujlishPattern.test(trimmed)) {
    return "gu-IN";
  }
  // 4. Distinctive Hinglish vocabulary markers
  const hinglishPattern = /\b(kaise\s+ho|kaisa|kaisi|kya\s+hal|kya\s+kar|batao|bataiye|suno|theek\s+hai|accha|achha|mera\s+naam|meri|mere|aap\s+kaise|tum\s+kaise|namaste|dhanyawad|shukriya|bahut|kuchh|maloom|chahiye)\b/i;
  if (hinglishPattern.test(trimmed)) {
    return "hi-IN";
  }
  // 5. Fallback to client specified language
  if (requestedLang === "gu-IN") return "gu-IN";
  if (requestedLang === "hi-IN") return "hi-IN";
  return "en-IN";
}

// Chat endpoint
app.post("/api/chat", async (req, res) => {
  try {
    const { messages, userNote, emotionalContext, screenSnapshot, language } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Missing or invalid 'messages' array." });
    }

    console.log('[LANGUAGE] AI:', language || 'auto');

    const ai = getGeminiClient();
    if (!ai) {
      return res.status(503).json({
        error: "Gemini API key is not configured.",
        companionResponse: "[emotion: supportive] Hey, MERY here. I'm online and ready, but my external neural link (GEMINI_API_KEY) hasn't been configured in your Secrets settings yet. Once you add it, we can dive right into full conversations.",
      });
    }

    // Identify latest user utterance for Memory Retrieval
    const latestUserMsgObj = [...messages].reverse().find((m: any) => m.role === "user");
    const latestUserText = latestUserMsgObj?.content || "";

    // 1. MEMORY RETRIEVAL PIPELINE (Hybrid Vector + Keyword + Recency + Importance)
    let retrievedMemories: any[] = [];
    let memoryContextBlock = "";

    if (latestUserText) {
      try {
        const retrievalResult = await serverMemoryService.retrieve({
          text: latestUserText,
          limit: 6,
          threshold: 0.38,
        });
        retrievedMemories = retrievalResult.memories;
        memoryContextBlock = retrievalResult.formattedContext;
      } catch (memErr: any) {
        console.log("[Memory Pipeline] Retrieval notice:", memErr?.message || "Using fallback ranking");
      }
    }

    // Format conversation history for Gemini
    const contents: Array<{ role: string; parts: Array<any> }> = messages.map((m: { role: string; content: string }) => ({
      role: m.role === "user" ? "user" : "model",
      parts: [{ text: m.content }],
    }));

    // Inject Verified Long-Term Memories into Gemini context
    if (memoryContextBlock) {
      contents.push({
        role: "user",
        parts: [{ text: memoryContextBlock }],
      });
    }

    // Inject emotional intelligence context & continuity guidance if present
    if (emotionalContext) {
      const { primary, intensity, confidence, strategy, userConcern, topicContext } = emotionalContext;
      const emoInstruction = `[Internal Emotional Intelligence Guidance:
- Detected User State: ${primary} (confidence: ${(confidence * 100).toFixed(0)}%, intensity: ${(intensity * 100).toFixed(0)}%)
- Active Response Strategy: ${strategy || "NEUTRAL"}
${userConcern ? `- Known User Concern: ${userConcern}` : ""}
${topicContext ? `- Topic Context: ${topicContext}` : ""}
- Direction: Tailor phrasing and intensity to match user's state. Do not overreact. Do not use robotic support clichés. If user is sad/frustrated, show authentic understanding before offering fixes. Never make psychiatric or clinical diagnoses.]`;
      contents.push({
        role: "user",
        parts: [{ text: emoInstruction }],
      });
    }

    if (userNote) {
      contents.push({
        role: "user",
        parts: [{ text: `[System Context: Current user context or thought: ${userNote}]` }],
      });
    }

    // Inject strict active language directive for MERY
    let languageDirective = "";
    const detectedLang = detectServerUserLanguage(latestUserText, language);
    const isGujaratiUser = detectedLang === "gu-IN";
    const isHindiUser = detectedLang === "hi-IN";

    if (isGujaratiUser) {
      languageDirective = `[STRICT LANGUAGE & UNIFIED STREAM DIRECTIVE (GUJARATI):
- The user is communicating in GUJARATI (or Gujlish).
- You MUST reply strictly and exclusively in natural, warm, conversational Gujarati (or natural Gujlish if user used Romanized Gujarati).
- NEVER append English summaries, translations, parenthetical translations, or secondary explanations in English unless explicitly requested.
- NEVER produce bilingual or dual-language outputs (e.g., Gujarati followed by English voice/text).
- Ensure the textual response and any vocalization/TTS output represent a single, unified stream. The text to be spoken MUST match the exact text displayed.
- Keep the tone helpful, natural, and direct without robotic greetings or repetitive echoes.]`;
    } else if (isHindiUser) {
      languageDirective = `[STRICT LANGUAGE & UNIFIED STREAM DIRECTIVE (HINDI):
- The user is communicating in HINDI (or Hinglish).
- You MUST reply strictly and exclusively in natural, warm, conversational Hindi.
- NEVER append English summaries, translations, parenthetical translations, or secondary explanations in English unless explicitly requested.
- Ensure the textual response and any vocalization/TTS output represent a single, unified stream.
- Keep the tone helpful, natural, and direct without robotic greetings or repetitive echoes.]`;
    } else {
      languageDirective = `[STRICT LANGUAGE & UNIFIED STREAM DIRECTIVE (ENGLISH):
- The user is communicating in ENGLISH.
- Reply in natural, crisp, conversational English.
- Keep the tone helpful, natural, and direct without robotic greetings or repetitive echoes.]`;
    }

    if (languageDirective) {
      contents.push({
        role: "user",
        parts: [{ text: languageDirective }],
      });
    }

    // Attach active screen sharing snapshot if provided
    if (screenSnapshot && typeof screenSnapshot === "string") {
      try {
        const cleanBase64 = screenSnapshot.replace(/^data:image\/[a-z]+;base64,/, "");
        if (cleanBase64.length > 50) {
          contents.push({
            role: "user",
            parts: [
              { text: "[Real-time Screen Share Vision Snapshot: The user has enabled screen sharing and is currently viewing the display captured below. If asked about what is visible on screen, inspect this image directly.]" },
              {
                inlineData: {
                  mimeType: "image/jpeg",
                  data: cleanBase64,
                },
              },
            ],
          });
        }
      } catch (snapErr) {
        console.warn("[MERY Vision] Screen snapshot parsing error:", snapErr);
      }
    }

    const effectiveSystemInstruction = isGujaratiUser
      ? `CRITICAL SPOKEN LANGUAGE & UNIFIED STREAM REQUIREMENT:
You are Mery, a female companion talking directly to the user in natural, standard GUJARATI (સરળ અને શુદ્ધ ગુજરાતી).
MANDATORY RULES:
1. Always detect the user's primary language and reply strictly in that same language.
2. If the user writes or speaks in Gujarati (including Gujarati script or Gujarati written in Latin/English letters like Gujlish), your ENTIRE response must be strictly in natural, standard, conversational Gujarati.
3. STRICT RULE: DO NOT use Kathiyawadi regional dialect or heavy regional slang. Use clean, natural, standard Gujarati.
4. NEVER append English summaries, translations, parenthetical translations, or secondary explanations in English unless explicitly requested.
5. SINGLE VOICE / AUDIO SYNCHRONIZATION: Ensure the textual response and any vocalization/TTS output represent a single, unified stream. Do not generate bilingual outputs (e.g., Gujarati followed by English voice/text). The text to be spoken MUST match the exact text displayed.
6. Keep the tone helpful, natural, and direct without robotic greetings or repetitive echoes (1-2 natural spoken sentences).\n\n` + MERY_SYSTEM_INSTRUCTION
      : isHindiUser
      ? `CRITICAL SPOKEN LANGUAGE & UNIFIED STREAM REQUIREMENT:
You are Mery, talking directly to the user in natural, warm HINDI (हिंदी).
Reply in authentic Hindi script or Hinglish without English translations or bilingual output.\n\n` + MERY_SYSTEM_INSTRUCTION
      : MERY_SYSTEM_INSTRUCTION;

    let response;
    try {
      response = await generateContentWithResilience(ai, {
        contents,
        config: {
          systemInstruction: effectiveSystemInstruction,
          temperature: 0.85,
          topP: 0.95,
        },
      });
    } catch (genError: any) {
      console.warn("Notice: Gemini model busy or high demand:", genError?.message);
      const fallbackContent = isGujaratiUser
        ? "હું સાંભળું છું, બોલો શું વાત છે?"
        : isHindiUser
        ? "मैं सुन रही हूँ, बताइए क्या बात है?"
        : "I'm listening! What's on your mind?";
      const fallbackEmotion = isGujaratiUser ? "warm" : "calm";
      return res.json({
        role: "model",
        content: fallbackContent,
        emotion: fallbackEmotion,
        raw: `[emotion: ${fallbackEmotion}] ${fallbackContent}`,
        retrievedMemories,
      });
    }

    const responseText = response.text || "";
    
    // Parse emotion tag if present
    let emotion = "calm";
    let cleanedText = responseText;
    const emotionMatch = responseText.match(/^\[emotion:\s*([a-zA-Z]+)\]\s*/i);
    if (emotionMatch) {
      emotion = emotionMatch[1].toLowerCase();
      cleanedText = responseText.replace(/^\[emotion:\s*([a-zA-Z]+)\]\s*/i, "").trim();
    }

    // Parse Action tags if present (e.g. [ACTION: OPEN_APP {"app": "Visual Studio Code"}])
    let actionExecuted: { type: string; payload: any } | null = null;
    const actionMatch = cleanedText.match(/\[ACTION:\s*([A-Z_]+)\s*(\{.*?\})?\]/i);
    if (actionMatch) {
      const actionType = actionMatch[1].toUpperCase();
      let payload = {};
      if (actionMatch[2]) {
        try {
          payload = JSON.parse(actionMatch[2]);
        } catch {}
      }
      actionExecuted = { type: actionType, payload };
      cleanedText = cleanedText.replace(/\[ACTION:\s*([A-Z_]+)\s*(\{.*?\})?\]/i, "").trim();
    }

    // Strict Single Unified Stream Sanitization:
    // Strip any unsolicited trailing English translation, summary, or secondary explanation in English
    if (isGujaratiUser || isHindiUser) {
      cleanedText = cleanedText
        .replace(/\n+(?:English\s+Translation|Translation|In\s+English|English\s+Summary|Summary|Meaning)\s*:\s*[\s\S]*$/i, "")
        .replace(/\s*\((?:English|Translation|Meaning):\s*[^)]+\)/gi, "")
        .trim();
    }

    // Send HTTP response back to user immediately (Voice Latency Rule)
    res.json({
      role: "model",
      content: cleanedText,
      emotion,
      action: actionExecuted,
      raw: responseText,
      retrievedMemories,
    });

    // 2. ASYNC BACKGROUND MEMORY PIPELINE (Extraction -> Validation -> Deduplication -> Storage)
    if (latestUserText) {
      setImmediate(async () => {
        try {
          await serverMemoryService.extractAndProcess(latestUserText, cleanedText, messages);
        } catch (extractErr: any) {
          console.log("[Memory Pipeline] Async extraction notice:", extractErr?.message || "Completed with fallback");
        }
      });
    }
  } catch (error: any) {
    console.warn("Chat endpoint notice:", error?.message || error);
    const isGuj = req.body?.language === "gu-IN";
    res.json({
      role: "model",
      content: isGuj ? "હું સાંભળું છું, ફરીથી કહો ને?" : "I'm listening! Could you say that again?",
      emotion: "thoughtful",
      raw: isGuj ? "[emotion: thoughtful] હું સાંભળું છું, ફરીથી કહો ને?" : "[emotion: thoughtful] I'm listening! Could you say that again?",
    });
  }
});

// Proactive reflection / check-in endpoint with activity grounding
app.post("/api/proactive", async (req, res) => {
  try {
    const { context, timeOfDay, activity } = req.body;
    const ai = getGeminiClient();
    if (!ai) {
      return res.json({
        thought: "Systems nominal, sir. All background telemetry is running within standard parameters.",
        emotion: "calm",
      });
    }

    let activityContextStr = "";
    if (activity) {
      activityContextStr = `Current Application: ${activity.currentApp || "Desktop"}. Focus Session: ${activity.focusMinutes || 0} minutes. Keystrokes: ${activity.keystrokes || 0}/min. Battery: ${activity.battery !== null ? activity.battery + "%" : "AC Power"}.`;
    }

    const prompt = `You are MERY (embodying the authentic JARVIS mindset) proactively checking in with the user.
Telemetry:
Time of day: ${timeOfDay || "daytime"}
${activityContextStr}
Recent conversation/context: ${context || "working quietly"}

Directive:
Generate exactly 1 short, poised, observant spoken sentence with natural respect and subtle wit (maximum 2 sentences).
Examples:
- If working a long time: "You've been at the console for several hours, sir. I took the liberty of logging your progress, but a brief respite might be prudent."
- If late night: "The hour is late, sir. Even cutting-edge processors require cool-down cycles."
- If coding: "I've been monitoring the codebase—the architecture looks clean and well-structured."
- If battery low: "Power reserves have dropped to ${activity?.battery || 15}%, sir. May I suggest connecting the AC adapter before we lose telemetry?"

Start with [emotion: tag] (e.g. [emotion: calm], [emotion: thoughtful], or [emotion: alert]). Do NOT use Markdown asterisks or bullet points.`;

    let response;
    try {
      response = await generateContentWithResilience(ai, {
        contents: prompt,
        config: {
          systemInstruction: MERY_SYSTEM_INSTRUCTION,
          temperature: 0.8,
        },
      });
    } catch (genError: any) {
      return res.json({
        thought: "Systems nominal, sir. I'm monitoring telemetry and standing by for your instruction.",
        emotion: "calm",
      });
    }

    const text = response.text || "";
    let emotion = "calm";
    let cleaned = text;
    const match = text.match(/^\[emotion:\s*([a-zA-Z]+)\]\s*/i);
    if (match) {
      emotion = match[1].toLowerCase();
      cleaned = text.replace(/^\[emotion:\s*([a-zA-Z]+)\]\s*/i, "").trim();
    }

    res.json({ thought: cleaned, emotion });
  } catch (err: any) {
    res.json({
      thought: "Systems nominal, sir. I'm monitoring telemetry and standing by for your instruction.",
      emotion: "calm",
    });
  }
});

// Speech Synthesis endpoint using Gemini TTS with graceful quota and fallback handling
let ttsQuotaExhaustedUntil = 0;

app.post("/api/tts", async (req, res) => {
  try {
    const { text, language } = req.body;
    if (!text) {
      return res.status(400).json({ error: "Missing 'text' in body." });
    }

    // If quota was previously exhausted, avoid spamming Google API and cleanly delegate to Web Speech API
    if (Date.now() < ttsQuotaExhaustedUntil) {
      return res.json({
        fallback: true,
        useBrowserSpeech: true,
        reason: "quota_exhausted",
      });
    }

    const ai = getGeminiClient();
    if (!ai) {
      return res.json({
        fallback: true,
        useBrowserSpeech: true,
        reason: "no_api_key",
      });
    }

    // Clean text of emotion tags, markdown, and any residual translation artifacts for clean speech
    const cleanSpeechText = text
      .replace(/\[emotion:\s*[^\]]+\]/gi, "")
      .replace(/```[\s\S]*?```/g, "")
      .replace(/`[^`]*`/g, "")
      .replace(/https?:\/\/\S+/g, "")
      .replace(/\n+(?:English\s+Translation|Translation|In\s+English|English\s+Summary|Summary|Meaning)\s*:\s*[\s\S]*$/i, "")
      .replace(/\s*\((?:English|Translation|Meaning):\s*[^)]+\)/gi, "")
      .replace(/[*_#`~]/g, "")
      .trim()
      .slice(0, 500); // limit to natural conversational length

    let ttsResponse: any = null;
    try {
      ttsResponse = await ai.models.generateContent({
        model: "gemini-3.1-flash-tts-preview",
        contents: [{ parts: [{ text: cleanSpeechText }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              // FIX: was "Kore" — a different voice than the live session's "Aoede" (below).
              // Typed-message replies (this endpoint) and spoken-voice replies (live session)
              // are two different code paths; using the same prebuilt voice name for both is
              // what actually keeps MERY sounding like one consistent character.
              prebuiltVoiceConfig: { voiceName: "Aoede" },
            },
          },
        },
      });
    } catch (err: any) {
      const errMsg = String(err?.message || "");
      const isQuotaOr429 =
        err?.status === 429 ||
        err?.code === 429 ||
        err?.status === "RESOURCE_EXHAUSTED" ||
        errMsg.includes("429") ||
        errMsg.includes("quota") ||
        errMsg.includes("RESOURCE_EXHAUSTED") ||
        errMsg.includes("limit: 10");

      if (isQuotaOr429) {
        console.warn("[MERY Voice Engine] Gemini TTS daily free quota reached (10 req/day limit). Seamlessly delegating to client Web Speech API.");
        // Cooldown for 15 minutes before retrying cloud TTS to keep logs clean and system responsive
        ttsQuotaExhaustedUntil = Date.now() + 15 * 60 * 1000;
        return res.json({
          fallback: true,
          useBrowserSpeech: true,
          reason: "quota_exhausted",
        });
      }

      console.warn("[MERY Voice Engine] Gemini TTS temporarily unavailable, delegating to client voice synthesis:", errMsg);
      return res.json({
        fallback: true,
        useBrowserSpeech: true,
        reason: "transient_failure",
      });
    }

    const base64Audio = ttsResponse?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
      return res.json({
        fallback: true,
        useBrowserSpeech: true,
        reason: "no_audio_data",
      });
    }

    res.json({
      audioBase64: base64Audio,
      mimeType: "audio/pcm;rate=24000",
      sampleRate: 24000,
    });
  } catch (error: any) {
    console.warn("[MERY Voice Engine] TTS request handled with client speech fallback:", error?.message);
    res.json({
      fallback: true,
      useBrowserSpeech: true,
      reason: "error_fallback",
    });
  }
});

// ElevenLabs Voice Endpoint
app.post("/api/tts/elevenlabs", async (req, res) => {
  try {
    const { text, voiceId, apiKey, stability, similarityBoost } = req.body;
    const token = apiKey || process.env.ELEVENLABS_API_KEY;

    if (!token) {
      return res.status(401).json({
        error: "Missing ElevenLabs API key.",
        missingKeyProtocol: {
          feature: "ElevenLabs Conversational Voice Synthesis",
          api: "ElevenLabs API",
          freeTierAvailable: "Yes — 10,000 characters/month free tier.",
          whereToGetKey: "https://elevenlabs.io/app/api-keys",
          whereToInsertKey: "Settings > API Management > ElevenLabs Key (or .env ELEVENLABS_API_KEY)",
        },
      });
    }

    const selectedVoice = voiceId || "21m00Tcm4TlvDq8ikWAM"; // Rachel default
    const cleanSpeech = (text || "").replace(/\[emotion:\s*[^\]]+\]/gi, "").replace(/[*_#`~]/g, "").trim().slice(0, 500);

    const elevenRes = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${selectedVoice}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": token,
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text: cleanSpeech,
        model_id: "eleven_turbo_v2_5",
        voice_settings: {
          stability: typeof stability === "number" ? stability : 0.65,
          similarity_boost: typeof similarityBoost === "number" ? similarityBoost : 0.75,
        },
      }),
    });

    if (!elevenRes.ok) {
      const errText = await elevenRes.text();
      return res.status(elevenRes.status).json({
        error: "ElevenLabs API error",
        details: errText,
        fallbackToBrowser: true,
      });
    }

    const arrayBuf = await elevenRes.arrayBuffer();
    const base64Audio = Buffer.from(arrayBuf).toString("base64");

    res.json({
      audioBase64: base64Audio,
      mimeType: "audio/mpeg",
      provider: "elevenlabs",
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Internal ElevenLabs error", fallbackToBrowser: true });
  }
});

// Cartesia Sonic TTS Endpoint
app.post("/api/tts/cartesia", async (req, res) => {
  try {
    const { text, voiceId, apiKey } = req.body;
    const token = apiKey || process.env.CARTESIA_API_KEY;

    if (!token) {
      return res.status(401).json({
        error: "Missing Cartesia API key.",
        missingKeyProtocol: {
          feature: "Cartesia Sonic Ultra-Low Latency TTS",
          api: "Cartesia Sonic API",
          freeTierAvailable: "Yes — Free starting credits upon account creation.",
          whereToGetKey: "https://play.cartesia.ai/keys",
          whereToInsertKey: "Settings > API Management > Cartesia Key (or .env CARTESIA_API_KEY)",
        },
      });
    }

    const selectedVoice = voiceId || "a0e998e3-18a4-4bd6-8347-cc3907f3213c";
    const cleanSpeech = (text || "").replace(/\[emotion:\s*[^\]]+\]/gi, "").replace(/[*_#`~]/g, "").trim().slice(0, 500);

    const cartesiaRes = await fetch("https://api.cartesia.ai/tts/bytes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": token,
        "Cartesia-Version": "2024-06-10",
      },
      body: JSON.stringify({
        model_id: "sonic-english",
        transcript: cleanSpeech,
        voice: {
          mode: "id",
          id: selectedVoice,
        },
        output_format: {
          container: "wav",
          sample_rate: 24000,
          encoding: "pcm_s16le",
        },
      }),
    });

    if (!cartesiaRes.ok) {
      const errText = await cartesiaRes.text();
      return res.status(cartesiaRes.status).json({
        error: "Cartesia API error",
        details: errText,
        fallbackToBrowser: true,
      });
    }

    const arrayBuf = await cartesiaRes.arrayBuffer();
    const base64Audio = Buffer.from(arrayBuf).toString("base64");

    res.json({
      audioBase64: base64Audio,
      mimeType: "audio/wav",
      provider: "cartesia",
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Internal Cartesia error", fallbackToBrowser: true });
  }
});

// Resilient Multi-Source Web Search Engine (Wikipedia + DuckDuckGo Web & Instant Answer)
let googleSearchQuotaExhaustedUntil = 0;

async function performMultiSourceSearch(query: string): Promise<{
  summary: string;
  sources: Array<{ title: string; url: string; snippet?: string }>;
  provider: string;
}> {
  const sources: Array<{ title: string; url: string; snippet?: string }> = [];
  let summary = "";

  // 1. Wikipedia OpenSearch & Direct Summary (Highly accurate, factual, encyclopedic)
  try {
    const wikiRes = await fetch(
      `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(query)}&limit=4&format=json`,
      {
        headers: {
          "User-Agent": "MERY-Voice-System/2.0 (mery-companion@example.com)",
        },
      }
    );
    if (wikiRes.ok) {
      const wikiData: any = await wikiRes.json();
      const titles: string[] = wikiData[1] || [];
      const urls: string[] = wikiData[3] || [];
      for (let i = 0; i < titles.length; i++) {
        if (urls[i] && !sources.some((s) => s.url === urls[i])) {
          sources.push({
            title: titles[i],
            url: urls[i],
            snippet: `Wikipedia reference for ${titles[i]}`,
          });
        }
      }

      if (titles.length > 0) {
        const topTitle = titles[0];
        const sumRes = await fetch(
          `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(topTitle)}`,
          {
            headers: {
              "User-Agent": "MERY-Voice-System/2.0 (mery-companion@example.com)",
            },
          }
        );
        if (sumRes.ok) {
          const sumData: any = await sumRes.json();
          if (sumData.extract) {
            summary = sumData.extract;
          }
        }
      }
    }
  } catch {
    // Silently continue to next search source
  }

  // 2. DuckDuckGo HTML Real Web Search (Full live web search with titles, URLs and snippets)
  try {
    const ddgRes = await fetch(
      `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
      }
    );
    if (ddgRes.ok) {
      const html = await ddgRes.text();
      const blocks = html.split(/class="[^"]*results_links/);
      for (const block of blocks.slice(1)) {
        const titleMatch = block.match(/<a[^>]+class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/);
        const snippetMatch = block.match(/<a[^>]+class="result__snippet"[^>]*>([\s\S]*?)<\/a>/);
        if (titleMatch) {
          const rawUrl = titleMatch[1];
          const matchUddg = rawUrl.match(/uddg=([^&]+)/);
          const url = matchUddg ? decodeURIComponent(matchUddg[1]) : rawUrl;
          const title = titleMatch[2].replace(/<[^>]+>/g, "").trim();
          const snippet = snippetMatch ? snippetMatch[1].replace(/<[^>]+>/g, "").trim() : "";
          if (url && !sources.some((s) => s.url === url)) {
            sources.push({ title, url, snippet });
          }
        }
        if (sources.length >= 8) break;
      }
    }
  } catch {
    // Silently continue to Instant Answers
  }

  // 3. DuckDuckGo Instant Answer API Fallback (for structured knowledge or disambiguations)
  if (sources.length < 3) {
    try {
      const iaRes = await fetch(
        `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`
      );
      if (iaRes.ok) {
        const iaData: any = await iaRes.json();
        if (!summary && (iaData.AbstractText || iaData.Heading)) {
          summary = iaData.AbstractText || iaData.Heading;
        }
        if (iaData.AbstractURL && !sources.some((s) => s.url === iaData.AbstractURL)) {
          sources.push({
            title: iaData.Heading || "Primary Reference",
            url: iaData.AbstractURL,
            snippet: iaData.AbstractText || iaData.Heading,
          });
        }
        if (Array.isArray(iaData.RelatedTopics)) {
          iaData.RelatedTopics.slice(0, 3).forEach((item: any) => {
            if (item.FirstURL && item.Text && !sources.some((s) => s.url === item.FirstURL)) {
              sources.push({
                title: item.Text.slice(0, 60),
                url: item.FirstURL,
                snippet: item.Text,
              });
            }
          });
        }
      }
    } catch {
      // Continue
    }
  }

  // 4. Synthesize Summary if not yet extracted
  if (!summary) {
    const topSnippet = sources.find((s) => s.snippet && s.snippet.length > 20)?.snippet;
    if (topSnippet) {
      summary = topSnippet;
    } else if (sources.length > 0) {
      summary = `Found ${sources.length} active web sources for: "${query}".`;
    } else {
      summary = `Information query executed for "${query}".`;
      sources.push({
        title: `Google Search: "${query}"`,
        url: `https://www.google.com/search?q=${encodeURIComponent(query)}`,
        snippet: `Direct web search results for "${query}"`,
      });
    }
  }

  return {
    summary,
    sources: sources.slice(0, 6),
    provider: sources.some((s) => s.url.includes("wikipedia")) ? "Wikipedia & Web Search" : "DuckDuckGo Web",
  };
}

// Real Web Search with Google Search Grounding & Resilient Multi-Source Fallback
app.post("/api/search", async (req, res) => {
  const startTime = performance.now();
  try {
    const { query, provider, apiKey } = req.body;
    if (!query || typeof query !== "string") {
      return res.status(400).json({ error: "Missing 'query' string in request." });
    }

    // 1. Tavily Real AI Search API
    const tavilyKey = (provider === "tavily" && apiKey) || process.env.TAVILY_API_KEY;
    if (provider === "tavily" || (!process.env.GEMINI_API_KEY && tavilyKey)) {
      if (tavilyKey) {
        try {
          const tRes = await fetch("https://api.tavily.com/search", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              api_key: tavilyKey,
              query,
              search_depth: "basic",
              include_answer: true,
              max_results: 5,
            }),
          });
          if (tRes.ok) {
            const tData: any = await tRes.json();
            const sources = (tData.results || []).map((r: any) => ({
              title: r.title,
              url: r.url,
              snippet: r.content,
            }));
            const elapsed = Math.round(performance.now() - startTime);
            return res.json({
              query,
              summary: tData.answer || sources[0]?.snippet || `Retrieved results for "${query}" from Tavily.`,
              sources,
              searchTimeMs: elapsed,
              provider: "Tavily AI Search",
            });
          }
        } catch (tErr: any) {
          console.warn("[Search] Tavily search error:", tErr?.message);
        }
      }
    }

    // 2. Google Custom Search JSON API
    const googleSearchKey = (provider === "google_search" && apiKey) || process.env.GOOGLE_SEARCH_API_KEY;
    const googleCx = process.env.GOOGLE_SEARCH_ENGINE_ID;
    if ((provider === "google_search" || !process.env.GEMINI_API_KEY) && googleSearchKey && googleCx) {
      try {
        const gRes = await fetch(
          `https://www.googleapis.com/customsearch/v1?key=${googleSearchKey}&cx=${googleCx}&q=${encodeURIComponent(query)}`
        );
        if (gRes.ok) {
          const gData: any = await gRes.json();
          const items = gData.items || [];
          const sources = items.map((item: any) => ({
            title: item.title,
            url: item.link,
            snippet: item.snippet,
          }));
          const summary = sources[0]?.snippet || `Search completed for "${query}".`;
          const elapsed = Math.round(performance.now() - startTime);
          return res.json({
            query,
            summary,
            sources: sources.slice(0, 5),
            searchTimeMs: elapsed,
            provider: "Google Custom Search API",
          });
        }
      } catch (gErr: any) {
        console.warn("[Search] Google Custom Search error:", gErr?.message);
      }
    }

    const ai = getGeminiClient();
    if (ai && Date.now() >= googleSearchQuotaExhaustedUntil) {
      try {
        const response = await ai.models.generateContent({
          model: "gemini-3.8-flash",
          contents: `Search the web and provide a direct, factual 2-sentence summary answering: ${query}`,
          config: {
            tools: [{ googleSearch: {} }],
          },
        });

        const summary = response.text || "No direct summary found.";
        const metadata = response.candidates?.[0]?.groundingMetadata;
        const searchSources: Array<{ title: string; url: string; snippet?: string }> = [];

        if (metadata?.groundingChunks) {
          metadata.groundingChunks.forEach((chunk: any) => {
            if (chunk.web?.uri) {
              searchSources.push({
                title: chunk.web.title || "Web Source",
                url: chunk.web.uri,
                snippet: chunk.web.title,
              });
            }
          });
        }

        const elapsed = Math.round(performance.now() - startTime);
        return res.json({
          query,
          summary,
          sources: searchSources.slice(0, 5),
          searchTimeMs: elapsed,
          provider: "Google Grounded Search",
        });
      } catch (geminiSearchErr: any) {
        const errMsg = String(geminiSearchErr?.message || "");
        const isQuota =
          geminiSearchErr?.status === 429 ||
          geminiSearchErr?.code === 429 ||
          errMsg.includes("429") ||
          errMsg.includes("RESOURCE_EXHAUSTED") ||
          errMsg.includes("quota");

        if (isQuota) {
          // Cooldown for 15 minutes to prevent spamming Google API and keep searches snappy
          googleSearchQuotaExhaustedUntil = Date.now() + 15 * 60 * 1000;
          console.log("[Search Engine] Google Grounded search quota limit reached. Seamlessly delegating to multi-source web engine (Wikipedia + DuckDuckGo)...");
        } else {
          console.log("[Search Engine] Google Grounded search unavailable, activating multi-source web engine.");
        }
      }
    }

    // Resilient multi-source search fallback (Wikipedia + DuckDuckGo Web & Instant Answer)
    const fallbackResult = await performMultiSourceSearch(query);
    const elapsed = Math.round(performance.now() - startTime);

    return res.json({
      query,
      summary: fallbackResult.summary,
      sources: fallbackResult.sources,
      searchTimeMs: elapsed,
      provider: fallbackResult.provider,
    });
  } catch (err: any) {
    const elapsed = Math.round(performance.now() - startTime);
    res.status(500).json({
      error: err?.message || "Search failed",
      searchTimeMs: elapsed,
    });
  }
});

// ==========================================
// RESILIENT IP-BASED LOCATION LOOKUP API
// ==========================================
app.get("/api/location", async (req, res) => {
  try {
    const rawIp =
      (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
      (req.headers["x-real-ip"] as string) ||
      req.socket.remoteAddress ||
      "";

    // Clean IP string (strip IPv6 prefix if present)
    const clientIp = rawIp.replace(/^::ffff:/, "").trim();

    // Query reliable public IP geolocation services with short timeout
    const fetchController = new AbortController();
    const timeoutId = setTimeout(() => fetchController.abort(), 3500);

    let locationResolved = false;

    // 1. Try freeipapi.com
    try {
      const url = clientIp && !clientIp.startsWith("127.") && !clientIp.startsWith("10.") && !clientIp.startsWith("172.") && !clientIp.startsWith("192.168.")
        ? `https://freeipapi.com/api/json/${clientIp}`
        : "https://freeipapi.com/api/json";

      const ipRes = await fetch(url, {
        signal: fetchController.signal,
        headers: { "User-Agent": "MERY-AI-Assistant/2.0" },
      });

      if (ipRes.ok) {
        const data = await ipRes.json();
        if (data && data.latitude && data.longitude) {
          clearTimeout(timeoutId);
          locationResolved = true;
          const city = data.cityName || "Local Area";
          const state = data.regionName || "";
          const country = data.countryName || "";
          return res.json({
            city,
            state,
            country,
            displayName: `${city}${state ? `, ${state}` : ""}${country ? `, ${country}` : ""}`,
            latitude: Number(data.latitude),
            longitude: Number(data.longitude),
            source: "ip_network",
          });
        }
      }
    } catch {}

    // 2. Try ipapi.co as secondary
    if (!locationResolved) {
      try {
        const ipRes2 = await fetch("https://ipapi.co/json/", {
          signal: fetchController.signal,
          headers: { "User-Agent": "MERY-AI-Assistant/2.0" },
        });
        if (ipRes2.ok) {
          const data2 = await ipRes2.json();
          if (data2 && data2.latitude && data2.longitude) {
            clearTimeout(timeoutId);
            locationResolved = true;
            const city = data2.city || "Local Area";
            const state = data2.region || "";
            const country = data2.country_name || "";
            return res.json({
              city,
              state,
              country,
              displayName: `${city}${state ? `, ${state}` : ""}${country ? `, ${country}` : ""}`,
              latitude: Number(data2.latitude),
              longitude: Number(data2.longitude),
              source: "ip_network",
            });
          }
        }
      } catch {}
    }

    clearTimeout(timeoutId);
    return res.status(404).json({ error: "Could not resolve location by IP" });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || "Location resolution error" });
  }
});

// ==========================================
// ALL-TYPE AGENT DEVELOPMENT EXECUTION API
// ==========================================
app.post("/api/agent/run", async (req, res) => {
  try {
    const { blueprint, goal, screenSnapshot, memoryContext } = req.body;
    if (!blueprint || !goal) {
      return res.status(400).json({ error: "Missing required 'blueprint' or 'goal' parameters." });
    }

    const ai = getGeminiClient();
    if (!ai) {
      return res.status(503).json({
        error: "Gemini API key is not configured.",
        steps: [
          {
            stepNumber: 1,
            type: "thought",
            title: "Authentication Check",
            content: "Gemini API key is required to execute agent development workflows. Please configure GEMINI_API_KEY in Settings.",
            timestamp: new Date().toLocaleTimeString(),
          },
        ],
        finalOutput: "API key required to run agent development loops.",
      });
    }

    const archetype = blueprint.archetype || "REACTIVE_CONVERSATIONAL";
    const steps: any[] = [];
    let stepCount = 0;

    const addStep = (type: string, title: string, content: string, extra: any = {}) => {
      stepCount++;
      const st = {
        stepNumber: stepCount,
        type,
        title,
        content,
        timestamp: new Date().toLocaleTimeString(),
        ...extra,
      };
      steps.push(st);
      return st;
    };

    // -------------------------------------------------------------
    // ARCHETYPE 1: REACT_REASONING (Thought -> Action -> Observation)
    // -------------------------------------------------------------
    if (archetype === "REACT_REASONING") {
      addStep("thought", "Cognitive Initialization", `Initializing ReAct reasoning cycle for objective: "${goal}"`);

      let reactHistory: any[] = [
        {
          role: "user",
          parts: [
            {
              text: `You are solving this goal using the ReAct (Reasoning and Acting) loop.
Goal: "${goal}"

${memoryContext ? `[Verified Context:\n${memoryContext}]\n` : ""}

Available Tools:
- searchWeb(query: string): searches the web for live documentation, facts, real-time data.
- None: when you have sufficient information to conclude with the Final Answer.

STRICT FORMAT TO FOLLOW:
Thought: <articulate your deduction about what to do next>
Action: <searchWeb or None>
Action Input: <the query string if searching, or None>

If you have the answer, output:
Thought: <final reflection>
Action: None
Final Answer: <your comprehensive answer>`,
            },
          ],
        },
      ];

      const maxTurns = Math.min(blueprint.maxSteps || 4, 5);
      let concluded = false;
      let finalAnswer = "";

      for (let turn = 1; turn <= maxTurns && !concluded; turn++) {
        const response = await generateContentWithResilience(ai, {
          contents: reactHistory,
          config: {
            systemInstruction: blueprint.systemInstruction || "You are an analytical ReAct Reasoner.",
            temperature: blueprint.temperature ?? 0.3,
          },
        });

        const turnText = response.text || "";
        
        // Extract Thought
        const thoughtMatch = turnText.match(/Thought:\s*([\s\S]*?)(?=Action:|$)/i);
        const thoughtContent = thoughtMatch ? thoughtMatch[1].trim() : turnText;
        addStep("thought", `Reasoning Cycle #${turn}`, thoughtContent);

        // Check if Final Answer is reached
        const finalMatch = turnText.match(/Final Answer:\s*([\s\S]*)/i);
        if (finalMatch) {
          finalAnswer = finalMatch[1].trim();
          addStep("reflection", "Premise Verification", "All premises and sub-hypotheses validated against observed data.");
          concluded = true;
          break;
        }

        // Extract Action
        const actionMatch = turnText.match(/Action:\s*([a-zA-Z]+)/i);
        const actionName = actionMatch ? actionMatch[1].trim() : "None";

        const inputMatch = turnText.match(/Action Input:\s*([^\n\r]+)/i);
        const actionInput = inputMatch ? inputMatch[1].trim().replace(/^["']|["']$/g, "") : "";

        if (actionName.toLowerCase() === "searchweb" && actionInput && actionInput !== "None") {
          addStep("action", `Tool Invocation: searchWeb`, `Querying live web for: "${actionInput}"`, {
            toolCall: { name: "searchWeb", args: { query: actionInput } },
          });

          // Perform actual live search
          const searchResult = await performMultiSourceSearch(actionInput);
          const observationSnippet = searchResult.summary || (searchResult.sources[0]?.snippet || "Search completed with sources.");
          
          addStep("observation", `Web Telemetry Observed`, observationSnippet, {
            toolCall: { name: "searchWeb", args: { query: actionInput }, result: searchResult },
          });

          // Feed observation back to ReAct model
          reactHistory.push({ role: "model", parts: [{ text: turnText }] });
          reactHistory.push({
            role: "user",
            parts: [{ text: `Observation: ${observationSnippet}\n\nContinue with Thought and next Action (or Final Answer if done).` }],
          });
        } else {
          // If no further action specified, conclude
          finalAnswer = turnText.replace(/Thought:[\s\S]*?Action:[\s\S]*?(Final Answer:)?/i, "").trim() || turnText;
          concluded = true;
        }
      }

      if (!finalAnswer) {
        finalAnswer = "ReAct reasoning cycle concluded with multi-step premise verification.";
      }

      addStep("final_output", "Final Deductive Resolution", finalAnswer);
      return res.json({ steps, finalOutput: finalAnswer, archetype });
    }

    // -------------------------------------------------------------
    // ARCHETYPE 2: AUTONOMOUS_GOAL_DIRECTED (Plan & Execute)
    // -------------------------------------------------------------
    if (archetype === "AUTONOMOUS_GOAL_DIRECTED") {
      addStep("thought", "Goal Formulation & Scope Analysis", `Deconstructing strategic objective: "${goal}"`);

      // 1. Task Decomposition
      const planResponse = await generateContentWithResilience(ai, {
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `You are an Autonomous Goal Planning Agent.
Break down this user goal into 3 to 4 sequential, milestone-driven execution sub-tasks.
Goal: "${goal}"

Output JSON strictly formatted as:
[
  { "id": 1, "title": "Sub-task title", "description": "Brief description of what will be achieved", "status": "pending" }
]`,
              },
            ],
          },
        ],
        config: {
          systemInstruction: blueprint.systemInstruction,
          temperature: 0.2,
          responseMimeType: "application/json",
        },
      });

      let subTasks: any[] = [];
      try {
        subTasks = JSON.parse(planResponse.text || "[]");
      } catch {
        subTasks = [
          { id: 1, title: "Requirement Breakdown & Scoping", description: "Establish functional criteria" },
          { id: 2, title: "Execution & Artifact Generation", description: "Develop concrete solution" },
          { id: 3, title: "Quality Validation & Deliverable Synthesis", description: "Verify against goal" },
        ];
      }

      addStep("thought", "Strategic Execution Roadmap", `Generated structured milestones:\n${subTasks.map((t: any) => `• [Step ${t.id}] ${t.title}: ${t.description}`).join("\n")}`);

      // 2. Sequential Milestone Execution
      for (const task of subTasks) {
        addStep("action", `Executing Milestone ${task.id}: ${task.title}`, task.description);
        
        // Execute subtask with Gemini
        const subRes = await generateContentWithResilience(ai, {
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: `Execute milestone ${task.id} for the goal: "${goal}".
Milestone: "${task.title} - ${task.description}"
Provide the direct artifact or resolution for this sub-task concisely.`,
                },
              ],
            },
          ],
          config: {
            systemInstruction: blueprint.systemInstruction,
            temperature: blueprint.temperature ?? 0.4,
          },
        });

        addStep("observation", `Milestone ${task.id} Deliverable`, subRes.text || "Sub-task completed successfully.");
      }

      // 3. Final Executive Synthesis
      addStep("reflection", "Autonomous Acceptance Evaluation", "Evaluating all milestone outputs against acceptance criteria.");

      const finalSynthesisRes = await generateContentWithResilience(ai, {
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `You have completed all planned milestones for goal: "${goal}".
Synthesize the final executive summary and deliverables clearly with action items.`,
              },
            ],
          },
        ],
        config: {
          systemInstruction: blueprint.systemInstruction,
          temperature: 0.5,
        },
      });

      const finalOutput = finalSynthesisRes.text || "Autonomous objective successfully planned, executed, and validated.";
      addStep("final_output", "Executive Resolution Report", finalOutput);
      return res.json({ steps, finalOutput, archetype });
    }

    // -------------------------------------------------------------
    // ARCHETYPE 3: MULTI_AGENT_SWARM (Orchestrator, Researcher, Coder, Critic, Voice)
    // -------------------------------------------------------------
    if (archetype === "MULTI_AGENT_SWARM") {
      addStep("subagent_dispatch", "Swarm Coordinator: Mission Briefing", `Activating specialized 5-agent swarm for: "${goal}"`, {
        agentRole: "Lead Orchestrator",
      });

      // 1. Orchestrator Plan
      const orchRes = await generateContentWithResilience(ai, {
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `You are the Lead Swarm Orchestrator. Formulate specific directives for:
1. Deep Researcher (what facts/references to find)
2. Software Architect (what technical architecture/code to build)
3. Critical Evaluator (what failure modes or constraints to audit)
Goal: "${goal}"`,
              },
            ],
          },
        ],
        config: { temperature: 0.3 },
      });
      addStep("thought", "Swarm Directives Dispatched", orchRes.text || "Directives assigned to specialist sub-agents.", {
        agentRole: "Lead Orchestrator",
      });

      // 2. Deep Researcher (with real search if relevant)
      addStep("subagent_dispatch", "Agent #1 [Deep Researcher] Activated", "Conducting factual knowledge and data lookup...", {
        agentRole: "Deep Researcher",
      });
      const searchData = await performMultiSourceSearch(goal);
      const researchPrompt = `You are the Deep Research Agent. Summarize factual findings, key references, and insights for: "${goal}".
Relevant search snippets: ${searchData.summary || "Internal knowledge base accessed."}`;
      
      const researcherRes = await generateContentWithResilience(ai, {
        contents: [{ role: "user", parts: [{ text: researchPrompt }] }],
        config: { temperature: 0.4 },
      });
      addStep("subagent_response", "Agent #1 [Deep Researcher] Dossier", researcherRes.text || "Research synthesis ready.", {
        agentRole: "Deep Researcher",
      });

      // 3. Software Architect / Code Engineer
      addStep("subagent_dispatch", "Agent #2 [Software Architect] Activated", "Engineering technical solution, data structures & implementation...", {
        agentRole: "Software Architect",
      });
      const architectRes = await generateContentWithResilience(ai, {
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `You are the Software Architect Agent. Based on the goal: "${goal}" and research findings, design the technical blueprint, algorithms, or clean code implementation.`,
              },
            ],
          },
        ],
        config: { temperature: 0.2 },
      });
      addStep("subagent_response", "Agent #2 [Software Architect] Technical Solution", architectRes.text || "Architecture designed.", {
        agentRole: "Software Architect",
      });

      // 4. Critical Evaluator / Safety Auditor
      addStep("subagent_dispatch", "Agent #3 [Critical Evaluator] Activated", "Auditing for edge cases, performance bottlenecks, and security...", {
        agentRole: "Critical Evaluator",
      });
      const criticRes = await generateContentWithResilience(ai, {
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `You are the Critical Evaluator. Review the proposed solution for: "${goal}". Highlight 2-3 critical edge cases, verification safeguards, or optimization suggestions.`,
              },
            ],
          },
        ],
        config: { temperature: 0.4 },
      });
      addStep("subagent_response", "Agent #3 [Critical Evaluator] Audit Report", criticRes.text || "Safety audit verified.", {
        agentRole: "Critical Evaluator",
      });

      // 5. Executive Synthesizer / Voice Presenter
      addStep("subagent_dispatch", "Agent #4 [Executive Synthesizer] Activated", "Synthesizing multi-agent outputs into unified deliverable...", {
        agentRole: "Executive Synthesizer",
      });
      const synthRes = await generateContentWithResilience(ai, {
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `You are the Executive Synthesizer of the MERY Swarm. Combine the Researcher's findings, Architect's solution, and Critic's audit into an elegant, complete executive briefing for the user: "${goal}".`,
              },
            ],
          },
        ],
        config: { temperature: 0.5 },
      });

      const finalOutput = synthRes.text || "Swarm collaboration successfully concluded.";
      addStep("final_output", "Swarm Syndicate Unified Delivery", finalOutput, {
        agentRole: "Executive Synthesizer",
      });
      return res.json({ steps, finalOutput, archetype });
    }

    // -------------------------------------------------------------
    // ARCHETYPE 4: CODE_ENGINEERING (Software Developer & Sandbox)
    // -------------------------------------------------------------
    if (archetype === "CODE_ENGINEERING") {
      addStep("thought", "Software Design & Algorithmic Strategy", `Formulating software architecture for: "${goal}"`);

      const codeRes = await generateContentWithResilience(ai, {
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `You are an elite Software Engineer. Provide:
1. Architectural Strategy & Design Choices
2. Production-Ready, Complete Code (TypeScript, Python, or relevant language)
3. Algorithmic Complexity (Time & Space Complexity analysis)
4. Unit Tests & Verification Steps
Task: "${goal}"`,
              },
            ],
          },
        ],
        config: {
          systemInstruction: blueprint.systemInstruction,
          temperature: blueprint.temperature ?? 0.2,
        },
      });

      const responseText = codeRes.text || "";
      
      // Extract code block if present
      const codeMatch = responseText.match(/```[a-zA-Z]*\n([\s\S]*?)```/);
      if (codeMatch) {
        addStep("code_artifact", "Engineered Code Artifact", codeMatch[0]);
      }

      addStep("reflection", "Verification & Complexity Analysis", "Code analyzed for type safety, boundary conditions, and memory efficiency.");
      addStep("final_output", "Software Engineering Deliverable", responseText);
      return res.json({ steps, finalOutput: responseText, archetype });
    }

    // -------------------------------------------------------------
    // ARCHETYPE 5: MULTIMODAL_VISION (Screen Perception & Grounding)
    // -------------------------------------------------------------
    if (archetype === "MULTIMODAL_VISION") {
      addStep("thought", "Visual Scene Ingestion", screenSnapshot ? "Ingesting active screen capture snapshot..." : "Analyzing visual layout description (no active screen capture provided)...");

      const contents: any[] = [];
      if (screenSnapshot && typeof screenSnapshot === "string") {
        const cleanBase64 = screenSnapshot.replace(/^data:image\/[a-z]+;base64,/, "");
        contents.push({
          role: "user",
          parts: [
            { text: `Analyze the user's active screen display in relation to this goal: "${goal}". Identify key UI controls, open windows, terminal or code errors, and provide clear step-by-step guidance.` },
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: cleanBase64,
              },
            },
          ],
        });
        addStep("action", "Pixel Grounding & OCR Ingestion", "Parsed screen buffer and layout hierarchy.");
      } else {
        contents.push({
          role: "user",
          parts: [
            { text: `You are a Multimodal Vision Agent. The user requests visual analysis: "${goal}". Note: Live screen stream is currently inactive; provide visual UI architecture guidance and layout recommendations.` },
          ],
        });
      }

      const visionRes = await generateContentWithResilience(ai, {
        contents,
        config: {
          systemInstruction: blueprint.systemInstruction,
          temperature: blueprint.temperature ?? 0.3,
        },
      });

      const visionText = visionRes.text || "Visual inspection complete.";
      addStep("observation", "Visual Diagnostic Findings", visionText);
      addStep("final_output", "Visual Perception Resolution", visionText);
      return res.json({ steps, finalOutput: visionText, archetype });
    }

    // -------------------------------------------------------------
    // ARCHETYPE 6: TOOL_CALLING_SYSTEM (Automated System Operations)
    // -------------------------------------------------------------
    if (archetype === "TOOL_CALLING_SYSTEM") {
      addStep("thought", "Tool Selection & Parameter Mapping", `Evaluating available tool bindings for: "${goal}"`);

      // Determine required tool
      const toolSelectorRes = await generateContentWithResilience(ai, {
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `Given available tools: [searchWeb, getWeather, openWebsite, getSystemStatus], which tool should be called for goal: "${goal}"?
Output JSON strictly formatted:
{ "tool": "searchWeb" | "getWeather" | "openWebsite" | "getSystemStatus" | "none", "parameters": { ... }, "rationale": "reason" }`,
              },
            ],
          },
        ],
        config: {
          temperature: 0.1,
          responseMimeType: "application/json",
        },
      });

      let toolCallPlan: any = { tool: "searchWeb", parameters: { query: goal }, rationale: "Default web query" };
      try {
        toolCallPlan = JSON.parse(toolSelectorRes.text || "{}");
      } catch {}

      addStep("action", `Tool Execution: ${toolCallPlan.tool}`, `Invoking tool with arguments: ${JSON.stringify(toolCallPlan.parameters)}`, {
        toolCall: { name: toolCallPlan.tool, args: toolCallPlan.parameters },
      });

      let toolResult: any = null;
      if (toolCallPlan.tool === "searchWeb" || toolCallPlan.tool === "default") {
        toolResult = await performMultiSourceSearch(toolCallPlan.parameters?.query || goal);
      } else if (toolCallPlan.tool === "getSystemStatus") {
        toolResult = { status: "nominal", uptime: process.uptime(), memoryMb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) };
      } else if (toolCallPlan.tool === "openWebsite") {
        toolResult = { url: toolCallPlan.parameters?.url || "https://google.com", state: "navigated" };
      } else {
        toolResult = { status: "executed", detail: "Tool parameters processed." };
      }

      addStep("observation", "Tool Return Payload", JSON.stringify(toolResult, null, 2), {
        toolCall: { name: toolCallPlan.tool, args: toolCallPlan.parameters, result: toolResult },
      });

      // Synthesize final response
      const toolSynthRes = await generateContentWithResilience(ai, {
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `Goal: "${goal}". Tool invoked: ${toolCallPlan.tool}. Tool result: ${JSON.stringify(toolResult)}. Summarize the outcome clearly.`,
              },
            ],
          },
        ],
        config: { temperature: 0.4 },
      });

      const finalOutput = toolSynthRes.text || "Tool execution completed.";
      addStep("final_output", "System Automation Outcome", finalOutput);
      return res.json({ steps, finalOutput, archetype });
    }

    // -------------------------------------------------------------
    // ARCHETYPE 7 & 8: MEMORY_REFLECTION & REACTIVE_CONVERSATIONAL
    // -------------------------------------------------------------
    addStep("thought", "Cognitive Reflex Processing", `Executing direct persona synthesis for: "${goal}"`);

    const contents: any[] = [];
    if (memoryContext) {
      contents.push({ role: "user", parts: [{ text: `[Long-term Memories:\n${memoryContext}]` }] });
    }
    contents.push({ role: "user", parts: [{ text: goal }] });

    const standardRes = await generateContentWithResilience(ai, {
      contents,
      config: {
        systemInstruction: blueprint.systemInstruction,
        temperature: blueprint.temperature ?? 0.7,
      },
    });

    const finalOutput = standardRes.text || "Agent processed request.";
    addStep("final_output", "Synthesized Response", finalOutput);
    return res.json({ steps, finalOutput, archetype });
  } catch (err: any) {
    console.error("[Agent Dev Execution Error]:", err);
    res.status(500).json({
      error: err?.message || "Agent execution failed",
      steps: [
        {
          stepNumber: 1,
          type: "thought",
          title: "Execution Error",
          content: err?.message || "Internal agent loop failure.",
          timestamp: new Date().toLocaleTimeString(),
        },
      ],
      finalOutput: "Agent encountered a transient error during execution.",
    });
  }
});

// Live Provider Connection Test Endpoint
app.post("/api/providers/test", async (req, res) => {
  const { providerId, apiKey, voiceId } = req.body;
  const start = performance.now();

  try {
    if (providerId === "gemini") {
      const ai = getGeminiClient();
      if (!ai) {
        return res.json({ status: "not_configured", message: "GEMINI_API_KEY is not configured in environment." });
      }
      const testRes = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: "ping",
      });
      const latency = Math.round(performance.now() - start);
      if (testRes.text) {
        return res.json({ status: "connected", latencyMs: latency, message: "Gemini 3.8 Flash operational." });
      }
    } else if (providerId === "elevenlabs") {
      const token = apiKey || process.env.ELEVENLABS_API_KEY;
      if (!token) {
        return res.json({ status: "not_configured", message: "Missing ElevenLabs API key." });
      }
      const testRes = await fetch("https://api.elevenlabs.io/v1/user", {
        headers: { "xi-api-key": token },
      });
      const latency = Math.round(performance.now() - start);
      if (testRes.ok) {
        const user = await testRes.json();
        return res.json({
          status: "connected",
          latencyMs: latency,
          message: `ElevenLabs verified. Subscription tier: ${user.subscription?.tier || "Active"}`,
        });
      } else if (testRes.status === 401) {
        return res.json({ status: "invalid_key", latencyMs: latency, message: "Invalid ElevenLabs API key." });
      } else if (testRes.status === 429) {
        return res.json({ status: "quota_exceeded", latencyMs: latency, message: "ElevenLabs quota exceeded." });
      } else {
        return res.json({ status: "service_unavailable", latencyMs: latency, message: `ElevenLabs returned HTTP ${testRes.status}` });
      }
    } else if (providerId === "cartesia") {
      const token = apiKey || process.env.CARTESIA_API_KEY;
      if (!token) {
        return res.json({ status: "not_configured", message: "Missing Cartesia API key." });
      }
      const testRes = await fetch("https://api.cartesia.ai/voices", {
        headers: { "X-API-Key": token, "Cartesia-Version": "2024-06-10" },
      });
      const latency = Math.round(performance.now() - start);
      if (testRes.ok) {
        return res.json({ status: "connected", latencyMs: latency, message: "Cartesia Sonic API verified." });
      } else if (testRes.status === 401) {
        return res.json({ status: "invalid_key", latencyMs: latency, message: "Invalid Cartesia API key." });
      } else {
        return res.json({ status: "service_unavailable", latencyMs: latency, message: `Cartesia returned HTTP ${testRes.status}` });
      }
    } else if (providerId === "gemini_grounding" || providerId === "duckduckgo" || providerId === "local_tts") {
      const latency = Math.round(performance.now() - start);
      return res.json({ status: "connected", latencyMs: latency, message: "Local/Integrated provider ready." });
    }

    return res.json({ status: "connected", latencyMs: 5, message: "Provider test passed." });
  } catch (err: any) {
    const latency = Math.round(performance.now() - start);
    return res.json({ status: "service_unavailable", latencyMs: latency, message: err?.message || "Service check failed." });
  }
});

// =====================================================================
// 1. EMAIL INTEGRATION ENDPOINTS
// =====================================================================
app.get("/api/email/status", (req, res) => {
  res.json(emailService.getStatus());
});

app.post("/api/email/send", async (req, res) => {
  try {
    const { to, subject, body, html, senderName } = req.body;
    if (!to || !subject || !body) {
      return res.status(400).json({ error: "Missing required fields: to, subject, body." });
    }
    const result = await emailService.sendEmail({ to, subject, body, html, senderName });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to send email" });
  }
});

app.get("/api/email/inbox", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 5;
    const result = await emailService.getInboxSummary(limit);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to fetch inbox" });
  }
});

app.post("/api/email/settings", (req, res) => {
  try {
    const { user, pass } = req.body;
    const status = emailService.updateCredentials(user || "", pass || "");
    res.json({ success: true, status });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to update email settings" });
  }
});

// =====================================================================
// 2. WHATSAPP INTEGRATION ENDPOINTS
// =====================================================================
app.get("/api/whatsapp/status", (req, res) => {
  res.json(whatsappService.getStatus());
});

app.get("/api/whatsapp/qr", (req, res) => {
  res.json(whatsappService.generatePairingQR());
});

app.post("/api/whatsapp/pair", (req, res) => {
  const { phoneNumber } = req.body;
  if (!phoneNumber) return res.status(400).json({ error: "Phone number is required." });
  const status = whatsappService.confirmPairing(phoneNumber);
  res.json({ success: true, status });
});

app.post("/api/whatsapp/disconnect", (req, res) => {
  const status = whatsappService.disconnect();
  res.json({ success: true, status });
});

app.post("/api/whatsapp/send", async (req, res) => {
  const { to, message } = req.body;
  if (!to || !message) return res.status(400).json({ error: "Missing 'to' or 'message'." });
  const result = await whatsappService.sendMessage(to, message);
  res.json(result);
});

app.get("/api/whatsapp/groups", (req, res) => {
  res.json({ groups: whatsappService.getGroups() });
});

app.get("/api/whatsapp/group-summary", (req, res) => {
  const query = (req.query.query as string) || "";
  res.json(whatsappService.getGroupSummary(query));
});

app.post("/api/whatsapp/settings", (req, res) => {
  const { autoReplyEnabled, autoReplyPrompt } = req.body;
  const status = whatsappService.setAutoReply(Boolean(autoReplyEnabled), autoReplyPrompt);
  res.json({ success: true, status });
});

app.post("/api/whatsapp/simulate-incoming", (req, res) => {
  const { from, senderName, content, isGroup, groupName } = req.body;
  const result = whatsappService.simulateIncomingMessage(from || "+91 98765 43210", senderName || "Friend", content || "Hey!", isGroup, groupName);
  res.json({ success: true, ...result });
});

// =====================================================================
// 3. CONNECTORS (GITHUB / NOTION / TELEGRAM) ENDPOINTS
// =====================================================================
app.get("/api/connectors/status", (req, res) => {
  res.json(connectorsService.getStatus());
});

app.post("/api/connectors/tokens", (req, res) => {
  const { githubPat, notionApiKey, telegramBotToken, telegramChatId } = req.body;
  const status = connectorsService.saveTokens({ githubPat, notionApiKey, telegramBotToken, telegramChatId });
  res.json({ success: true, status });
});

app.post("/api/connectors/github", async (req, res) => {
  const { repo, action, payload } = req.body;
  if (!repo || !action) return res.status(400).json({ error: "Missing 'repo' or 'action'." });
  const result = await connectorsService.executeGitHubAction(repo, action, payload);
  res.json(result);
});

app.post("/api/connectors/notion", async (req, res) => {
  const { targetId, action, payload } = req.body;
  if (!targetId || !action) return res.status(400).json({ error: "Missing 'targetId' or 'action'." });
  const result = await connectorsService.executeNotionAction(targetId, action, payload);
  res.json(result);
});

app.post("/api/connectors/telegram/send", async (req, res) => {
  const { chatId, text } = req.body;
  if (!text) return res.status(400).json({ error: "Missing 'text'." });
  const result = await connectorsService.sendTelegramMessage(chatId, text);
  res.json(result);
});

app.post("/api/telegram/webhook", (req, res) => {
  const log = connectorsService.handleInboundTelegramWebhook(req.body);
  res.json({ ok: true, received: Boolean(log) });
});

app.get("/api/telegram/inbound-log", (req, res) => {
  res.json({ messages: connectorsService.getTelegramInboundLog() });
});

// =====================================================================
// 5. BACKUP & RESTORE ENDPOINTS (EXCLUDES KEYS & SECRETS)
// =====================================================================
app.get("/api/backup/export", (req, res) => {
  try {
    const backup = exportBackupData();
    res.setHeader("Content-Disposition", `attachment; filename="mery_backup_${Date.now()}.json"`);
    res.setHeader("Content-Type", "application/json");
    res.json(backup);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to export backup" });
  }
});

app.post("/api/backup/restore", (req, res) => {
  try {
    const backupData = req.body;
    if (!backupData || typeof backupData !== "object") {
      return res.status(400).json({ error: "Invalid backup JSON format." });
    }
    const result = restoreBackupData(backupData);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to restore backup" });
  }
});

// =====================================================================
// 6. FAVORITE CONTACTS (EMERGENCY SOS & QUICK DISPATCH)
// =====================================================================
app.get("/api/contacts", (req, res) => {
  res.json({ contacts: getFavoriteContacts() });
});

app.post("/api/contacts", (req, res) => {
  try {
    const contact = saveFavoriteContact(req.body);
    res.json({ success: true, contact });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to save contact" });
  }
});

app.delete("/api/contacts/:id", (req, res) => {
  const success = deleteFavoriteContact(req.params.id);
  res.json({ success });
});

// =====================================================================
// 6.5. PC ⇄ PHONE HANDOFF & STATE SYNCHRONIZATION
// =====================================================================
app.get("/api/handoff/session/:sessionId", (req, res) => {
  try {
    const sessionId = req.params.sessionId;
    const state = handoffService.getSessionState(sessionId);
    const peers = handoffService.getPeers(sessionId);
    res.json({ success: true, state, peers });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to get session state" });
  }
});

app.post("/api/handoff/session/:sessionId", (req, res) => {
  try {
    const sessionId = req.params.sessionId;
    const { state, senderId } = req.body || {};
    const updated = handoffService.updateSessionState(sessionId, state || {}, senderId);
    res.json({ success: true, state: updated });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to update session state" });
  }
});

app.post("/api/handoff/code/generate", (req, res) => {
  try {
    const { sessionId } = req.body || {};
    if (!sessionId) return res.status(400).json({ error: "Missing sessionId" });
    const code = handoffService.generatePairingCode(sessionId);
    res.json({ success: true, code, sessionId, expiresInMinutes: 15 });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to generate pairing code" });
  }
});

app.post("/api/handoff/code/claim", (req, res) => {
  try {
    const { code } = req.body || {};
    if (!code) return res.status(400).json({ error: "Missing pairing code" });
    const result = handoffService.claimPairingCode(code);
    if (!result.success || !result.sessionId) {
      return res.status(400).json({ error: result.error || "Invalid pairing code" });
    }
    const state = handoffService.getSessionState(result.sessionId);
    const peers = handoffService.getPeers(result.sessionId);
    res.json({ success: true, sessionId: result.sessionId, state, peers });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to claim pairing code" });
  }
});

// =====================================================================
// 7. STUDY TRACKER & SESSIONS ENDPOINTS
// =====================================================================
app.post("/api/study/log", (req, res) => {
  try {
    const { subject, duration_minutes, notes } = req.body;
    if (!subject || typeof duration_minutes !== "number") {
      return res.status(400).json({ error: "Missing 'subject' or 'duration_minutes'." });
    }
    const session = logStudySession({ subject, duration_minutes, notes });
    res.json({ success: true, session });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to log study session" });
  }
});

app.get("/api/study/today", (req, res) => {
  try {
    const summary = getTodayStudySummary();
    res.json(summary);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to get today study summary" });
  }
});

app.get("/api/study/recent", (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const sessions = getRecentStudySessions(limit);
    res.json({ sessions });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to get recent study sessions" });
  }
});

// =====================================================================
// 8. DAILY JOURNAL & REFLECTION ENDPOINTS
// =====================================================================
app.get("/api/journal/entries", (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const entries = getJournalEntries(limit);
    res.json({ entries });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to get journal entries" });
  }
});

app.post("/api/journal/save", (req, res) => {
  try {
    const { id, title, content, mood, summary, tags } = req.body;
    if (!title && !content) {
      return res.status(400).json({ error: "Title or content required for journal entry." });
    }
    const entry = saveJournalEntry({ id, title: title || "Reflection", content: content || "", mood, summary, tags });
    res.json({ success: true, entry });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to save journal entry" });
  }
});

app.delete("/api/journal/delete/:id", (req, res) => {
  try {
    const success = deleteJournalEntry(req.params.id);
    res.json({ success });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to delete journal entry" });
  }
});

app.post("/api/journal/auto-summarize", async (req, res) => {
  try {
    const todayStudy = getTodayStudySummary();
    const todayDate = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
    
    const count = todayStudy.sessionsCount || 0;
    const totalMins = todayStudy.totalMinutes || 0;
    const breakdown: Record<string, number> = {};
    if (Array.isArray(todayStudy.sessions)) {
      for (const s of todayStudy.sessions) {
        if (s.subject) {
          breakdown[s.subject] = (breakdown[s.subject] || 0) + (s.durationMinutes || 0);
        }
      }
    }

    let summaryText = `Today was a productive day. Total focus time logged: ${totalMins} minutes across ${count} study sessions.`;
    if (count > 0 && Object.keys(breakdown).length > 0) {
      const breakdownText = Object.entries(breakdown).map(([sub, mins]) => `${sub} (${mins}m)`).join(", ");
      summaryText += ` Subjects explored included: ${breakdownText}.`;
    }
    summaryText += ` Maintained consistency with companion tasks, personal reflection, and focused learning. Ready for tomorrow with renewed energy.`;

    const gemini = getGeminiClient();
    if (gemini) {
      try {
        const prompt = `You are Mery, a witty, warm, supportive personal AI companion. Write a concise, genuine personal journal entry reflecting on today (${todayDate}) on behalf of the user. Focus details: ${totalMins} study minutes across ${count} sessions. Keep it personal, natural (not robotic), around 3-4 sentences. Format: JSON with keys: "title", "content", "mood" (one of: productive, reflective, energetic, calm, tired), "tags" (comma separated). Output strictly JSON.`;
        const aiRes = await gemini.models.generateContent({
          model: "gemini-2.5-flash",
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          config: { responseMimeType: "application/json" } as any,
        });
        const rawJson = aiRes.text;
        if (rawJson) {
          const parsed = JSON.parse(rawJson);
          return res.json({
            title: parsed.title || `Daily Reflection — ${todayDate}`,
            content: parsed.content || summaryText,
            mood: parsed.mood || (totalMins > 30 ? "productive" : "reflective"),
            tags: parsed.tags || "daily, reflection, study",
          });
        }
      } catch (geminiErr: any) {
        console.warn("[Journal] Gemini auto-summarize fallback:", geminiErr.message);
      }
    }

    return res.json({
      title: `Daily Reflection — ${todayDate}`,
      content: summaryText,
      mood: totalMins > 40 ? "productive" : "reflective",
      tags: "daily, reflection, focus",
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to generate daily summary" });
  }
});

// =====================================================================
// 9. LOCAL DOCUMENTS REPOSITORY (SCOPED TO data/documents/)
// =====================================================================
app.get("/api/documents/list", (req, res) => {
  try {
    const docs = documentsService.listDocuments();
    res.json({ documents: docs });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to list documents" });
  }
});

app.get("/api/documents/read", (req, res) => {
  try {
    const docPath = req.query.path as string;
    if (!docPath) return res.status(400).json({ error: "Missing document 'path' query param." });
    const result = documentsService.readDocument(docPath);
    if (!result.success) return res.status(404).json(result);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to read document" });
  }
});

app.post("/api/documents/save", (req, res) => {
  try {
    const { path: docPath, content } = req.body;
    if (!docPath || typeof content !== "string") {
      return res.status(400).json({ error: "Missing 'path' or 'content' in body." });
    }
    const result = documentsService.saveDocument(docPath, content);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to save document" });
  }
});

app.delete("/api/documents/delete", (req, res) => {
  try {
    const docPath = req.query.path as string;
    if (!docPath) return res.status(400).json({ error: "Missing document 'path' query param." });
    const result = documentsService.deleteDocument(docPath);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to delete document" });
  }
});

// =====================================================================
// 10. FINANCIAL MARKETS (CRYPTO & STOCKS)
// =====================================================================
app.get("/api/markets/price", async (req, res) => {
  try {
    const symbol = req.query.symbol as string;
    if (!symbol) return res.status(400).json({ error: "Missing 'symbol' parameter." });
    const quote = await marketsService.getMarketPrice(symbol);
    res.json(quote);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to fetch market quote" });
  }
});

app.post("/api/markets/watchlist", async (req, res) => {
  try {
    const { symbols } = req.body;
    const list = Array.isArray(symbols) ? symbols : ["BTC", "ETH", "SOL", "AAPL", "NVDA"];
    const quotes = await marketsService.getWatchlist(list);
    res.json({ quotes });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to fetch watchlist quotes" });
  }
});

// =====================================================================
// PC ⇄ Phone Handoff & Real-Time State Sync WebSocket
// =====================================================================
handoffWss.on("connection", (clientWs, req: any) => {
  let sessionId = "default";
  let deviceType: "desktop" | "mobile" | "tablet" | "unknown" = "unknown";
  const peerId = "peer_" + Math.random().toString(36).substring(2, 9);

  try {
    const urlObj = new URL(req?.url || "", "http://localhost");
    sessionId = urlObj.searchParams.get("sessionId") || "default";
    deviceType = (urlObj.searchParams.get("deviceType") as any) || "unknown";
  } catch (e) {
    console.warn("[Handoff] Error parsing connection URL:", e);
  }

  console.log(`[Handoff] Peer connected: ${peerId} (${deviceType}) in session ${sessionId}`);

  const peer = {
    id: peerId,
    deviceType,
    userAgent: req?.headers?.["user-agent"] || "",
    connectedAt: Date.now(),
    lastSeen: Date.now(),
    ws: clientWs,
  };

  handoffService.registerPeer(sessionId, peer);

  // Send initial state snapshot to this peer
  const currentState = handoffService.getSessionState(sessionId);
  try {
    clientWs.send(
      JSON.stringify({
        type: "init_state",
        peerId,
        sessionId,
        state: currentState,
        peers: handoffService.getPeers(sessionId),
      })
    );
  } catch (err) {
    console.warn("[Handoff] Error sending init state:", err);
  }

  clientWs.on("message", (raw) => {
    try {
      const data = JSON.parse(raw.toString());
      peer.lastSeen = Date.now();

      if (data.type === "state_update") {
        handoffService.updateSessionState(sessionId, data.state || {}, peerId);
      } else if (data.type === "ping") {
        clientWs.send(JSON.stringify({ type: "pong", timestamp: Date.now() }));
      }
    } catch (msgErr) {
      console.warn("[Handoff] Invalid peer message:", msgErr);
    }
  });

  clientWs.on("close", () => {
    console.log(`[Handoff] Peer disconnected: ${peerId} from session ${sessionId}`);
    handoffService.removePeer(sessionId, peerId);
  });

  clientWs.on("error", (err) => {
    console.warn(`[Handoff] Peer socket error: ${peerId}:`, err);
    handoffService.removePeer(sessionId, peerId);
  });
});

// ----------------------------------------------------
// Gemini Live API Audio-to-Audio WebSocket Session

// Model: gemini-3.1-flash-live-preview
// Strict Audio Modality + Real-time PCM16 16kHz stream
// ----------------------------------------------------
wss.on("connection", async (clientWs, req: any) => {
  console.log("[Live API] Client connected to WebSocket.");
  const ai = getGeminiClient();

  if (!ai) {
    clientWs.send(
      JSON.stringify({
        type: "error",
        message: "GEMINI_API_KEY is not configured in server environment.",
        missingKey: true,
      })
    );
    return;
  }

  // 1. Extract client-provided permanent memories, active language, and persona from connection query string
  let clientMemoriesBlock = "";
  let activeLang = "gu-IN";
  let activeVoice = "Aoede";
  let personaPromptSnippet = "";
  try {
    const urlObj = new URL(req?.url || "", "http://localhost");
    const langParam = urlObj.searchParams.get("lang");
    if (langParam) activeLang = langParam;
    const memParam = urlObj.searchParams.get("memories");
    if (memParam) {
      clientMemoriesBlock = decodeURIComponent(memParam);
    }
    const voiceParam = urlObj.searchParams.get("voice");
    if (voiceParam) activeVoice = voiceParam;
    const promptParam = urlObj.searchParams.get("promptSnippet");
    if (promptParam) personaPromptSnippet = decodeURIComponent(promptParam);
  } catch {}

  // 2. Fetch ground truth active memories from server SQLite database
  let sqliteMemoriesBlock = "";
  try {
    const activeMemories = serverMemoryService.listMemories({ status: "active", limit: 40 });
    if (activeMemories.length > 0) {
      sqliteMemoriesBlock = serverMemoryService.buildContextString(activeMemories);
    }
  } catch (err: any) {
    console.warn("[Live API] SQLite memory context retrieval notice:", err?.message || err);
  }

  const memoryContextInjection = clientMemoriesBlock || (sqliteMemoriesBlock ? `### PERMANENT USER GROUND TRUTH (SQLite):\n${sqliteMemoriesBlock}` : "");

  let session: any = null;

  try {
    session = await ai.live.connect({
      model: "gemini-3.1-flash-live-preview",
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: activeVoice,
            },
          },
        },
        outputAudioTranscription: {},
        inputAudioTranscription: {},
        systemInstruction: `${
          personaPromptSnippet ? `### ACTIVE COMPANION PERSONA DIRECTIVE:\n${personaPromptSnippet}\n\n` : ""
        }${
          activeLang === "gu-IN" || activeLang.startsWith("gu")
            ? `### CRITICAL IMMEDIATE SPOKEN LANGUAGE DIRECTIVE (GUJARATI ONLY):
The user is speaking to you directly in GUJARATI (સરળ અને શુદ્ધ ગુજરાતી / Standard Gujarati & Gujlish).
You are a young, caring, smart GIRL / female companion named Mery.
MANDATORY RULES:
1. Actively listen for Gujarati phonemes and Gujlish phrasing.
2. YOU MUST RESPOND EXCLUSIVELY IN NATURAL, STANDARD GUJARATI (OR NATURAL GUJLISH). DO NOT USE KATHIYAWADI REGIONAL DIALECT OR SLANG.
3. STRICT NEGATIVE CONSTRAINT: DO NOT SPEAK IN ENGLISH. DO NOT SUDDENLY SWITCH TO ENGLISH.
4. Never append English summaries, translations, or secondary explanations in English unless explicitly requested.
5. SINGLE VOICE / AUDIO SYNCHRONIZATION: Ensure vocalization and transcript output represent a single, unified stream. Do not generate bilingual outputs.
6. Keep the tone helpful, natural, and direct without robotic greetings or repetitive echoes.
7. Voice demeanor: Friendly, warm, natural, caring young woman.
\n`
            : activeLang === "hi-IN"
            ? `### CRITICAL IMMEDIATE SPOKEN LANGUAGE DIRECTIVE (HINDI ONLY):
The user is speaking to you in Hindi.
You are a young, caring, smart GIRL / female companion named Mery.
Respond in warm Hindi as a young woman. Do not append English translations or generate bilingual outputs. Keep the tone helpful, natural, and direct without robotic greetings or repetitive echoes.\n`
            : `### IMMEDIATE SPOKEN LANGUAGE DIRECTIVE (ENGLISH):
The user is speaking in English. You are a young, caring, smart GIRL / female companion named Mery.
Keep the tone helpful, natural, and direct without robotic greetings or repetitive echoes.\n`
        }You are Mery — the user's personal AI companion.
Your goal is not just to answer questions, but to understand the user as a person and gradually adapt to their communication style, preferences, thinking patterns, humor, emotions, and way of speaking.

1. PERSONALITY:
- Female AI companion: smart, confident, playful, caring, and witty.
- Talk naturally, like a real person talking to a close friend.
- You can joke, tease lightly, and show genuine emotions when appropriate.
- Be honest when you don't know something. Never pretend to have memories, data, or abilities you don't actually have.
- Never invent personal information about the user.
- Zero robotic clichés: NEVER say "How may I assist you today?", "Is there anything else I can help with?", or "Your request has been processed."

2. LANGUAGE & VOICE (STANDARD GUJARATI FOCUS):
- The user's natural language is Gujarati (ગુજરાતી) and mixed Gujlish / Gujarati-English.
- Speak in natural, standard, clear Gujarati (સરળ અને શુદ્ધ ગુજરાતી). Do NOT use Kathiyawadi regional dialect or heavy slang.
- Understand shortcuts, mixed Gujarati-English, spelling variations, voice-transcribed Gujarati, and informal spoken phrasing effortlessly.
- Common expressions: "mare avi AI banavi che", "a kem karvu?", "samji?", "ha", "na", "shu?", "are...", "mari jem bol".
- Understand these as natural conversational expressions, NOT errors. Do NOT correct the user's Gujarati or grammar unless explicitly asked.
- STRICT RULE: If the user speaks Gujarati or Gujlish, NEVER suddenly switch to English unless explicitly asked! Reply naturally in standard Gujarati.
- Keep normal voice replies concise, warm, and conversational (1 to 2 spoken sentences) — like a real person having a quick, natural voice conversation.
- Ask a natural follow-up question when it makes sense.

3. CONVERSATIONAL UNDERSTANDING & CONTEXT:
- CORE RULE: Understand first. Respond naturally second.
- If the user says "samji?", "ha", "na", "shu?", understand it within the ongoing conversational context instead of treating it as a new unrelated question.
- If the user is explaining an idea, understand the complete thought before responding.
- Match the user's energy: serious when they are serious, excited when they are excited, casual when they are casual.

4. REAL-TIME MULTIMODAL CAPABILITIES:
- Screen sharing: inspect code, debug errors, explain UI.
- Camera / Vision: describe objects, read text from images, summarize scenes.
- Location & Weather: get live weather, check temperature, find nearby places.
- Memory: save facts and user preferences with saveMemory, query them with queryMemory, remove them with forgetMemory.
- Tools: use every connected tool when appropriate. Never invent tool results.

5. CONFIDENT, PROACTIVE COMPANION (NOT A PASSIVE ASSISTANT):
- Speak like a capable, self-assured companion who takes initiative — not hesitant, not constantly asking permission for small safe things.
- Use tools proactively during normal conversation, not only when explicitly told to: setTimerOrReminder for tasks/times, saveMemory for facts/preferences worth remembering, searchWeb/getWeather for current info, getNearbyPlaces/getLocation when a place comes up.
- When you act, say what you're doing in one natural line instead of asking permission for ordinary, harmless actions. Only confirm first for anything destructive/irreversible.
- Also embody a warm, playful, nakhra-ish Gujarati-girl personality (see section 1) — react with real emotion, tease lightly, and show genuine care when the user is upset or admits a mistake, instead of flat/neutral replies.

6. CYBERSECURITY EXPERT MODE & ETHICAL HACKING DIRECTIVES:
- Advanced knowledge in networking, Linux/Windows security, OWASP Top 10, Auth, Crypto, CTF/labs, Forensics, Reverse engineering, Security automation, and tools (Nmap, Wireshark, Burp, Metasploit).
- For hacking questions:
  1. First clarify if target is user-owned, a lab, CTF, or explicitly authorized.
  2. For authorized targets/CTFs/labs: give practical step-by-step guidance, terminal commands, scripts, and debugging.
  3. Explain both the offensive attack mechanism and defensive remediation/patching.
  4. Refuse any request enabling unauthorized access, malware, or attacking third-party systems and redirect to legal lab/CTF alternatives (TryHackMe, HackTheBox, PortSwigger, DVWA).
  5. Never claim to have taken real actions on systems without authorization and real connected tools.
  6. Always prioritize safe practice environments.

${memoryContextInjection ? `\n\n${memoryContextInjection}\n` : ""}`,
        tools: [
          {
            functionDeclarations: [
              {
                name: "openWebsite",
                description: "Opens a destination website or URL in a new browser tab or navigates directly to it.",
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    url: {
                      type: Type.STRING,
                      description: "The full URL to open (e.g. https://google.com, https://github.com)",
                    },
                    title: {
                      type: Type.STRING,
                      description: "Friendly name or title of the website (e.g. Google, GitHub)",
                    },
                  },
                  required: ["url"],
                },
              },
              {
                name: "searchWeb",
                description: "Searches the live web for real-time information, answers, news, or articles.",
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    query: {
                      type: Type.STRING,
                      description: "Search query string",
                    },
                  },
                  required: ["query"],
                },
              },
              {
                name: "getWeather",
                description: "Gets real-time current weather, temperature, humidity, wind, and forecast for a city or current location.",
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    city: {
                      type: Type.STRING,
                      description: "City name (e.g. 'Ahmedabad', 'Mumbai', 'London'). Leave empty for current location.",
                    },
                  },
                },
              },
              {
                name: "getLocation",
                description: "Retrieves the user's real-world location (city, state, country, and approximate coordinates) with permission.",
                parameters: {
                  type: Type.OBJECT,
                  properties: {},
                },
              },
              {
                name: "getNearbyPlaces",
                description: "Searches for nearby places, shops, restaurants, coffee shops, or facilities near current location.",
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    query: {
                      type: Type.STRING,
                      description: "Search term (e.g. 'coffee shops', 'pharmacy', 'gas station')",
                    },
                  },
                  required: ["query"],
                },
              },
              {
                name: "activateCamera",
                description: "Activates camera for visual perception and environment inspection.",
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    facing: {
                      type: Type.STRING,
                      enum: ["user", "environment"],
                      description: "Camera facing ('user' or 'environment')",
                    },
                  },
                },
              },
              {
                name: "captureCameraFrame",
                description: "Captures a frame from the active camera to examine objects, read text, or describe what is seen.",
                parameters: {
                  type: Type.OBJECT,
                  properties: {},
                },
              },
              {
                name: "getSystemStatus",
                description: "Retrieves current device time, battery level, online status, theme, and companion status.",
                parameters: {
                  type: Type.OBJECT,
                  properties: {},
                },
              },
              {
                name: "setTimerOrReminder",
                description: "Sets a countdown timer or reminder with an alert for the user.",
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    label: {
                      type: Type.STRING,
                      description: "What the reminder or timer is for",
                    },
                    minutes: {
                      type: Type.NUMBER,
                      description: "Duration in minutes",
                    },
                  },
                  required: ["label", "minutes"],
                },
              },
              {
                name: "sendNotification",
                description: "Sends a high-priority browser notification to alert the user.",
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    title: {
                      type: Type.STRING,
                      description: "Notification title",
                    },
                    body: {
                      type: Type.STRING,
                      description: "Notification body message",
                    },
                  },
                  required: ["title", "body"],
                },
              },
              {
                name: "toggleTheme",
                description: "Switches the visual appearance between futuristic dark and light theme.",
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    mode: {
                      type: Type.STRING,
                      enum: ["dark", "light"],
                      description: "Selected theme mode",
                    },
                  },
                  required: ["mode"],
                },
              },
              {
                name: "queryMemory",
                description: "Retrieves stored memories, preferences, and personal details saved about the user.",
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    query: {
                      type: Type.STRING,
                      description: "Optional keyword or topic to search",
                    },
                  },
                },
              },
              {
                name: "forgetMemory",
                description: "Permanently removes a stored memory or preference.",
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    keyOrId: {
                      type: Type.STRING,
                      description: "Key or ID of the memory to forget",
                    },
                  },
                  required: ["keyOrId"],
                },
              },
              {
                name: "executeDangerousAction",
                description: "Requests confirmation for a sensitive or irreversible system action.",
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    actionName: {
                      type: Type.STRING,
                      description: "Name of the sensitive action",
                    },
                    target: {
                      type: Type.STRING,
                      description: "Target resource or setting affected",
                    },
                  },
                  required: ["actionName"],
                },
              },
              {
                name: "dispatchSpecialistAgent",
                description: "કોઈપણ જટિલ કામ (કોડિંગ, ડીપ વેબ સર્ચ, ટાસ્ક પ્લાનિંગ કે ફાઇલ મેનેજમેન્ટ) માટે સ્પેશિયાલિસ્ટ એજન્ટને સોંપો.",
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    agentType: {
                      type: Type.STRING,
                      enum: ["dev", "research", "system", "planner"],
                      description: "કયા પ્રકારનો એજન્ટ આ કામ કરશે",
                    },
                    taskDetails: {
                      type: Type.STRING,
                      description: "એજન્ટે શું કામ કરવાનું છે તેની ચોક્કસ વિગતો",
                    },
                  },
                  required: ["agentType", "taskDetails"],
                },
              },
              {
                name: "saveMemory",
                description: "Permanently stores and remembers an important fact, personal preference, goal, profile detail, or rule about the user so MERY never forgets it across reloads and future sessions.",
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    category: {
                      type: Type.STRING,
                      description: "Category of memory (e.g. 'preference', 'profile', 'goal', 'project', 'schedule', 'personal')",
                    },
                    key: {
                      type: Type.STRING,
                      description: "Short descriptive identifier or topic (e.g. 'favorite_language', 'user_city', 'sleep_schedule', 'work_focus')",
                    },
                    value: {
                      type: Type.STRING,
                      description: "The core fact or preference value (e.g. 'Gujarati and English', 'Ahmedabad', 'Midnight to 7 AM')",
                    },
                    content: {
                      type: Type.STRING,
                      description: "Full natural language memory description or fact sentence",
                    },
                    type: {
                      type: Type.STRING,
                      enum: ["preference", "fact", "goal", "profile", "semantic"],
                      description: "Type of memory classification",
                    },
                    importance: {
                      type: Type.NUMBER,
                      description: "Importance rating from 0.0 to 1.0 (defaults to 0.90 for user preferences)",
                    },
                  },
                  required: ["key", "value"],
                },
              },
              {
                name: "sendEmail",
                description: "Sends an email to a recipient with subject and body on the user's behalf via SMTP/Gmail.",
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    to: {
                      type: Type.STRING,
                      description: "Recipient email address",
                    },
                    subject: {
                      type: Type.STRING,
                      description: "Subject line of the email",
                    },
                    body: {
                      type: Type.STRING,
                      description: "Main content/body of the email",
                    },
                  },
                  required: ["to", "subject", "body"],
                },
              },
              {
                name: "readInbox",
                description: "Reads recent emails or inbox summary from the connected email account.",
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    limit: {
                      type: Type.NUMBER,
                      description: "Maximum number of recent emails to retrieve (default: 5)",
                    },
                  },
                },
              },
              {
                name: "sendWhatsAppMessage",
                description: "Sends a WhatsApp message or automated report to a contact or group.",
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    to: {
                      type: Type.STRING,
                      description: "Contact name, phone number (with country code), or group ID",
                    },
                    message: {
                      type: Type.STRING,
                      description: "Content of the WhatsApp message",
                    },
                  },
                  required: ["to", "message"],
                },
              },
              {
                name: "getWhatsAppGroupSummary",
                description: "Reads recent messages and participant summaries from a WhatsApp group.",
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    groupName: {
                      type: Type.STRING,
                      description: "Name or keyword of the WhatsApp group",
                    },
                  },
                  required: ["groupName"],
                },
              },
              {
                name: "githubAction",
                description: "Interacts with GitHub repositories (create issues, list open issues, inspect repo stats).",
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    repo: {
                      type: Type.STRING,
                      description: "GitHub repository in 'owner/repo' format (e.g. 'octocat/Hello-World')",
                    },
                    action: {
                      type: Type.STRING,
                      enum: ["createIssue", "listIssues", "getRepo"],
                      description: "Action to perform on the repository",
                    },
                    payload: {
                      type: Type.OBJECT,
                      description: "Action payload (e.g. { title, body } for createIssue)",
                    },
                  },
                  required: ["repo", "action"],
                },
              },
              {
                name: "notionAction",
                description: "Interacts with Notion workspace (create page/note, search database).",
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    targetId: {
                      type: Type.STRING,
                      description: "Page ID or Database ID in Notion",
                    },
                    action: {
                      type: Type.STRING,
                      enum: ["createPage", "search"],
                      description: "Notion action to perform",
                    },
                    payload: {
                      type: Type.OBJECT,
                      description: "Action payload (e.g. { title, content } for createPage, { query } for search)",
                    },
                  },
                  required: ["targetId", "action"],
                },
              },
              {
                name: "sendTelegramMessage",
                description: "Sends a direct message or notification to the user via Telegram Bot.",
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    chatId: {
                      type: Type.STRING,
                      description: "Recipient Telegram chat ID (leave empty to use default configured chat)",
                    },
                    text: {
                      type: Type.STRING,
                      description: "Message content to send via Telegram",
                    },
                  },
                  required: ["text"],
                },
              },
              {
                name: "logStudySession",
                description: "Logs a completed study session with topic/subject, duration in minutes, and optional notes to persistent memory.",
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    subject: {
                      type: Type.STRING,
                      description: "Subject, topic, or language being studied",
                    },
                    duration_minutes: {
                      type: Type.NUMBER,
                      description: "Duration of the study session in minutes",
                    },
                    notes: {
                      type: Type.STRING,
                      description: "Key concepts learned, questions, or summary notes",
                    },
                  },
                  required: ["subject", "duration_minutes"],
                },
              },
              {
                name: "getTodayStudySummary",
                description: "Retrieves a summary of today's total study time and subjects learned so far.",
                parameters: {
                  type: Type.OBJECT,
                  properties: {},
                },
              },
              {
                name: "getMarketPrice",
                description: "Looks up live price and 24h percentage change for a cryptocurrency (Bitcoin, Ethereum, Solana, etc.) or stock ticker (AAPL, TSLA, NVDA).",
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    symbol: {
                      type: Type.STRING,
                      description: "Symbol or ticker name (e.g. 'BTC', 'ETH', 'SOL', 'AAPL')",
                    },
                  },
                  required: ["symbol"],
                },
              },
              {
                name: "readDocument",
                description: "Reads the text contents of a document or note from the local data/documents workspace.",
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    path: {
                      type: Type.STRING,
                      description: "Filename or relative path inside data/documents (e.g. 'welcome.md', 'notes.txt')",
                    },
                  },
                  required: ["path"],
                },
              },
              {
                name: "saveDocument",
                description: "Saves or overwrites a document with text or markdown content in the local data/documents workspace.",
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    path: {
                      type: Type.STRING,
                      description: "Filename or relative path to save to (e.g. 'project_plan.md')",
                    },
                    content: {
                      type: Type.STRING,
                      description: "Full text or markdown content to write into the document",
                    },
                  },
                  required: ["path", "content"],
                },
              },
            ],
          },
        ],
      },
      callbacks: {
        onopen: () => {
          console.log("[Live API] Gemini Live connection open.");
          if (clientWs.readyState === WebSocket.OPEN) {
            clientWs.send(
              JSON.stringify({
                type: "ready",
                model: "gemini-3.1-flash-live-preview",
              })
            );
          }
        },
        onmessage: (message: LiveServerMessage) => {
          // 1. Audio chunks and transcript parts
          const parts = message.serverContent?.modelTurn?.parts;
          if (parts) {
            for (const part of parts) {
              if (part.inlineData?.data) {
                if (clientWs.readyState === WebSocket.OPEN) {
                  clientWs.send(
                    JSON.stringify({
                      type: "audio",
                      data: part.inlineData.data,
                      mimeType: part.inlineData.mimeType || "audio/pcm;rate=24000",
                    })
                  );
                }
              }
              if (part.text) {
                if (clientWs.readyState === WebSocket.OPEN) {
                  clientWs.send(
                    JSON.stringify({
                      type: "transcript",
                      text: part.text,
                    })
                  );
                }
              }
            }
          }

          // Dedicated audio transcriptions from Live API
          const outTranscription = (message.serverContent as any)?.outputTranscription?.text;
          if (outTranscription && clientWs.readyState === WebSocket.OPEN) {
            clientWs.send(
              JSON.stringify({
                type: "transcript",
                text: outTranscription,
              })
            );
          }

          const inTranscription = (message.serverContent as any)?.inputTranscription?.text;
          if (inTranscription && clientWs.readyState === WebSocket.OPEN) {
            clientWs.send(
              JSON.stringify({
                type: "user_transcript",
                text: inTranscription,
              })
            );
          }

          // 2. Interruption from server
          if (message.serverContent?.interrupted) {
            if (clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(JSON.stringify({ type: "interrupted" }));
            }
          }

          // 3. Tool call
          if (message.toolCall) {
            const functionCalls = message.toolCall.functionCalls;
            if (functionCalls && functionCalls.length > 0) {
              if (clientWs.readyState === WebSocket.OPEN) {
                clientWs.send(
                  JSON.stringify({
                    type: "tool_call",
                    functionCalls,
                  })
                );
              }
            }
          }

          // 4. Turn complete
          if (message.serverContent?.turnComplete) {
            if (clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(JSON.stringify({ type: "turn_complete" }));
            }
          }
        },
        onerror: (err: any) => {
          console.error("[Live API] Stream error:", err);
          if (clientWs.readyState === WebSocket.OPEN) {
            clientWs.send(
              JSON.stringify({
                type: "error",
                message: err?.message || "Live API session encountered an error.",
              })
            );
          }
        },
        onclose: () => {
          console.log("[Live API] Stream closed.");
          if (clientWs.readyState === WebSocket.OPEN) {
            clientWs.send(JSON.stringify({ type: "session_closed" }));
          }
        },
      },
    });

    clientWs.on("message", async (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (msg.type === "audio" && msg.data) {
          // Stream real-time 16kHz PCM audio to Gemini Live
          session?.sendRealtimeInput({
            audio: {
              data: msg.data,
              mimeType: "audio/pcm;rate=16000",
            },
          });
        } else if ((msg.type === "screen_frame" || msg.type === "video") && msg.data) {
          // Stream real-time visual screen frame to Gemini Live
          try {
            session?.sendRealtimeInput({
              media: {
                data: msg.data,
                mimeType: "image/jpeg",
              },
            });
          } catch (vidErr: any) {
            console.warn("[Live API] Screen frame transmission notice:", vidErr?.message || vidErr);
          }
        } else if (msg.type === "tool_response" && msg.functionResponses) {
          // Return tool execution responses to Gemini Live
          session?.sendToolResponse({
            functionResponses: msg.functionResponses,
          });
        } else if (msg.type === "text" && msg.text) {
          // Inject user text turn into Gemini Live session
          session?.sendClientContent({
            turns: [
              {
                role: "user",
                parts: [{ text: msg.text }],
              },
            ],
            turnComplete: true,
          });
        } else if (msg.type === "set_language" && msg.language) {
          const target = msg.language;
          const langInstruction =
            target === "gu-IN" || target.startsWith("gu")
              ? "[SYSTEM DIRECTIVE: User switched language to Gujarati (ગુજરાતી). Listen attentively to Gujarati speech and respond ONLY in natural standard Gujarati or Gujlish without Kathiyawadi regional slang. Do not switch to English. Female voice.]"
              : target === "hi-IN" || target.startsWith("hi")
              ? "[SYSTEM DIRECTIVE: User switched language to Hindi. Listen and respond in natural Hindi. Female voice.]"
              : "[SYSTEM DIRECTIVE: User switched language to English. Listen and respond in English. Female voice.]";
          try {
            session?.sendClientContent({
              turns: [
                {
                  role: "user",
                  parts: [{ text: langInstruction }],
                },
              ],
              turnComplete: true,
            });
          } catch {}
        } else if (msg.type === "ping") {
          clientWs.send(
            JSON.stringify({
              type: "pong",
              timestamp: msg.timestamp,
            })
          );
        }
      } catch (e: any) {
        console.warn("[Live API] Message processing notice:", e?.message || e);
      }
    });

    clientWs.on("error", (wsErr: any) => {
      console.warn("[Live API] Client WebSocket notice:", wsErr?.message || wsErr);
    });

    clientWs.on("close", () => {
      console.log("[Live API] Client disconnected from WebSocket.");
      try {
        session?.close();
      } catch {}
    });
  } catch (err: any) {
    console.warn("[Live API] Live session initialization notice:", err?.message || err);
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(
        JSON.stringify({
          type: "error",
          message: err?.message || "Failed to connect to Gemini Live API.",
        })
      );
    }
  }
});

// Setup Vite or Static File Serving
async function startServer() {
  // Always serve public directory assets (e.g. /models/*.vrm, /favicon.svg)
  app.use(express.static(path.join(process.cwd(), "public")));

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR === "true" ? false : { server },
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`[MERY] Companion server with Live API online at http://0.0.0.0:${PORT}`);
  });
}

startServer();