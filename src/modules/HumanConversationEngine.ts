import {
  ConversationState,
  EmotionType,
  HumanConversationConfig,
  ResponseDecisionMode,
  TurnTakingAnalysis,
  AcousticSignals,
} from '../types';
import { stateManager } from './StateManager';

// Linguistic patterns for incomplete thoughts (English & Gujarati / Kathiyawadi)
const TRAILING_CONJUNCTIONS = [
  'and',
  'but',
  'because',
  'so',
  'or',
  'although',
  'since',
  'while',
  'that',
  'if',
  'unless',
  'when',
  'where',
  'like',
  'plus',
  'whereas',
  'then',
  'though',
  'cause',
  // Gujarati & Kathiyawadi conjunctions & continuation connectors
  'ane',
  'pan',
  'etle',
  'kemke',
  'ke',
  'pachi',
  'pachhi',
  'ne',
  'to',
  'athi',
  'athva',
];

const TRAILING_PREPOSITIONS = [
  'to',
  'for',
  'with',
  'in',
  'on',
  'at',
  'about',
  'into',
  'through',
  'by',
  'of',
  'from',
  'toward',
  'towards',
  'as',
  // Gujarati postpositions
  'ma',
  'par',
  'mate',
  'thi',
];

const HESITATION_MARKERS = [
  'um',
  'uh',
  'er',
  'ah',
  'hmm',
  'well',
  'like',
  'you know',
  'i mean',
  'so basically',
  'kinda',
  'sort of',
  // Gujarati & Kathiyawadi hesitation markers
  'are',
  'are...',
  'jo ne',
  'etle...',
  'kahu to',
  'vichar karu chu',
];

const QUESTION_STARTERS = [
  'what',
  'why',
  'how',
  'when',
  'where',
  'who',
  'which',
  'can you',
  'could you',
  'would you',
  'will you',
  'do you',
  'did you',
  'are you',
  'is it',
  'is there',
  'have you',
  'should i',
  'should we',
  'mery',
  // Gujarati & Kathiyawadi question starters
  'shu',
  'su',
  'kem',
  'kya',
  'kyare',
  'kon',
  'ketla',
  'ketlu',
  'kevi',
  'kevo',
  'kevu',
  'samji',
  'a kem',
];

const SELF_TALK_PATTERNS = [
  /^let me see/i,
  /^wait a (sec|second|moment)/i,
  /^where did i/i,
  /^how do i/i,
  /^hmm+\b/i,
  /^uh+\b/i,
  /^now where was/i,
  /^just checking/i,
  /^never mind/i,
  /^scratch that/i,
];

const BACKCHANNEL_PALETTE = [
  'Hmm...',
  'Yeah...',
  'I see...',
  'Right...',
  'Oh...',
  'Interesting...',
  'Mhm...',
  'Got it...',
  'Totally...',
];

const GUJARATI_BACKCHANNEL_PALETTE = [
  'હંમ...',
  'હા...',
  'બરોબર...',
  'હું સાંભળું છું...',
  'સાચું...',
  'હા, કહો...',
  'હં...',
];

const REACTION_PALETTE: Record<string, string[]> = {
  surprised: ['No way...', 'Seriously?', 'Wait, what?', 'Wait... really?'],
  agreement: ['That actually makes sense.', 'Oh, I get it.', 'Exactly.'],
  supportive: ['Okay, keep going. I am listening.', 'Take your time, I am right here.'],
  playful: ["That's kind of funny.", 'Wait, for real?', 'Haha, no way.'],
  excited: ["That's awesome!", 'Oh nice!', 'Love that.'],
};

const GUJARATI_REACTION_PALETTE: Record<string, string[]> = {
  surprised: ['અરે વાહ, સાચે?', 'ખરેખર?', 'હેં! એવું?'],
  agreement: ['સાચી વાત છે.', 'એકદમ બરોબર.', 'સમજી ગઈ.'],
  supportive: ['હું સાંભળું છું, બોલો.', 'કોઈ વાંધો નહીં, શાંતિથી કહો.'],
  playful: ['હાહા, મજા આવી!', 'ખરેખર? મજાક કરે છે?'],
  excited: ['વાહ, જોરદાર!', 'અરે વાહ, મસ્ત!', 'બહુ સરસ!'],
};

export class HumanConversationEngine {
  private config: HumanConversationConfig = {
    enabled: true,
    backchannelEnabled: true,
    patienceLevel: 'natural',
    allowSilenceAsResponse: true,
    politeInterruptionEnabled: true,
  };

  private currentState: ConversationState = 'IDLE';
  private speechStartTime: number = 0;
  private lastSpeechEndTime: number = 0;
  private lastBackchannelTime: number = 0;
  private lastBackchannelUsed: string = '';
  private conversationHistory: Array<{ role: 'user' | 'mery'; text: string; timestamp: number }> = [];
  private activeTopic: string = '';
  private currentTurnBuffer: string = '';
  private dynamicTimer: any = null;
  private isEvaluating: boolean = false;

  private onDecisionCallback: ((analysis: TurnTakingAnalysis, fullText: string) => void) | null = null;
  private onBackchannelCallback: ((text: string) => void) | null = null;

  constructor() {
    try {
      if (typeof stateManager !== 'undefined' && stateManager) {
        stateManager.setConversationState('IDLE');
      }
    } catch {}
  }

  public setCallbacks(
    onDecision: (analysis: TurnTakingAnalysis, fullText: string) => void,
    onBackchannel: (text: string) => void
  ) {
    this.onDecisionCallback = onDecision;
    this.onBackchannelCallback = onBackchannel;
  }

  public updateConfig(updates: Partial<HumanConversationConfig>) {
    this.config = { ...this.config, ...updates };
  }

  public getConfig(): HumanConversationConfig {
    return { ...this.config };
  }

  public getCurrentState(): ConversationState {
    return this.currentState;
  }

  // Transitions the conversation state machine and updates StateManager
  public setState(nextState: ConversationState, analysis?: TurnTakingAnalysis) {
    if (this.currentState === nextState && !analysis) return;
    this.currentState = nextState;
    try {
      if (typeof stateManager !== 'undefined' && stateManager) {
        stateManager.setConversationState(nextState, analysis);
      }
    } catch {}
  }

  // Called when raw audio / speech recognition detects candidate text
  public handleInterimSpeech(candidateText: string) {
    const trimmed = candidateText.trim();
    if (!trimmed) return;

    if (this.currentState === 'IDLE' || this.currentState === 'SILENT') {
      this.setState('LISTENING');
    }

    if (this.currentState === 'LISTENING' || this.currentState === 'WAITING_FOR_CONTINUATION') {
      this.speechStartTime = Date.now();
      this.setState('USER_SPEAKING');
    }

    this.currentTurnBuffer = trimmed;

    // Reset dynamic pause timer based on linguistic cues
    this.scheduleTurnEvaluation(trimmed);
  }

  // Evaluates linguistic cues in the current utterance
  public analyzeLinguistics(text: string): {
    isMeaningful: boolean;
    isIncomplete: boolean;
    isQuestion: boolean;
    isSelfTalk: boolean;
    emotion: EmotionType;
    continuationProbability: number;
    recommendedPauseMs: number;
  } {
    const clean = text.trim().toLowerCase();
    const words = clean.split(/\s+/).filter(Boolean);

    // Filter out accidental noise, clicks, or short murmurs, while preserving meaningful short words in English, Gujarati & Kathiyawadi
    const meaningfulShortWords = new Set([
      'hi', 'no', 'ok', 'ha', 'na', 'hu', 'jo', 'ho', 'ya', 'ye', 'su', 'le', 'are', 'aa', 'ae', 'te', 'to', 'ne', 'chhe', 'che',
      'હા', 'ના', 'શું', 'કેમ', 'છો', 'હું', 'આ', 'તે', 'જો', 'લે', 'હો', 'ને', 'તો', 'છે', 'વાહ', 'અરે', 'હાં', 'બોલો'
    ]);
    const hasIndicChars = /[\u0A80-\u0AFF\u0900-\u097F]/.test(clean);
    if (words.length === 0 || (!hasIndicChars && words.length === 1 && words[0].length < 3 && !meaningfulShortWords.has(words[0]))) {
      return {
        isMeaningful: false,
        isIncomplete: false,
        isQuestion: false,
        isSelfTalk: false,
        emotion: 'warm',
        continuationProbability: 0,
        recommendedPauseMs: 1200,
      };
    }

    const lastWord = words[words.length - 1].replace(/[.,!?;:]/g, '');

    // Check trailing connectors (incomplete thoughts)
    const endsWithConjunction = TRAILING_CONJUNCTIONS.includes(lastWord);
    const endsWithPreposition = TRAILING_PREPOSITIONS.includes(lastWord);
    const endsWithHesitation = HESITATION_MARKERS.some((h) => clean.endsWith(h));
    const endsWithEllipsis = text.endsWith('...') || text.endsWith('—') || text.endsWith('-');

    const isIncomplete =
      endsWithConjunction ||
      endsWithPreposition ||
      endsWithHesitation ||
      endsWithEllipsis ||
      clean.includes('i was thinking that') ||
      clean.includes('what if we') ||
      clean.includes('could you possibly');

    // Check if it's a question
    const hasQuestionMark = text.includes('?');
    const firstTwo = words.slice(0, 2).join(' ');
    const startsWithQuestion =
      QUESTION_STARTERS.includes(words[0]) || QUESTION_STARTERS.some((q) => clean.startsWith(q));
    const isQuestion = hasQuestionMark || startsWithQuestion;

    // Check self-talk / thinking out loud
    const isSelfTalk = SELF_TALK_PATTERNS.some((p) => p.test(clean));

    // Estimate emotion
    let emotion: EmotionType = 'warm';
    if (/wow|amazing|awesome|yay|omg|unbelievable|great|love/i.test(clean)) {
      emotion = 'excited';
    } else if (/sad|tired|exhausted|depressed|unhappy|crying|lonely/i.test(clean)) {
      emotion = 'concerned';
    } else if (/frustrat|angry|annoyed|hate|broken|stupid|fail/i.test(clean)) {
      emotion = 'supportive';
    } else if (/curious|wonder|why|how|what if|explain/i.test(clean)) {
      emotion = 'curious';
    } else if (/joke|funny|lol|haha|lmao/i.test(clean)) {
      emotion = 'playful';
    }

    // Calculate continuation probability
    let continuationProbability = 0.2;
    if (isIncomplete) continuationProbability += 0.55;
    if (words.length < 4 && !isQuestion) continuationProbability += 0.25;
    if (isSelfTalk) continuationProbability += 0.35;
    continuationProbability = Math.min(0.95, Math.max(0.05, continuationProbability));

    // Dynamic silence threshold
    let recommendedPauseMs = 1400;
    if (this.config.patienceLevel === 'patient') recommendedPauseMs = 1800;
    if (this.config.patienceLevel === 'nimble') recommendedPauseMs = 1000;

    if (isIncomplete) {
      recommendedPauseMs += 1200; // Give human ample breathing room to finish the thought
    } else if (isQuestion && words.length >= 4) {
      recommendedPauseMs = Math.max(800, recommendedPauseMs - 300); // Crisp question expects responsive reply
    } else if (isSelfTalk) {
      recommendedPauseMs += 800;
    }

    return {
      isMeaningful: true,
      isIncomplete,
      isQuestion,
      isSelfTalk,
      emotion,
      continuationProbability,
      recommendedPauseMs,
    };
  }

  // Dynamic turn-taking timer
  private scheduleTurnEvaluation(text: string) {
    clearTimeout(this.dynamicTimer);

    const analysis = this.analyzeLinguistics(text);

    // If user paused briefly and thought seems incomplete, enter WAITING_FOR_CONTINUATION
    if (analysis.isIncomplete) {
      this.setState('WAITING_FOR_CONTINUATION');
    }

    this.dynamicTimer = setTimeout(() => {
      this.evaluateTurn(text, analysis);
    }, analysis.recommendedPauseMs);
  }

  // Response Decision Engine: Decides whether MERY should speak, backchannel, react, or stay silent
  private evaluateTurn(
    text: string,
    analysis: ReturnType<typeof this.analyzeLinguistics>
  ) {
    if (this.isEvaluating) return;
    this.isEvaluating = true;
    this.setState('EVALUATING_TURN');

    const clean = text.trim();
    this.currentTurnBuffer = '';
    const now = Date.now();
    const durationMs = this.speechStartTime ? now - this.speechStartTime : 1000;

    // 1. If not meaningful speech (coughs, microphone bumps, keyboard noise) -> SILENT
    if (!analysis.isMeaningful) {
      this.isEvaluating = false;
      this.setState('SILENT', {
        isMeaningfulSpeech: false,
        isThoughtIncomplete: false,
        continuationProbability: 0,
        silenceDurationMs: 0,
        detectedEmotion: 'warm',
        requiresResponse: false,
        decisionMode: 'SILENT',
        reason: 'Filtered background sound or non-speech noise.',
      });
      setTimeout(() => this.setState('LISTENING'), 1500);
      return;
    }

    // Compute acoustic & prosodic signals from spoken turn
    const words = clean.split(/\s+/).filter(Boolean);
    const speechTurnDurationMs = Math.max(800, durationMs);
    const durationMinutes = speechTurnDurationMs / 60000;
    const speakingRateWpm = Math.round(words.length / Math.max(0.015, durationMinutes));
    const hesitationMatches = clean.match(/\b(um|uh|er|ah|hmm|well|like|you know)\b/gi);
    const hesitationCount = hesitationMatches ? hesitationMatches.length : 0;
    const isAllCaps = clean.length > 5 && clean === clean.toUpperCase() && /[A-Z]/.test(clean);
    const exclamationCount = (clean.match(/!/g) || []).length;
    const estimatedVolume = isAllCaps || exclamationCount >= 2 ? 0.85 : words.length < 3 ? 0.35 : 0.55;
    const pitchContour: 'rising' | 'falling' | 'monotone' | 'varied' = analysis.isQuestion
      ? 'rising'
      : exclamationCount > 0
      ? 'varied'
      : 'falling';

    const acousticSignals: AcousticSignals = {
      volume: estimatedVolume,
      speakingRateWpm,
      pauseDurationMs: analysis.recommendedPauseMs,
      hesitationCount,
      pitchContour,
    };

    // 2. If the user was thinking out loud or self-talking without addressing MERY -> comfortable silence
    if (analysis.isSelfTalk && !clean.toLowerCase().includes('mery')) {
      this.isEvaluating = false;
      this.setState('SILENT', {
        isMeaningfulSpeech: true,
        isThoughtIncomplete: false,
        continuationProbability: 0.8,
        silenceDurationMs: 0,
        detectedEmotion: analysis.emotion,
        requiresResponse: false,
        decisionMode: 'SILENT',
        reason: 'User is self-talking or reflecting. Holding comfortable silence.',
        acousticSignals,
      });
      setTimeout(() => this.setState('LISTENING'), 2000);
      return;
    }

    // 3. Natural Backchanneling Check
    // If user has been speaking continuously for > 6 seconds and gave a pause, but is clearly in the middle of a story
    const timeSinceLastBackchannel = now - this.lastBackchannelTime;
    if (
      this.config.backchannelEnabled &&
      analysis.isIncomplete &&
      durationMs > 5000 &&
      timeSinceLastBackchannel > 12000
    ) {
      const backchannel = this.getUniqueBackchannel();
      this.lastBackchannelTime = now;
      this.isEvaluating = false;

      this.setState('BACKCHANNELING', {
        isMeaningfulSpeech: true,
        isThoughtIncomplete: true,
        continuationProbability: 0.85,
        silenceDurationMs: analysis.recommendedPauseMs,
        detectedEmotion: analysis.emotion,
        requiresResponse: false,
        decisionMode: 'BACKCHANNEL',
        backchannelText: backchannel,
        reason: 'User is storytelling; providing brief, supportive acknowledgment.',
        acousticSignals,
      });

      this.onBackchannelCallback?.(backchannel);
      setTimeout(() => this.setState('LISTENING'), 1200);
      return;
    }

    // 4. Short Reaction Check
    // E.g. "I just passed my exam!" -> "No way! Seriously?"
    if (
      (analysis.emotion === 'excited' || analysis.emotion === 'playful') &&
      clean.split(/\s+/).length < 7 &&
      !analysis.isQuestion
    ) {
      const isGujarati = stateManager.getLanguage() === 'gu-IN';
      const palette = isGujarati ? GUJARATI_REACTION_PALETTE : REACTION_PALETTE;
      const key = analysis.emotion === 'excited' ? 'excited' : 'playful';
      const reactions = palette[key] || palette.excited;
      const chosenReaction = reactions[Math.floor(Math.random() * reactions.length)];

      this.isEvaluating = false;
      const turnAnalysis: TurnTakingAnalysis = {
        isMeaningfulSpeech: true,
        isThoughtIncomplete: false,
        continuationProbability: 0.1,
        silenceDurationMs: analysis.recommendedPauseMs,
        detectedEmotion: analysis.emotion,
        requiresResponse: true,
        decisionMode: 'SHORT_REACTION',
        reactionText: chosenReaction,
        reason: 'Excited milestone shared; reacting naturally.',
        acousticSignals,
      };

      this.recordTurn('user', clean);
      this.setState('RESPONDING', turnAnalysis);
      this.onDecisionCallback?.(turnAnalysis, clean);
      return;
    }

    // 5. Normal Response / Follow-up
    // Direct question, explicit request, or finished statement expecting interaction
    const isDirectAddress = clean.toLowerCase().includes('mery') || clean.includes('મેરી') || clean.includes('મારી');
    const isConversationalInterjection = /^(ha|na|shu\??|su\??|samji\??|are\.\.\.?|hachu\??|barabar|theek|saras|jo|chal|hale|sachu)\b/i.test(clean) || /^(હા|ના|શું\??|સમજી\??|અરે|સાચું\??|બરાબર|ઠીક|સરસ|જો|ચાલ|હાલે|છે|કેમ)/.test(clean);
    const requiresResponse = analysis.isMeaningful;

    let decisionMode: ResponseDecisionMode = 'NORMAL_RESPONSE';
    if (!analysis.isQuestion && clean.length > 35 && Math.random() > 0.4) {
      decisionMode = 'FOLLOW_UP';
    }

    const turnAnalysis: TurnTakingAnalysis = {
      isMeaningfulSpeech: true,
      isThoughtIncomplete: analysis.isIncomplete,
      continuationProbability: analysis.continuationProbability,
      silenceDurationMs: analysis.recommendedPauseMs,
      detectedEmotion: analysis.emotion,
      requiresResponse,
      decisionMode,
      reason: analysis.isQuestion
        ? 'User asked a question expecting a direct answer.'
        : 'User finished complete thought expecting conversational response.',
      acousticSignals,
    };

    this.recordTurn('user', clean);
    this.isEvaluating = false;
    this.setState('RESPONDING', turnAnalysis);
    this.onDecisionCallback?.(turnAnalysis, clean);
  }

  // Returns a non-repetitive backchannel
  private getUniqueBackchannel(): string {
    const isGujarati = stateManager.getLanguage() === 'gu-IN';
    const sourcePalette = isGujarati ? GUJARATI_BACKCHANNEL_PALETTE : BACKCHANNEL_PALETTE;
    const candidates = sourcePalette.filter((b) => b !== this.lastBackchannelUsed);
    const chosen = candidates[Math.floor(Math.random() * candidates.length)] || (isGujarati ? 'હંમ...' : 'Hmm...');
    this.lastBackchannelUsed = chosen;
    return chosen;
  }

  // Records spoken turn to local conversational memory
  public recordTurn(role: 'user' | 'mery', text: string) {
    this.conversationHistory.push({ role, text, timestamp: Date.now() });
    if (this.conversationHistory.length > 30) {
      this.conversationHistory.shift();
    }
  }

  // Barge-in interruption handler
  public handleBargeIn() {
    clearTimeout(this.dynamicTimer);
    this.isEvaluating = false;
    this.setState('INTERRUPTED');
    setTimeout(() => {
      this.setState('LISTENING');
    }, 150);
  }

  // Reset conversation session
  public resetSession() {
    clearTimeout(this.dynamicTimer);
    this.isEvaluating = false;
    this.currentTurnBuffer = '';
    this.setState('IDLE');
  }
}

export const humanConversationEngine = new HumanConversationEngine();
