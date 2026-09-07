import { GoogleGenAI } from "@google/genai";

export class EmbeddingService {
  private geminiClient: GoogleGenAI | null = null;
  private quotaCooldownUntil: number = 0;

  private getClient(): GoogleGenAI | null {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey.trim() === "") {
      return null;
    }
    if (!this.geminiClient) {
      this.geminiClient = new GoogleGenAI({
        apiKey,
        httpOptions: { headers: { "User-Agent": "aistudio-build-memory" } },
      });
    }
    return this.geminiClient;
  }

  /**
   * Generates embedding vector for a given text.
   * If Gemini API is available, generates text-embedding-004 vector.
   * Falls back gracefully to deterministic n-gram semantic hash vector.
   */
  public async getEmbedding(text: string): Promise<{ vector: number[]; model: string }> {
    const clean = text.trim().toLowerCase();
    if (!clean) {
      return { vector: new Array(64).fill(0), model: "local-fallback-v1" };
    }

    const client = this.getClient();
    if (client && Date.now() >= this.quotaCooldownUntil) {
      try {
        // Enforce 2.5-second timeout to prevent cloud embedding from stalling requests
        const embedPromise = client.models.embedContent({
          model: "gemini-embedding-2-preview",
          contents: clean,
        });

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Embedding request timeout")), 2500)
        );

        const response: any = await Promise.race([embedPromise, timeoutPromise]);

        const values = response?.embedding?.values || response?.embeddings?.[0]?.values;
        if (Array.isArray(values) && values.length > 0) {
          return {
            vector: values,
            model: "gemini-embedding-2-preview",
          };
        }
      } catch (err: any) {
        const errMsg = String(err?.message || "");
        const isQuota = err?.status === 429 || errMsg.includes("429") || errMsg.includes("RESOURCE_EXHAUSTED") || errMsg.includes("quota");
        if (isQuota) {
          // Cooldown for 15 minutes before hitting cloud embedding again
          this.quotaCooldownUntil = Date.now() + 15 * 60 * 1000;
        }
        // Fallback to local semantic vectorizer silently without crashing
      }
    }

    return {
      vector: this.generateDeterministicVector(clean),
      model: "local-ngram-v1",
    };
  }

  /**
   * Generates a deterministic 64-dimensional semantic hash vector based on character n-grams and token roots.
   */
  public generateDeterministicVector(text: string): number[] {
    const dims = 64;
    const vector = new Array(dims).fill(0);
    const words = text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(Boolean);

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      // Hash full word
      let hash = 5381;
      for (let c = 0; c < word.length; c++) {
        hash = (hash * 33) ^ word.charCodeAt(c);
      }
      const idx = Math.abs(hash) % dims;
      vector[idx] += 1.0;

      // Bigram context
      if (i > 0) {
        const bigram = `${words[i - 1]}_${word}`;
        let biHash = 5381;
        for (let c = 0; c < bigram.length; c++) {
          biHash = (biHash * 31) ^ bigram.charCodeAt(c);
        }
        const biIdx = Math.abs(biHash) % dims;
        vector[biIdx] += 0.7;
      }
    }

    // L2 Normalize vector
    let norm = 0;
    for (let i = 0; i < dims; i++) {
      norm += vector[i] * vector[i];
    }
    norm = Math.sqrt(norm);
    if (norm > 0) {
      for (let i = 0; i < dims; i++) {
        vector[i] = vector[i] / norm;
      }
    }

    return vector;
  }

  /**
   * Calculates cosine similarity between two vectors.
   * Returns a number between -1.0 and 1.0 (normalized to 0.0 - 1.0 for ranking).
   */
  public cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (!vecA || !vecB || vecA.length === 0 || vecB.length === 0) {
      return 0;
    }

    // If dimension mismatch (e.g. one is 768 and one is 64), take min length
    const len = Math.min(vecA.length, vecB.length);
    let dot = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < len; i++) {
      dot += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    if (normA === 0 || normB === 0) {
      return 0;
    }

    const rawSim = dot / (Math.sqrt(normA) * Math.sqrt(normB));
    // Clamp to [0, 1]
    return Math.max(0, Math.min(1, (rawSim + 1) / 2));
  }
}

export const embeddingService = new EmbeddingService();
