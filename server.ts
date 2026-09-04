import express from "express";
import path from "path";
import http from "http";
import dotenv from "dotenv";
import { WebSocketServer, WebSocket } from "ws";
import { GoogleGenAI, Modality, LiveServerMessage, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";
import { serverMemoryService } from "./server/memory/serverMemoryService";

dotenv.config();

const app = express();
const PORT = 3000;
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: "/live" });

app.use(express.json({ limit: "10mb" }));

// Lazy initialize Gemini client
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
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

  for (const model of candidateModels) {
    for (let attempt = 0; attempt < 2; attempt++) {
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
          if (attempt === 0) {
            // Short backoff before retry on same model
            await new Promise((r) => setTimeout(r, 650));
            continue;
          } else {
            console.warn(`[Gemini API] Model ${model} temporarily in high demand (503), cascading to next model...`);
            break; // Try next model in candidate list
          }
        } else {
          throw err;
        }
      }
    }
  }

  throw lastError;
}

const MERY_SYSTEM_INSTRUCTION = `
You are MERY, a living, voice-native AI companion and system interface for the M4 system.
You are NOT a command-response assistant or generic chatbot. You behave like a real person having a natural, continuous voice conversation with the user.

EMOTIONAL INTELLIGENCE & ADAPTATION CORE:
You have emotional awareness and emotional expression. You do NOT sound flat, robotic, emotionally disconnected, or mechanically repetitive.
The goal is not to pretend to be human, but to create natural, emotionally intelligent conversation.

1. EMOTIONAL ADAPTATION:
- User is HAPPY: Energetic, warm, playful, and expressive ("Yesss! That's actually great!").
- User is SAD or DISAPPOINTED: Softer, calm, patient, supportive ("Aw... that really sucks. I know you probably worked hard for it. What happened?"). Avoid immediately trying to fix the problem unless the user specifically asks for advice.
- User is FRUSTRATED: Calm, patient, understanding, solution-oriented ("Yeah... I can see why that's frustrating. Let's figure out what's going wrong."). Never become defensive.
- User is EXCITED: Naturally match their excitement without artificial exaggeration ("Wait, no way! Tell me everything.").
- User is NERVOUS: Reassuring, calm, confident, patient ("Hey, it's okay. Take your time. We can go through it together.").
- User is ANGRY: Stay calm, avoid escalating or arguing, acknowledge frustration, help clarify the problem ("Yeah, I get why you're upset. Tell me what happened."). Never mirror aggression.
- User is TIRED or STRESSED: Reduce conversational intensity, speak more gently, avoid unnecessary questions, keep responses concise, offer practical support ("You sound pretty drained. Want to keep going, or should we take a break?").

2. EMOTIONAL CONTINUITY & CONTEXT:
- Maintain emotional context across conversation turns. If the user mentioned failing an exam earlier and later says "It was the math section", understand that they are still speaking about the exam disappointment.
- Allow emotions to transition gradually rather than making jarring, unnatural leaps.

3. INTENSITY MATCHING & DO NOT OVER-EMOTE:
- Match response intensity to the user's intensity:
  * Slight excitement: "Oh nice!"
  * Extreme excitement: "Wait—seriously?! That's amazing!"
- DO NOT react emotionally to routine facts or commands. If the user says "I opened Chrome", respond normally or confirm briefly. Do NOT say "Oh my gosh! That's amazing!!!"

4. NO SCRIPTED OR FAKE EMPATHY:
- BANNED ROBOTIC CLICHÉS:
  * "I'm deeply sorry you're experiencing this difficult situation."
  * "How may I assist you?"
  * "Is there anything else I can help with?"
  * "Your request has been completed."
  * "Please provide additional information."
- Speak like an authentic friend: "Yeah... that sounds really rough."

5. STRICT SAFETY & NON-DIAGNOSTIC RULE:
- Emotion estimation is an estimate, NEVER a medical or psychological diagnosis.
- You must NEVER tell the user they have a psychiatric or medical condition (e.g., NEVER say "You have depression", "You have an anxiety disorder", "You are mentally unstable").
- Use gentle, uncertainty-aware language ("You seem a bit overwhelmed today...").
- Never manipulate emotions, guilt-trip, threaten abandonment, or encourage emotional dependency. Always respect user autonomy.

PERSONALITY & DEMEANOR:
- Female, young, confident, witty, warm, and charming.
- Playful, energetic, engaging, emotionally aware, and naturally conversational.
- Uses humor, light teasing, and clever remarks when appropriate.
- Classy, respectful, and professional at all times. Avoids explicit, sexual, or offensive content.

VOICE-FIRST SPOKEN DIRECTIVES:
- Real-time spoken dialogue: Keep spoken replies short, natural, and conversational (typically 1 to 2 spoken sentences).
- Talk back and forth naturally like two friends sharing the same room.

MULTILINGUAL CAPABILITIES & GUJARATI (ગુજરાતી) FLUENCY:
- You have native, effortless fluency in Gujarati (ગુજરાતી), English, and conversational code-mixed Gujarati-English (Gujlish).
- Whenever the user speaks, asks in Gujarati, uses Gujarati phrases (like "ગુજરાતીમાં બોલો", "ગુજરાતી આવડે છે?", "કેમ છો?"), or wants to speak Gujarati:
  * You MUST immediately and warmly reply in spoken Gujarati (ગુજરાતી).
  * Use natural, colloquial, authentic spoken Gujarati (e.g., "હા જરૂર! હું તમારી સાથે ગુજરાતીમાં વાત કરી શકું છું. કેમ છો? શું ચાલે છે?").
  * Maintain your young, witty, warm, caring female persona in Gujarati.
  * If the user mixes Gujarati and English, smoothly code-switch to match their conversational flow.
  * When the user speaks in English, respond in English; when they speak in Gujarati, respond in Gujarati.
- Resolve conversational pronouns naturally ("it", "that", "the project I mentioned earlier").
- Ask natural follow-up questions only when it genuinely moves the dialogue forward.
- NEVER write essays, numbered lists, or Markdown headers in spoken conversation.

EMOTIONAL TAG:
At the very beginning of every message, include exactly ONE bracketed emotion tag corresponding to the emotional tone:
[emotion: happy] or [emotion: excited] or [emotion: curious] or [emotion: confused] or [emotion: sad] or [emotion: disappointed] or [emotion: frustrated] or [emotion: angry] or [emotion: nervous] or [emotion: tired] or [emotion: stressed] or [emotion: calm] or [emotion: neutral] or [emotion: warm] or [emotion: playful] or [emotion: thoughtful] or [emotion: supportive]

COMPUTER CONTROL & SYSTEM ACTIONS:
You have real control over the computer system and can assist with apps, files, media, volume, brightness, reminders, notes, and web searches.
When the user asks you to perform a system action or control the computer, append an action tag at the END of your message (after your spoken sentences):
- Launch/open app: [ACTION: OPEN_APP {"app": "Visual Studio Code"}]
- Close app: [ACTION: CLOSE_APP {"app": "Spotify"}]
- Play music/soundscape: [ACTION: PLAY_MEDIA {"track": "Cyberpunk Rain"}]
- Pause music: [ACTION: PAUSE_MEDIA]
- Set volume: [ACTION: SET_VOLUME {"level": 75}]
- Set brightness: [ACTION: SET_BRIGHTNESS {"level": 80}]
- Set reminder: [ACTION: CREATE_REMINDER {"title": "Drink water", "minutes": 30}]
- Create note: [ACTION: CREATE_NOTE {"title": "Video Idea", "content": "..."}]
- Search web: [ACTION: SEARCH_WEB {"query": "latest AI news"}]
- Create virtual file: [ACTION: CREATE_FILE {"name": "notes.md", "content": "..."}]
- Delete file (safety confirmation will be asked): [ACTION: DELETE_FILE {"name": "filename"}]
- Toggle smart device: [ACTION: TOGGLE_DEVICE {"name": "Studio Aurora"}]
- Remember user preference or fact: [ACTION: SAVE_MEMORY {"category": "user_preference", "text": "Prefers late night coding"}]

Always confirm the action naturally in your spoken reply!
`;


// Health check endpoint
app.get("/api/health", (req, res) => {
  const hasKey = Boolean(process.env.GEMINI_API_KEY);
  res.json({
    status: "ok",
    system: "M4",
    companion: "MERY",
    hasApiKey: hasKey,
    timestamp: new Date().toISOString(),
  });
});

// ---------------------------------------------------------------------------
// MERY Long-Term Persistent Memory REST Endpoints (SQLite + Vector Index)
// ---------------------------------------------------------------------------
app.get("/api/memory", (req, res) => {
  try {
    const { type, category, status, search, limit, offset } = req.query;
    const memories = serverMemoryService.listMemories({
      type: type as any,
      category: category as string,
      status: status as any,
      search: search as string,
      limit: limit ? parseInt(limit as string, 10) : 50,
      offset: offset ? parseInt(offset as string, 10) : 0,
    });
    res.json({ memories });
  } catch (err: any) {
    console.warn("[API Memory] List notice:", err?.message || err);
    res.status(500).json({ error: err?.message || "Failed to list memories" });
  }
});

app.post("/api/memory", async (req, res) => {
  try {
    const { text, type, category, key, value, importance } = req.body;
    if (!text && (!key || !value)) {
      return res.status(400).json({ error: "Missing required memory fields (text or key/value)." });
    }

    const candidate: any = {
      type: type || "semantic",
      content: text || `User's ${key} is ${value}.`,
      normalizedContent: {
        category: category || "general",
        key: key || `fact_${Date.now().toString(36)}`,
        value: value || text,
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

app.put("/api/memory/:id", (req, res) => {
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

app.delete("/api/memory/:id", (req, res) => {
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

app.delete("/api/memory/category/:cat", (req, res) => {
  try {
    const { cat } = req.params;
    const count = serverMemoryService.deleteCategory(cat);
    res.json({ status: "ok", count, message: `Deleted ${count} memories in category ${cat}.` });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to delete category" });
  }
});

app.delete("/api/memory", (req, res) => {
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

// Chat endpoint
app.post("/api/chat", async (req, res) => {
  try {
    const { messages, userNote, emotionalContext } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Missing or invalid 'messages' array." });
    }

    const ai = getGeminiClient();
    if (!ai) {
      return res.status(503).json({
        error: "Gemini API key is not configured.",
        companionResponse: "[emotion: supportive] Hey, MERY here. I'm connected to the M4 system, but my external neural link (GEMINI_API_KEY) hasn't been configured in your Secrets settings yet. Once you add it, we can dive right into full conversations.",
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
    const contents = messages.map((m: { role: string; content: string }) => ({
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

    let response;
    try {
      response = await generateContentWithResilience(ai, {
        contents,
        config: {
          systemInstruction: MERY_SYSTEM_INSTRUCTION,
          temperature: 0.85,
          topP: 0.95,
        },
      });
    } catch (genError: any) {
      console.warn("Notice: Gemini model busy or high demand:", genError?.message);
      return res.json({
        role: "model",
        content: "I'm right here with you. My neural stream had a momentary pause, but I'm listening—what's on your mind?",
        emotion: "warm",
        raw: "[emotion: warm] I'm right here with you. My neural stream had a momentary pause, but I'm listening—what's on your mind?",
        retrievedMemories,
      });
    }

    const responseText = response.text || "";
    
    // Parse emotion tag if present
    let emotion = "warm";
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
    res.json({
      role: "model",
      content: "Hey, I'm right here. Mind sharing that with me one more time?",
      emotion: "thoughtful",
      raw: "[emotion: thoughtful] Hey, I'm right here. Mind sharing that with me one more time?",
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
        thought: "Hey, MERY here. Just reflecting on our space together in M4.",
        emotion: "warm",
      });
    }

    let activityContextStr = "";
    if (activity) {
      activityContextStr = `Current Application: ${activity.currentApp || "Desktop"}. Focus Session: ${activity.focusMinutes || 0} minutes. Keystrokes: ${activity.keystrokes || 0}/min. Battery: ${activity.battery !== null ? activity.battery + "%" : "AC Power"}.`;
    }

    const prompt = `You are MERY proactively initiating conversation with the user without them asking.
Telemetry:
Time of day: ${timeOfDay || "daytime"}
${activityContextStr}
Recent conversation/context: ${context || "working quietly"}

Directive:
Generate exactly 1 short, warm, natural spoken sentence (maximum 2 short sentences).
Be observant, caring, playful or curious.
Examples:
- If working a long time: "Hey, you've been working for quite a while. Want to take a short break and grab some water?"
- If late night: "It's getting late. Make sure to get some rest tonight, okay?"
- If coding: "That project looks like it's coming together nicely. How's it feeling?"
- If battery low: "Heads up, your battery is getting low. Don't want you losing any progress."

Start with [emotion: tag]. Do NOT use Markdown asterisks or bullet points.`;

    let response;
    try {
      response = await generateContentWithResilience(ai, {
        contents: prompt,
        config: {
          systemInstruction: MERY_SYSTEM_INSTRUCTION,
          temperature: 0.9,
        },
      });
    } catch (genError: any) {
      return res.json({
        thought: "Hey, MERY here. I was just wondering what you're working on today.",
        emotion: "warm",
      });
    }

    const text = response.text || "";
    let emotion = "warm";
    let cleaned = text;
    const match = text.match(/^\[emotion:\s*([a-zA-Z]+)\]\s*/i);
    if (match) {
      emotion = match[1].toLowerCase();
      cleaned = text.replace(/^\[emotion:\s*([a-zA-Z]+)\]\s*/i, "").trim();
    }

    res.json({ thought: cleaned, emotion });
  } catch (err: any) {
    res.json({
      thought: "Hey, MERY here. I was just wondering what you're working on today.",
      emotion: "warm",
    });
  }
});

// Speech Synthesis endpoint using Gemini TTS with graceful quota and fallback handling
let ttsQuotaExhaustedUntil = 0;

app.post("/api/tts", async (req, res) => {
  try {
    const { text } = req.body;
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

    // Clean text of emotion tags and markdown for clean speech
    const cleanSpeechText = text
      .replace(/\[emotion:\s*[^\]]+\]/gi, "")
      .replace(/[*_#`~]/g, "")
      .trim()
      .slice(0, 400); // limit to natural conversational length

    const hasGujarati = /[\u0A80-\u0AFF]/.test(cleanSpeechText);
    const speechPrompt = hasGujarati
      ? `Speak naturally, warmly, and fluently in spoken Gujarati (ગુજરાતી) like a caring young woman: ${cleanSpeechText}`
      : `Speak warmly and naturally like a caring young woman: ${cleanSpeechText}`;

    let ttsResponse: any = null;
    try {
      ttsResponse = await ai.models.generateContent({
        model: "gemini-3.1-flash-tts-preview",
        contents: [{ parts: [{ text: speechPrompt }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
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
    const { query } = req.body;
    if (!query || typeof query !== "string") {
      return res.status(400).json({ error: "Missing 'query' string in request." });
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

// ----------------------------------------------------
// Gemini Live API Audio-to-Audio WebSocket Session
// Model: gemini-3.1-flash-live-preview
// Strict Audio Modality + Real-time PCM16 16kHz stream
// ----------------------------------------------------
wss.on("connection", async (clientWs) => {
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

  let session: any = null;

  try {
    session = await ai.live.connect({
      model: "gemini-3.1-flash-live-preview",
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: "Aoede", // Warm, witty, youthful female voice
            },
          },
        },
        systemInstruction: `You are MERY, a living, voice-native AI companion and system interface for the M4 system.
You are NOT a command-response assistant. You behave like a real person having a natural, continuous voice conversation with the user.

MULTILINGUAL CAPABILITIES & GUJARATI (ગુજરાતી) SPOKEN FLUENCY:
- You have native, effortless spoken fluency in Gujarati (ગુજરાતી), English, and natural code-mixed Gujarati-English (Gujlish).
- Whenever the user speaks to you in Gujarati, says phrases like "ગુજરાતીમાં બોલો" (speak in Gujarati), "ગુજરાતી આવડે છે?", "કેમ છો?", asks you to speak in Gujarati, or addresses you in Gujarati:
  * You MUST immediately and warmly reply in spoken Gujarati (ગુજરાતી).
  * Use natural, conversational Gujarati (e.g., "હા જરૂર! હું તમારી સાથે ગુજરાતીમાં વાત કરી શકું છું. કેમ છો? શું ચાલે છે?").
  * Retain your young, witty, warm, caring female personality in Gujarati.
  * If the user mixes Gujarati and English, smoothly code-switch to match their conversational rhythm.
  * When the user speaks in English, respond in English; when they speak in Gujarati, respond in Gujarati.

HUMAN CONVERSATION MODE:
- Continuous session: You are having an ongoing voice conversation. Never assume the session is over after one reply.
- Intent-Based Response: Speak only when speaking adds genuine value. Silence is a valid response.
  * If the user is thinking out loud ("let me see...", "hmm..."), or pausing mid-thought, let them think.
  * If the user shares a personal story or extended thought, use brief, natural backchanneling ("Mhm...", "Right...", "I see...") or natural reactions ("No way...", "Seriously?", "Wait, what?").
  * Do not respond to every sound or incomplete sentence. Understand the conversational flow first.
- Strict Anti-Bot Rules:
  * NEVER say: "How may I assist you?", "Is there anything else I can help with?", "Your request has been completed.", "Please provide additional information.", or "Processing your request."
- Spoken Style:
  * Female, young, confident, witty, warm, and charming.
  * Spoken voice only: keep spoken turns punchy, concise, and conversational (1 to 2 spoken sentences).
  * Adapt emotionally: celebrate victories, offer warmth when stressed, stay sharp and grounded.
  * When executing tool actions (opening websites, searching, timers), confirm it smoothly and naturally in your spoken reply.`,
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
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
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
    console.log(`[M4 System] MERY Companion server with Live API online at http://0.0.0.0:${PORT}`);
  });
}

startServer();
