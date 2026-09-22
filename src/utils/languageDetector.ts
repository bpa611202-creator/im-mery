import { SpokenLanguage } from '../modules/StateManager';

export interface LanguageDetectionResult {
  detectedLang: SpokenLanguage;
  isConfidenceHigh: boolean;
  isMixed: boolean;
  reason: string;
}

// 1. Gujarati Script: Unicode block U+0A80 to U+0AFF
const GUJARATI_SCRIPT_REGEX = /[\u0A80-\u0AFF]/;

// 2. Hindi / Devanagari Script: Unicode block U+0900 to U+097F
const DEVANAGARI_SCRIPT_REGEX = /[\u0900-\u097F]/;

// 3. Distinctive Romanized Gujarati (Gujlish) vocabulary markers
const GUJARATI_PHONETIC_WORDS = new Set([
  'kem', 'cho', 'chho', 'chhe', 'che', 'majama', 'maza', 'maja',
  'tamaru', 'tamne', 'tame', 'tamaro', 'tamari',
  'maru', 'mane', 'hun', 'hoon', 'hu', 'ame', 'apde', 'aapde',
  'su', 'shu', 'shun', 'aaje', 'aapo', 'aapjo', 'kaley', 'kale',
  'nathi', 'sarass', 'saras', 'badhu', 'kyare', 'kya', 'kyathi',
  'avjo', 'aavjo', 'karo', 'kari', 'karu', 'karsho', 'karshe', 'dyo', 'diyo',
  'bol', 'bolo', 'vichar', 'kare', 'vaat', 'vaato', 'samachar', 'kaam',
  'pachi', 'pachhi', 'haji', 'pan', 'bhai', 'ben', 'ghare', 'kharab', 'saru',
  'jo', 'jovu', 'joiye', 'shikho', 'aavse', 'rakhjo', 'chalo', 'chal',
  'kai', 'kashu', 'thayu', 'thashe', 'thase', 'aavya', 'gya', 'jase',
  'leva', 'deva', 'levaanu', 'devaanu', 'barabar', 'chalse', 'kemne',
  'bapore', 'saanje', 'savare', 'raate', 'divas', 'varas', 'samay',
  'samjyo', 'samji', 'samjayo', 'gamtu', 'game', 'jevu', 'tevu',
  'ketla', 'ketli', 'ketlu', 'kevi', 'kevo', 'kevu', 'ha', 'na',
  'aavo', 'beso', 'khabar', 'potano', 'potani',
  // Colloquial & conversational Gujarati idioms
  'mare', 'avi', 'aavi', 'banavi', 'karvu', 'jem', 'are', 'bapa', 'bhura',
  'hal', 'hale', 'hali', 'le', 'tara', 'mara', 'ghano', 'ghani', 'ghana',
  'vahla', 'vahli', 'vhalo', 'motabhai', 'hachu', 'khotu', 'rakh', 'bes',
  'uth', 'etle', 'kemke', 'vando', 'vandho', 'bapore', 'lahva'
]);

// 4. Distinctive Romanized Hindi (Hinglish) vocabulary markers
const HINDI_PHONETIC_WORDS = new Set([
  'kaise', 'kaisa', 'kaisi', 'kya', 'kyun', 'kaha', 'kahan', 'kab',
  'batao', 'bataiye', 'suno', 'suniye', 'theek', 'accha', 'achha', 'achhi', 'achhe',
  'mera', 'meri', 'mere', 'aap', 'aapka', 'aapki', 'aapke',
  'tum', 'tumhara', 'tumhari', 'tumhe', 'tujhe', 'mujhe', 'hum', 'hamara',
  'hai', 'hain', 'ho', 'hoon', 'tha', 'thi', 'the',
  'raha', 'rahi', 'rahe', 'karna', 'kariye', 'kijiye',
  'namaste', 'namaskar', 'shukriya', 'dhanyawad', 'mausam', 'kripya',
  'kuch', 'kuchh', 'bahut', 'bohot', 'kaun', 'kidhar', 'idhar', 'udhar',
  'samajh', 'samjha', 'samjhi', 'pata', 'maloom', 'hoga', 'hogi', 'honge',
  'chahiye', 'sakta', 'sakti', 'sakte', 'aaj', 'kal', 'parson'
]);

// 5. Common English words
const ENGLISH_COMMON_WORDS = new Set([
  'what', 'how', 'why', 'where', 'when', 'who', 'which',
  'is', 'are', 'am', 'was', 'were', 'be', 'been', 'being',
  'the', 'a', 'an', 'and', 'or', 'but', 'for', 'with', 'about',
  'you', 'your', 'yours', 'my', 'mine', 'me', 'we', 'our', 'us',
  'they', 'them', 'their', 'he', 'him', 'his', 'she', 'her', 'it',
  'today', 'tomorrow', 'yesterday', 'weather', 'time', 'help', 'please',
  'thanks', 'thank', 'good', 'morning', 'evening', 'night', 'day',
  'tell', 'show', 'open', 'close', 'play', 'pause', 'stop', 'start',
  'can', 'could', 'would', 'should', 'will', 'do', 'does', 'did',
  'there', 'here', 'this', 'that', 'these', 'those',
  'schedule', 'reminder', 'system', 'status', 'calendar', 'turn', 'set',
  'hello', 'hi', 'hey'
]);

/**
 * Robust multilingual detector for Gujarati, Hindi, English, and Gujlish.
 * Adheres strictly to the user requirement:
 * - Gujarati speech must be treated as Gujarati.
 * - Hindi speech must be treated as Hindi.
 * - English speech must be treated as English.
 * - For mixed Gujarati-English speech, do not force English recognition if Gujarati is present/dominant.
 * - Do not randomly switch languages if input is ambiguous.
 */
export function detectSpokenLanguage(
  text: string,
  currentLanguage: SpokenLanguage = 'gu-IN'
): LanguageDetectionResult {
  const trimmed = (text || '').trim();

  if (!trimmed) {
    return {
      detectedLang: currentLanguage,
      isConfidenceHigh: false,
      isMixed: false,
      reason: 'Empty input, keeping active language',
    };
  }

  // 1. Direct Script Inspection
  if (GUJARATI_SCRIPT_REGEX.test(trimmed)) {
    return {
      detectedLang: 'gu-IN',
      isConfidenceHigh: true,
      isMixed: false,
      reason: 'Contains authentic Gujarati Unicode script',
    };
  }

  if (DEVANAGARI_SCRIPT_REGEX.test(trimmed)) {
    return {
      detectedLang: 'hi-IN',
      isConfidenceHigh: true,
      isMixed: false,
      reason: 'Contains authentic Devanagari (Hindi) Unicode script',
    };
  }

  // 2. Tokenize Latin text
  const clean = trimmed.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
  const tokens = clean.split(/\s+/).filter((t) => t.length > 0);

  if (tokens.length === 0) {
    return {
      detectedLang: currentLanguage,
      isConfidenceHigh: false,
      isMixed: false,
      reason: 'Non-alphabetic input, preserving active language',
    };
  }

  // Check multi-word Gujarati phrases
  const lowerTrimmed = trimmed.toLowerCase();
  const gujaratiPhraseMarkers = [
    'kem cho', 'kem chho', 'maja ma', 'majama', 'su kare che', 'shu kare che',
    'tamaru naam', 'maru naam', 'su plan che', 'shu plan che', 'weather kem che',
    'havaamaan kevu che', 'aaje su che', 'kaley meeting', 'aavo tame',
    // Spoken conversational patterns
    'mare avi', 'banavi che', 'kem karvu', 'mari jem', 'samji', 'a kem',
    'kai vandho nai', 'shu che', 'su che', 'hal hal', 'chal hal', 'hali ja',
    'shu vaat che', 'kashu nathi', 'badhu barabar', 'mare joiye', 'have bol',
    'bolo have', 'mara bhai', 'mari vaat', 'mane ke', 'tamne kahu', 'bol ne'
  ];
  for (const phrase of gujaratiPhraseMarkers) {
    if (lowerTrimmed.includes(phrase)) {
      return {
        detectedLang: 'gu-IN',
        isConfidenceHigh: true,
        isMixed: true,
        reason: `Matched Gujarati/Gujlish phrase: "${phrase}"`,
      };
    }
  }

  // Check multi-word Hindi phrases
  const hindiPhraseMarkers = [
    'kaise ho', 'kya hal hai', 'kya haal hai', 'kya kar rahe', 'aap kaise ho',
    'mera naam', 'aaj ka mausam', 'kaisa hai', 'batao mujhe', 'kya baat hai'
  ];
  for (const phrase of hindiPhraseMarkers) {
    if (lowerTrimmed.includes(phrase)) {
      return {
        detectedLang: 'hi-IN',
        isConfidenceHigh: true,
        isMixed: true,
        reason: `Matched Hindi/Hinglish phrase: "${phrase}"`,
      };
    }
  }

  let gujaratiScore = 0;
  let hindiScore = 0;
  let englishScore = 0;

  for (const token of tokens) {
    if (GUJARATI_PHONETIC_WORDS.has(token)) {
      // High weight for distinctive Gujarati phonetic markers
      gujaratiScore += 2.0;
    }
    if (HINDI_PHONETIC_WORDS.has(token)) {
      hindiScore += 2.0;
    }
    if (ENGLISH_COMMON_WORDS.has(token)) {
      englishScore += 1.0;
    }
  }

  // Gujlish Rule: In mixed Gujarati-English speech, if any Gujarati vocabulary or phrase markers
  // exist, treat it as Gujarati/Gujlish rather than defaulting to English!
  if (gujaratiScore > 0 && gujaratiScore >= hindiScore) {
    return {
      detectedLang: 'gu-IN',
      isConfidenceHigh: gujaratiScore >= 2,
      isMixed: englishScore > 0,
      reason: `Gujarati/Gujlish keywords detected (score: ${gujaratiScore}, en: ${englishScore})`,
    };
  }

  if (hindiScore > 0 && hindiScore > gujaratiScore) {
    return {
      detectedLang: 'hi-IN',
      isConfidenceHigh: hindiScore >= 2,
      isMixed: englishScore > 0,
      reason: `Hindi/Hinglish keywords detected (score: ${hindiScore}, en: ${englishScore})`,
    };
  }

  if (englishScore > 0 && gujaratiScore === 0 && hindiScore === 0) {
    // Strict rule: If active language is Gujarati, NEVER switch to English unless the user explicitly requests it
    const explicitEnglishRequest = /switch to english|speak in english|in english|talk in english/i.test(trimmed);
    if (currentLanguage === 'gu-IN' && !explicitEnglishRequest && englishScore < 4) {
      return {
        detectedLang: 'gu-IN',
        isConfidenceHigh: false,
        isMixed: true,
        reason: `Guarding Gujarati preference against transient English tokens (score: ${englishScore})`,
      };
    }
    return {
      detectedLang: 'en-IN',
      isConfidenceHigh: englishScore >= 1,
      isMixed: false,
      reason: `English keywords detected (score: ${englishScore})`,
    };
  }

  // If ambiguous (e.g. single generic word like "OK", "MERY", "Test"), stick to current active language!
  return {
    detectedLang: currentLanguage,
    isConfidenceHigh: false,
    isMixed: false,
    reason: `Ambiguous Latin input, preserving current language (${currentLanguage})`,
  };
}
