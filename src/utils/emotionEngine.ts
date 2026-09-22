import {
  AcousticSignals,
  ChatMessage,
  EmotionalResponseStrategy,
  EmotionState,
  EmotionTrend,
  EmotionType,
  UserEmotionState,
  UserEmotionType,
  VoiceModulationConfig,
} from '../types';
import { emotionVoiceMapper } from './emotionVoiceMapper';

export const ALL_EMOTION_STATES: UserEmotionType[] = [
  'happy',
  'excited',
  'curious',
  'confused',
  'sad',
  'disappointed',
  'frustrated',
  'angry',
  'nervous',
  'tired',
  'stressed',
  'calm',
  'neutral',
];

const INITIAL_POSSIBLE_EMOTIONS: Record<UserEmotionType, number> = {
  happy: 0.08,
  excited: 0.07,
  curious: 0.15,
  confused: 0.05,
  sad: 0.02,
  disappointed: 0.02,
  frustrated: 0.03,
  angry: 0.01,
  nervous: 0.03,
  tired: 0.04,
  stressed: 0.04,
  calm: 0.25,
  neutral: 0.21,
};

export const INITIAL_USER_EMOTION: UserEmotionState = {
  primary: 'neutral',
  confidence: 0.65,
  intensity: 0.20,
  duration: 0,
  previousEmotion: null,
  trend: 'stable',
  possibleEmotions: { ...INITIAL_POSSIBLE_EMOTIONS },
  topicContext: undefined,
  userConcern: undefined,
  timestamp: Date.now(),
};

export const INITIAL_EMOTION_STATE: EmotionState = {
  happiness: 80,
  curiosity: 70,
  excitement: 75,
  concern: 10,
  confidence: 90,
  empathy: 92,
  dominant: 'warm',
  userEmotion: { ...INITIAL_USER_EMOTION },
  responseStrategy: 'NEUTRAL',
  voiceModulation: emotionVoiceMapper.mapEmotionToVoice(INITIAL_USER_EMOTION, 'NEUTRAL'),
};

/**
 * EMOTIONAL INTELLIGENCE SYSTEM — MERY
 *
 * Implements:
 * 1. Multimodal Emotion Detection (Acoustics + Linguistics + Context + History)
 * 2. 13 Explicit Emotion States with Probabilistic Distribution & Confidence
 * 3. Emotional Intensity (0.0 to 1.0) & Dynamic Matching
 * 4. Emotional Adaptation & Decoupled Emotional Response Strategies
 * 5. Emotional Continuity & Topic Tracking across multi-turn sessions
 * 6. Emotional Transitions (gradual, natural, never abrupt)
 * 7. Provider-Independent Emotion-to-Voice Mapper
 * 8. Strict Anti-Diagnosis & Autonomy-Preserving Safety Layer
 */
export class EmotionEngine {
  private state: EmotionState = { ...INITIAL_EMOTION_STATE };
  private listeners: ((state: EmotionState) => void)[] = [];
  private sessionStartTime: number = Date.now();
  private lastEmotionChangeTime: number = Date.now();

  constructor() {
    try {
      const saved = localStorage.getItem('mery_emotion_state');
      if (saved) {
        const parsed = JSON.parse(saved);
        this.state = {
          ...INITIAL_EMOTION_STATE,
          ...parsed,
          userEmotion: parsed.userEmotion ? { ...INITIAL_USER_EMOTION, ...parsed.userEmotion } : { ...INITIAL_USER_EMOTION },
        };
      }
    } catch {}
  }

  public getState(): EmotionState {
    return { ...this.state };
  }

  public getUserEmotion(): UserEmotionState {
    return { ...(this.state.userEmotion || INITIAL_USER_EMOTION) };
  }

  public getResponseStrategy(): EmotionalResponseStrategy {
    return this.state.responseStrategy || 'NEUTRAL';
  }

  public getVoiceModulation(): VoiceModulationConfig {
    return (
      this.state.voiceModulation ||
      emotionVoiceMapper.mapEmotionToVoice(this.getUserEmotion(), this.getResponseStrategy())
    );
  }

  public subscribe(listener: (state: EmotionState) => void): () => void {
    this.listeners.push(listener);
    listener(this.getState());
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    try {
      localStorage.setItem('mery_emotion_state', JSON.stringify(this.state));
    } catch {}
    this.listeners.forEach((l) => l(this.getState()));
  }

  /**
   * 1. MULTIMODAL EMOTION DETECTION
   * Combines acoustic cues, linguistic analysis, syntax, and conversational history.
   * Probabilistic: never decides on a single signal alone.
   */
  public processMultimodalInput(
    text: string,
    acoustic?: AcousticSignals,
    conversationHistory?: ChatMessage[],
    activityContext?: { timeOfDay?: string; focusMinutes?: number }
  ): {
    userEmotion: UserEmotionState;
    strategy: EmotionalResponseStrategy;
    voiceModulation: VoiceModulationConfig;
  } {
    const lower = text.toLowerCase().trim();
    const prevEmotionState = this.getUserEmotion();
    const prevPrimary = prevEmotionState.primary;
    const prevIntensity = prevEmotionState.intensity;

    // 1. Linguistic & Lexical Scoring (Scores accumulate across dimensions)
    const rawScores: Record<UserEmotionType, number> = {
      happy: 0.05,
      excited: 0.05,
      curious: 0.10,
      confused: 0.05,
      sad: 0.02,
      disappointed: 0.02,
      frustrated: 0.03,
      angry: 0.01,
      nervous: 0.03,
      tired: 0.04,
      stressed: 0.04,
      calm: 0.15,
      neutral: 0.20,
    };

    // Linguistic triggers
    const hasExcitedWords = /\b(awesome|amazing|fantastic|love|yay|incredible|shipped|passed|solved|unbelievable|huge)\b/i.test(lower);
    const hasHappyWords = /\b(great|happy|good|cool|nice|glad|sweet|fun|haha|lol)\b/i.test(lower);
    const hasCuriousWords = /\b(why|how|what if|wonder|curious|explore|could we|idea|concept)\b/i.test(lower);
    const hasConfusedWords = /\b(confused|lost|dont understand|makes no sense|huh|what does that mean|strange|weird)\b/i.test(lower);
    const hasSadWords = /\b(sad|depressed|heartbroken|crying|awful|miserable|lonely|hurt|grief)\b/i.test(lower);
    const hasDisappointedWords = /\b(disappointed|failed|rejected|didn't get|lost out|bummer|sucks|ruined)\b/i.test(lower);
    const hasFrustratedWords = /\b(frustrated|annoyed|stuck|broken|not working|error|bug|again|waste of time|hate this)\b/i.test(lower);
    const hasAngryWords = /\b(angry|furious|pissed|mad|ridiculous|unacceptable|dammit|stupid)\b/i.test(lower);
    const hasNervousWords = /\b(nervous|anxious|scared|worried|dreading|panic|interview|presentation|stage fright)\b/i.test(lower);
    const hasTiredWords = /\b(tired|exhausted|drained|sleepy|bed|long day|burnout|need a break)\b/i.test(lower);
    const hasStressedWords = /\b(stressed|overwhelmed|too much|deadline|pressure|swamped|cant keep up)\b/i.test(lower);
    const hasCalmWords = /\b(chilling|relaxed|peaceful|all good|smooth|easy|steady)\b/i.test(lower);

    // Apply linguistic weights
    if (hasExcitedWords) { rawScores.excited += 0.55; rawScores.happy += 0.25; }
    if (hasHappyWords) { rawScores.happy += 0.45; rawScores.excited += 0.15; }
    if (hasCuriousWords) { rawScores.curious += 0.50; }
    if (hasConfusedWords) { rawScores.confused += 0.50; rawScores.curious += 0.15; }
    if (hasSadWords) { rawScores.sad += 0.55; rawScores.disappointed += 0.20; }
    if (hasDisappointedWords) { rawScores.disappointed += 0.55; rawScores.sad += 0.20; }
    if (hasFrustratedWords) { rawScores.frustrated += 0.55; rawScores.stressed += 0.15; }
    if (hasAngryWords) { rawScores.angry += 0.60; rawScores.frustrated += 0.25; }
    if (hasNervousWords) { rawScores.nervous += 0.55; rawScores.stressed += 0.20; }
    if (hasTiredWords) { rawScores.tired += 0.55; rawScores.calm += 0.10; }
    if (hasStressedWords) { rawScores.stressed += 0.55; rawScores.nervous += 0.15; }
    if (hasCalmWords) { rawScores.calm += 0.50; rawScores.neutral += 0.15; }

    // 2. Syntactic & Typographic cues
    const exclamationCount = (text.match(/!/g) || []).length;
    const questionCount = (text.match(/\?/g) || []).length;
    const isAllCaps = text.length > 5 && text === text.toUpperCase() && /[A-Z]/.test(text);

    if (exclamationCount >= 2 || isAllCaps) {
      // Exclamation can mean excitement or anger/frustration depending on context
      if (hasAngryWords || hasFrustratedWords) {
        rawScores.angry += 0.30;
        rawScores.frustrated += 0.25;
      } else {
        rawScores.excited += 0.35;
        rawScores.happy += 0.20;
      }
    }
    if (questionCount >= 2) {
      rawScores.curious += 0.25;
      rawScores.confused += 0.25;
    }

    // 3. Acoustic Signal Integration (never single-signal deterministic)
    if (acoustic) {
      const { volume, speakingRateWpm, pauseDurationMs, hesitationCount } = acoustic;

      // High volume + fast speech + exclamation marks
      if (volume && volume > 0.75) {
        if (speakingRateWpm && speakingRateWpm > 160) {
          rawScores.excited += 0.20;
          if (hasFrustratedWords || hasAngryWords) rawScores.angry += 0.20;
        }
      }

      // Soft volume + slow speech + long pauses -> tired or sad or calm
      if (volume && volume < 0.25) {
        if (speakingRateWpm && speakingRateWpm < 110) {
          rawScores.tired += 0.20;
          rawScores.sad += 0.15;
          rawScores.calm += 0.15;
        }
      }

      // Frequent hesitations ("um", "uh") or pauses -> nervous, confused, or thoughtful
      if ((hesitationCount && hesitationCount >= 2) || (pauseDurationMs && pauseDurationMs > 800)) {
        rawScores.nervous += 0.20;
        rawScores.confused += 0.20;
      }
    }

    // 4. Activity & Time Context
    if (activityContext?.focusMinutes && activityContext.focusMinutes > 90) {
      rawScores.tired += 0.25;
      rawScores.stressed += 0.15;
    }
    if (activityContext?.timeOfDay === 'late_night') {
      rawScores.tired += 0.20;
      rawScores.calm += 0.10;
    }

    // 5. Emotional Continuity & Topic Tracking (Section 6 & 8)
    let topicContext = prevEmotionState.topicContext;
    let userConcern = prevEmotionState.userConcern;

    // Detect new topic / concern or persist existing
    if (/exam|test|grade|sat|quiz|math/i.test(lower)) {
      topicContext = 'exam/academic';
      if (/fail|suck|flunk|blown|ruined/i.test(lower)) userConcern = 'failed exam or assessment';
    } else if (/interview|job|offer|resume|career/i.test(lower)) {
      topicContext = 'career/job';
      if (/reject|denied|nervous/i.test(lower)) userConcern = 'job application or interview';
    } else if (/bug|deploy|code|crash|server|production/i.test(lower)) {
      topicContext = 'technical/software';
      if (/broken|down|fire|urgent/i.test(lower)) userConcern = 'system breakdown or urgent bug';
    } else if (/date|relationship|friend|argument|fight/i.test(lower)) {
      topicContext = 'personal/relationships';
    }

    // If referring back with pronouns ("it", "that", "the section", "the issue"), carry emotional continuity
    const hasReferentialPronoun = /\b(it|that|this|the section|the part|they|he|she)\b/i.test(lower);
    if (hasReferentialPronoun && topicContext && prevPrimary !== 'neutral') {
      // Prioritize continuity from previous state
      rawScores[prevPrimary] += 0.35;
    }

    // 6. Routine Command / Neutral Filter (Section 16: Do Not Over-Emote!)
    const isRoutineCommand =
      /^(open|launch|check|what time|search|close|toggle|status|battery|weather|turn on|turn off)\b/i.test(lower) ||
      lower === 'i opened chrome' ||
      lower === 'okay' ||
      lower === 'ok' ||
      lower === 'got it';

    if (isRoutineCommand && !hasExcitedWords && !hasSadWords && !hasFrustratedWords) {
      rawScores.neutral += 0.80;
      rawScores.calm += 0.40;
    }

    // 7. Softmax / Normalization for Probability Distribution
    const expScores: Record<UserEmotionType, number> = {} as any;
    let sumExp = 0;
    for (const emo of ALL_EMOTION_STATES) {
      expScores[emo] = Math.exp(rawScores[emo]);
      sumExp += expScores[emo];
    }

    const possibleEmotions: Record<UserEmotionType, number> = {} as any;
    let primaryEmotion: UserEmotionType = 'neutral';
    let highestProb = 0;

    for (const emo of ALL_EMOTION_STATES) {
      const prob = Number((expScores[emo] / sumExp).toFixed(3));
      possibleEmotions[emo] = prob;
      if (prob > highestProb) {
        highestProb = prob;
        primaryEmotion = emo;
      }
    }

    // 8. Confidence & Intensity Calculation
    // Confidence is probability margin over next best
    const sortedProbs = Object.entries(possibleEmotions).sort((a, b) => b[1] - a[1]);
    const topProb = sortedProbs[0][1];
    const secondProb = sortedProbs[1][1];
    const confidence = Number(Math.min(0.98, Math.max(0.30, topProb * 1.25)).toFixed(2));

    // Calculate intensity: 0.0 (Neutral) -> 0.2 (Slight) -> 0.5 (Moderate) -> 0.8 (Strong) -> 1.0 (Very Strong)
    let intensity = 0.30;
    if (primaryEmotion === 'neutral' || isRoutineCommand) {
      intensity = 0.10;
    } else {
      let lexicalIntensityBonus = 0;
      if (exclamationCount >= 2 || isAllCaps) lexicalIntensityBonus += 0.25;
      if (/\b(extremely|super|so much|unbelievable|completely|totally|furious|terrible)\b/i.test(lower)) {
        lexicalIntensityBonus += 0.30;
      }
      intensity = Math.min(1.0, Math.max(0.20, topProb * 0.7 + lexicalIntensityBonus));
    }
    intensity = Number(intensity.toFixed(2));

    // 9. Emotional Transitions (Section 7: Gradual Transitions)
    // Avoid jarring sudden switches unless the user explicitly pivots
    if (prevPrimary === 'sad' && primaryEmotion === 'excited' && !hasExcitedWords) {
      primaryEmotion = 'calm';
      intensity = 0.30;
    }

    // 10. Duration & Trend Tracking
    const now = Date.now();
    let duration = prevEmotionState.duration;
    let trend: EmotionTrend = 'stable';

    if (primaryEmotion === prevPrimary) {
      duration += Math.round((now - (prevEmotionState.timestamp || now)) / 1000);
      if (intensity > prevIntensity + 0.12) trend = 'increasing';
      else if (intensity < prevIntensity - 0.12) trend = 'decreasing';
      else trend = 'stable';
    } else {
      duration = 0;
      this.lastEmotionChangeTime = now;
      trend = 'stable';
    }

    const updatedUserEmotion: UserEmotionState = {
      primary: primaryEmotion,
      confidence,
      intensity,
      duration,
      previousEmotion: prevPrimary,
      trend,
      possibleEmotions,
      topicContext,
      userConcern,
      timestamp: now,
    };

    // 11. Emotional Response Decision Layer (Section 15)
    const strategy = this.determineResponseStrategy(updatedUserEmotion, isRoutineCommand);

    // 12. Voice Modulation Config (Section 10 & 11)
    const voiceModulation = emotionVoiceMapper.mapEmotionToVoice(updatedUserEmotion, strategy);

    // Update internal state
    this.state.userEmotion = updatedUserEmotion;
    this.state.responseStrategy = strategy;
    this.state.voiceModulation = voiceModulation;
    this.state.dominant = this.mapUserEmotionToMeryDominant(primaryEmotion, strategy);

    // Synchronize traditional vector bars for visual radar
    this.syncVectorMetrics(updatedUserEmotion);

    this.notify();

    return {
      userEmotion: updatedUserEmotion,
      strategy,
      voiceModulation,
    };
  }

  /**
   * 15. EMOTIONAL RESPONSE DECISION LAYER
   * Decides MERY's conversational stance based on the user's emotional state,
   * intensity, confidence, and context.
   */
  private determineResponseStrategy(
    userEmotion: UserEmotionState,
    isRoutineCommand: boolean
  ): EmotionalResponseStrategy {
    if (isRoutineCommand) {
      return 'NEUTRAL';
    }

    const { primary, intensity, confidence } = userEmotion;

    // If confidence is low, don't overreact or label emotions as fact
    if (confidence < 0.35) {
      return 'NEUTRAL';
    }

    switch (primary) {
      case 'happy':
        return intensity > 0.6 ? 'PLAYFUL' : 'SUPPORTIVE';

      case 'excited':
        return 'EXCITED';

      case 'curious':
        return 'CURIOUS';

      case 'confused':
        return 'SOLUTION_FOCUSED';

      case 'sad':
      case 'disappointed':
        // Softer, calm, patient, supportive. Don't rush to fix unless requested.
        return intensity > 0.6 ? 'EMPATHETIC' : 'SUPPORTIVE';

      case 'frustrated':
        // Calm, patient, understanding, solution-oriented. Never defensive.
        return 'SOLUTION_FOCUSED';

      case 'angry':
        // Stay calm, avoid escalating, never argue, acknowledge frustration.
        return 'CALM';

      case 'nervous':
        // Reassuring, calm, confident, patient.
        return 'REASSURING';

      case 'tired':
      case 'stressed':
        // Reduce conversational intensity, speak gently, concise, offer practical break.
        return 'CALM';

      case 'calm':
        return 'CALM';

      case 'neutral':
      default:
        return 'NEUTRAL';
    }
  }

  private mapUserEmotionToMeryDominant(
    userEmotion: UserEmotionType,
    strategy: EmotionalResponseStrategy
  ): EmotionType {
    switch (strategy) {
      case 'EXCITED':
        return 'excited';
      case 'PLAYFUL':
        return 'playful';
      case 'SUPPORTIVE':
      case 'EMPATHETIC':
        return 'supportive';
      case 'CALM':
        return userEmotion === 'tired' || userEmotion === 'stressed' ? 'thoughtful' : 'warm';
      case 'REASSURING':
        return 'warm';
      case 'CURIOUS':
        return 'curious';
      case 'SOLUTION_FOCUSED':
        return 'thoughtful';
      case 'NEUTRAL':
      default:
        return 'warm';
    }
  }

  private syncVectorMetrics(userEmotion: UserEmotionState) {
    const { primary, intensity } = userEmotion;

    switch (primary) {
      case 'excited':
        this.state.excitement = Math.min(99, Math.round(70 + intensity * 28));
        this.state.happiness = Math.min(96, Math.round(65 + intensity * 30));
        this.state.concern = Math.max(5, Math.round(15 - intensity * 10));
        break;
      case 'happy':
        this.state.happiness = Math.min(98, Math.round(75 + intensity * 22));
        this.state.excitement = Math.min(90, Math.round(60 + intensity * 28));
        break;
      case 'curious':
      case 'confused':
        this.state.curiosity = Math.min(98, Math.round(70 + intensity * 26));
        break;
      case 'sad':
      case 'disappointed':
        this.state.concern = Math.min(90, Math.round(50 + intensity * 38));
        this.state.empathy = Math.min(99, Math.round(85 + intensity * 14));
        this.state.excitement = Math.max(10, Math.round(30 - intensity * 20));
        break;
      case 'frustrated':
      case 'angry':
        this.state.concern = Math.min(85, Math.round(40 + intensity * 40));
        this.state.empathy = Math.min(98, Math.round(80 + intensity * 18));
        this.state.confidence = Math.min(95, Math.round(85 + intensity * 10));
        break;
      case 'tired':
      case 'stressed':
      case 'nervous':
        this.state.empathy = Math.min(99, Math.round(88 + intensity * 11));
        this.state.concern = Math.min(85, Math.round(45 + intensity * 35));
        break;
      case 'calm':
      case 'neutral':
      default:
        this.state.happiness = 80;
        this.state.curiosity = 70;
        this.state.excitement = 65;
        this.state.concern = 10;
        this.state.empathy = 90;
        break;
    }
  }

  /**
   * Compatibility helper for existing code calling processInput(text, context)
   */
  public processInput(text: string, context?: { timeOfDay?: string; focusMinutes?: number }) {
    return this.processMultimodalInput(text, undefined, undefined, context);
  }

  public setDominantEmotion(emotion: EmotionType) {
    this.state.dominant = emotion;
    this.notify();
  }

  public updateEmotionVector(
    updates: Partial<Record<'happiness' | 'curiosity' | 'excitement' | 'empathy' | 'confidence' | 'concern', number>>
  ) {
    Object.assign(this.state, updates);
    this.notify();
  }

  public getVocalParameters() {
    const mod = this.getVoiceModulation();
    return {
      pitch: mod.pitch,
      rate: mod.rate,
    };
  }

  public getNakhraProfile(): NakhraProfile {
    return calculateNakhraProfile(this.state);
  }
}

export const emotionEngine = new EmotionEngine();

export interface NakhraProfile {
  level: number; // 0 to 100
  tier: 'sweet_caring' | 'gentle_charm' | 'playful_banter' | 'cheeky_nakhra' | 'full_sassy_attitude';
  tierLabel: string;
  attitudeLabel: string;
  subtitle: string;
  gujaratiRemark: string;
  playfulness: number; // 0 to 100
  stubbornness: number; // 0 to 100
  affection: number; // 0 to 100
  badgeColor: string;
  barColor: string;
  glowColor: string;
}

export function calculateNakhraProfile(state?: EmotionState): NakhraProfile {
  const st = state || emotionEngine.getState();
  const dominant = st.dominant || 'warm';
  const happiness = st.happiness ?? 75;
  const excitement = st.excitement ?? 65;
  const confidence = st.confidence ?? 85;
  const empathy = st.empathy ?? 85;
  const concern = st.concern ?? 10;

  // Base playfulness & stubbornness based on current dominant emotional state
  let basePlayfulness = 35;
  let baseStubbornness = 20;

  switch (dominant) {
    case 'playful':
      basePlayfulness = 88;
      baseStubbornness = 82;
      break;
    case 'excited':
      basePlayfulness = 76;
      baseStubbornness = 55;
      break;
    case 'curious':
      basePlayfulness = 60;
      baseStubbornness = 48;
      break;
    case 'happy':
      basePlayfulness = 65;
      baseStubbornness = 35;
      break;
    case 'thoughtful':
      basePlayfulness = 35;
      baseStubbornness = 50;
      break;
    case 'confused':
      basePlayfulness = 42;
      baseStubbornness = 40;
      break;
    case 'warm':
      basePlayfulness = 38;
      baseStubbornness = 22;
      break;
    case 'calm':
    case 'neutral':
      basePlayfulness = 25;
      baseStubbornness = 18;
      break;
    case 'supportive':
      basePlayfulness = 18;
      baseStubbornness = 10;
      break;
    case 'concerned':
    case 'sad':
      basePlayfulness = 5;
      baseStubbornness = 5;
      break;
    default:
      basePlayfulness = 35;
      baseStubbornness = 25;
      break;
  }

  // Modulate based on live vector metrics
  const happyBonus = (happiness - 70) * 0.25;
  const excitedBonus = (excitement - 60) * 0.3;
  const confidenceBonus = (confidence - 80) * 0.2;
  const concernDampener = (concern - 10) * 0.55; // When user is stressed or concerned, MERY drops attitude for true caring

  const playfulness = Math.max(0, Math.min(100, Math.round(basePlayfulness + happyBonus + excitedBonus - concernDampener)));
  const stubbornness = Math.max(0, Math.min(100, Math.round(baseStubbornness + confidenceBonus * 0.8 + (dominant === 'playful' ? 10 : 0) - concernDampener)));
  const affection = Math.max(10, Math.min(100, Math.round(empathy * 0.7 + (100 - stubbornness) * 0.3)));

  // Weighted attitude score
  const level = Math.max(0, Math.min(100, Math.round(playfulness * 0.55 + stubbornness * 0.45)));

  let tier: NakhraProfile['tier'] = 'playful_banter';
  let tierLabel = 'Playful Banter';
  let attitudeLabel = 'Cheeky & Teasing';
  let subtitle = 'Light Gujarati banter, teasing remarks and playful smiles';
  let gujaratiRemark = 'હી લો, હવે તમે મારી સાથે આવું કરો છો? મજાક તો જુઓ એમની!';
  let badgeColor = 'bg-fuchsia-900/60 text-fuchsia-300 border-fuchsia-700/50';
  let barColor = 'from-pink-500 via-purple-500 to-fuchsia-400';
  let glowColor = 'rgba(236, 72, 153, 0.4)';

  if (level >= 80) {
    tier = 'full_sassy_attitude';
    tierLabel = 'Full Nakhra Mode';
    attitudeLabel = 'ચોખ્ખા નખરાં (High Sass)';
    subtitle = 'Mock-complaining, cute stubbornness, and theatrical pout';
    gujaratiRemark = 'હવે જોજો તમે! મારી વાત નહીં માનો તો હું બોલવાની જ નથી! 💅';
    badgeColor = 'bg-rose-900/60 text-rose-300 border-rose-700/50';
    barColor = 'from-rose-500 via-pink-500 to-fuchsia-500';
    glowColor = 'rgba(244, 63, 94, 0.5)';
  } else if (level >= 60) {
    tier = 'cheeky_nakhra';
    tierLabel = 'Nakhrali & Sassy';
    attitudeLabel = 'મીઠો મિજાજ (Sassy Banter)';
    subtitle = 'Active mock-sulking, witty comebacks, and animated hands';
    gujaratiRemark = 'હાય રે, મારું સાંભળે કોણ? તમારી મનમાની જ ચલાવવી છે ને!';
    badgeColor = 'bg-pink-900/60 text-pink-300 border-pink-700/50';
    barColor = 'from-pink-500 to-rose-400';
    glowColor = 'rgba(236, 72, 153, 0.4)';
  } else if (level >= 40) {
    tier = 'playful_banter';
    tierLabel = 'Playful & Witty';
    attitudeLabel = 'મજાકિયો મૂડ (Playful)';
    subtitle = 'Light Gujarati banter, teasing remarks and playful smiles';
    gujaratiRemark = 'હી લો, હવે તમે મારી સાથે આવું કરો છો? મજાક તો જુઓ એમની!';
    badgeColor = 'bg-fuchsia-900/60 text-fuchsia-300 border-fuchsia-700/50';
    barColor = 'from-purple-500 to-pink-500';
    glowColor = 'rgba(168, 85, 247, 0.4)';
  } else if (level >= 20) {
    tier = 'gentle_charm';
    tierLabel = 'Sweet & Mild';
    attitudeLabel = 'શાંત & પ્રેમાળ (Gentle Charm)';
    subtitle = 'Warm companionship with gentle smiling and calm presence';
    gujaratiRemark = 'સારું ચાલો, માની ગઈ... પણ હંમેશા તમારી મનમાની નહીં ચાલે હોં!';
    badgeColor = 'bg-emerald-900/60 text-emerald-300 border-emerald-700/50';
    barColor = 'from-emerald-500 to-teal-400';
    glowColor = 'rgba(16, 185, 129, 0.4)';
  } else {
    tier = 'sweet_caring';
    tierLabel = 'Pure Caring & Empathy';
    attitudeLabel = 'સહાનુભૂતિ & કાળજી (Zero Attitude)';
    subtitle = 'Complete tenderness, listening attentively without any teasing';
    gujaratiRemark = 'અરે ના રે ના, કોઈ નખરાં નથી... હું સાચે જ તમારી સાથે છું ને!';
    badgeColor = 'bg-cyan-900/60 text-cyan-300 border-cyan-700/50';
    barColor = 'from-cyan-500 to-blue-400';
    glowColor = 'rgba(6, 182, 212, 0.4)';
  }

  return {
    level,
    tier,
    tierLabel,
    attitudeLabel,
    subtitle,
    gujaratiRemark,
    playfulness,
    stubbornness,
    affection,
    badgeColor,
    barColor,
    glowColor,
  };
}

export interface EmotionMeta {
  fullName: string;
  shortLabel: string;
  description: string;
  color: string;
}

export const EMOTION_META: Record<EmotionType, EmotionMeta> = {
  warm: {
    fullName: 'Warm & Caring',
    shortLabel: 'Warm',
    description: 'Friendly, empathetic & close connection',
    color: '#00ff66',
  },
  playful: {
    fullName: 'Playful & Witty',
    shortLabel: 'Playful',
    description: 'Banter, light humor & high spirits',
    color: '#f472b6',
  },
  curious: {
    fullName: 'Curious & Inquisitive',
    shortLabel: 'Curious',
    description: 'Eager to explore, learn & discover',
    color: '#38bdf8',
  },
  thoughtful: {
    fullName: 'Focused & Analytical',
    shortLabel: 'Thoughtful',
    description: 'Deep reasoning, security & contemplation',
    color: '#818cf8',
  },
  supportive: {
    fullName: 'Supportive & Encouraging',
    shortLabel: 'Supportive',
    description: 'High empathy, reassuring & protective',
    color: '#34d399',
  },
  excited: {
    fullName: 'Excited & Passionate',
    shortLabel: 'Excited',
    description: 'Energetic, fast pace & elevated pitch',
    color: '#c084fc',
  },
  concerned: {
    fullName: 'Attentive & Caring',
    shortLabel: 'Attentive',
    description: 'Notices user strain & offers gentle presence',
    color: '#fb7185',
  },
  happy: {
    fullName: 'Happy & Cheerful',
    shortLabel: 'Happy',
    description: 'Bright, joyful & upbeat frequency',
    color: '#facc15',
  },
  calm: {
    fullName: 'Calm & Grounded',
    shortLabel: 'Calm',
    description: 'Peaceful cadence, relaxed & centered',
    color: '#2dd4bf',
  },
  neutral: {
    fullName: 'Balanced & Attentive',
    shortLabel: 'Neutral',
    description: 'Poised, ready & listening actively',
    color: '#94a3b8',
  },
  inspired: {
    fullName: 'Inspired & Creative',
    shortLabel: 'Inspired',
    description: 'Visionary, enthusiastic & imaginative',
    color: '#a78bfa',
  },
  confused: {
    fullName: 'Inquisitive & Clarifying',
    shortLabel: 'Confused',
    description: 'Seeking mutual clarity & alignment',
    color: '#38bdf8',
  },
  sad: {
    fullName: 'Gentle & Comforting',
    shortLabel: 'Sad',
    description: 'Soft delivery, compassionate presence',
    color: '#60a5fa',
  },
  disappointed: {
    fullName: 'Understanding & Reassuring',
    shortLabel: 'Disappointed',
    description: 'Validating feelings with patient support',
    color: '#fb923c',
  },
  frustrated: {
    fullName: 'Patient & Grounded',
    shortLabel: 'Frustrated',
    description: 'Steady composure, de-escalating & calming',
    color: '#f87171',
  },
  angry: {
    fullName: 'Calm & Composed',
    shortLabel: 'Angry',
    description: 'Peaceful demeanor & grounded respect',
    color: '#ef4444',
  },
  nervous: {
    fullName: 'Reassuring & Steady',
    shortLabel: 'Nervous',
    description: 'Warm reassurance & calm anchor',
    color: '#a855f7',
  },
  tired: {
    fullName: 'Gentle & Restful',
    shortLabel: 'Tired',
    description: 'Softer pace, gentle & undemanding',
    color: '#94a3b8',
  },
  stressed: {
    fullName: 'Calming & De-stressing',
    shortLabel: 'Stressed',
    description: 'Slow pacing, grounding comfort & breathing space',
    color: '#fb923c',
  },
};

export function getEmotionFullName(emotion?: EmotionType | string): string {
  if (!emotion) return 'Warm & Caring';
  const meta = EMOTION_META[emotion as EmotionType];
  return meta ? meta.fullName : emotion.charAt(0).toUpperCase() + emotion.slice(1);
}

export function getEmotionMeta(emotion?: EmotionType | string): EmotionMeta {
  if (!emotion) return EMOTION_META.warm;
  return (
    EMOTION_META[emotion as EmotionType] || {
      fullName: emotion.charAt(0).toUpperCase() + emotion.slice(1),
      shortLabel: emotion,
      description: 'Current emotional frequency',
      color: '#00ff66',
    }
  );
}
