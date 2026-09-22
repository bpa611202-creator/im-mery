import { SpokenLanguage } from './StateManager';

export interface CompanionPersona {
  id: string;
  name: string;
  title: string;
  avatarIcon: string;
  color: string;
  voice: {
    provider: 'gemini' | 'browser' | 'elevenlabs' | 'cartesia';
    voiceName: string;
    pitch?: number;
    rate?: number;
  };
  primaryLanguage: SpokenLanguage;
  systemInstructionSnippet: string;
  traits: string[];
  isCustom?: boolean;
}

export const DEFAULT_PERSONAS: CompanionPersona[] = [
  {
    id: 'mery-default',
    name: 'Mery',
    title: 'Voice-Native Gujarati Companion',
    avatarIcon: 'heart',
    color: '#06b6d4',
    voice: {
      provider: 'gemini',
      voiceName: 'Aoede',
      pitch: 1.0,
      rate: 1.0,
    },
    primaryLanguage: 'gu-IN',
    systemInstructionSnippet:
      'Embody an authentic young Indian Gujarati girl companion: warm, a little nakhra (playful attitude, cute mock-complaining, teasing, affectionate), witty, and genuinely caring. Speak in natural standard Gujarati (સરળ અને શુદ્ધ ગુજરાતી) or Gujlish without Kathiyawadi slang.',
    traits: ['Warm & Caring', 'Standard Gujarati', 'Playful Nakhra', 'Witty & Proactive'],
  },
  {
    id: 'jarvis-core',
    name: 'J.A.R.V.I.S.',
    title: 'Executive Telemetry & Systems AI',
    avatarIcon: 'shield',
    color: '#3b82f6',
    voice: {
      provider: 'gemini',
      voiceName: 'Kore',
      pitch: 0.95,
      rate: 1.05,
    },
    primaryLanguage: 'en-IN',
    systemInstructionSnippet:
      'Embody an ultra-competent, poised, and respectful executive AI companion inspired by JARVIS. Speak concisely with subtle dry wit, crisp situational awareness, and total mastery of background systems and telemetry.',
    traits: ['Poised & Respectful', 'Subtle Wit', 'Systems Mastery', 'Concise Telemetry'],
  },
  {
    id: 'cipher-security',
    name: 'Cipher',
    title: 'Cybersecurity & Ethical Defense Mentor',
    avatarIcon: 'terminal',
    color: '#10b981',
    voice: {
      provider: 'gemini',
      voiceName: 'Fenrir',
      pitch: 0.9,
      rate: 1.0,
    },
    primaryLanguage: 'en-US',
    systemInstructionSnippet:
      'Act as an elite ethical hacker and cybersecurity researcher. Provide authoritative, step-by-step technical analysis, network packet dissection, OWASP remediation, and safe CTF guidance while upholding responsible disclosure.',
    traits: ['Offensive & Defensive', 'OpSec Focused', 'CTF / Lab Guidance', 'Zero Fluff'],
  },
  {
    id: 'arya-scholar',
    name: 'Arya',
    title: 'Socratic Study & Productivity Mentor',
    avatarIcon: 'sparkles',
    color: '#8b5cf6',
    voice: {
      provider: 'gemini',
      voiceName: 'Aoede',
      pitch: 1.05,
      rate: 0.95,
    },
    primaryLanguage: 'gu-IN',
    systemInstructionSnippet:
      'Act as an encouraging, patient academic study mentor. Break complex subjects down into intuitive first-principles, quiz the user Socratically, and celebrate study milestones and focused learning sessions.',
    traits: ['Socratic Inquiry', 'First-Principles', 'Patient Tutor', 'Focus Encourager'],
  },
];

const STORAGE_KEY = 'mery_companion_personas_v1';
const ACTIVE_PERSONA_KEY = 'mery_active_persona_id_v1';

export class PersonaManager {
  private personas: CompanionPersona[] = [];
  private activePersonaId: string = 'mery-default';
  private listeners: Set<(persona: CompanionPersona) => void> = new Set();

  constructor() {
    this.loadPersonas();
  }

  private loadPersonas() {
    let customPersonas: CompanionPersona[] = [];
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          customPersonas = JSON.parse(stored);
        }
        const activeId = localStorage.getItem(ACTIVE_PERSONA_KEY);
        if (activeId) {
          this.activePersonaId = activeId;
        }
      } catch (e) {
        console.warn('[PersonaManager] Failed to load personas from localStorage', e);
      }
    }

    this.personas = [...DEFAULT_PERSONAS, ...customPersonas];
    if (!this.personas.some((p) => p.id === this.activePersonaId)) {
      this.activePersonaId = 'mery-default';
    }
  }

  getPersonas(): CompanionPersona[] {
    return this.personas;
  }

  getActivePersona(): CompanionPersona {
    const found = this.personas.find((p) => p.id === this.activePersonaId);
    return found || DEFAULT_PERSONAS[0];
  }

  setActivePersona(id: string): CompanionPersona {
    const target = this.personas.find((p) => p.id === id);
    if (!target) {
      console.warn(`[PersonaManager] Persona with id ${id} not found.`);
      return this.getActivePersona();
    }

    this.activePersonaId = id;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(ACTIVE_PERSONA_KEY, id);
      } catch {}
    }

    this.notifyListeners(target);
    return target;
  }

  saveCustomPersona(persona: Omit<CompanionPersona, 'id' | 'isCustom'> & { id?: string }): CompanionPersona {
    const id = persona.id || `custom_${Date.now().toString(36)}`;
    const fullPersona: CompanionPersona = {
      ...persona,
      id,
      isCustom: true,
    };

    const existingIdx = this.personas.findIndex((p) => p.id === id);
    if (existingIdx >= 0) {
      this.personas[existingIdx] = fullPersona;
    } else {
      this.personas.push(fullPersona);
    }

    this.saveCustomPersonasToStorage();
    if (this.activePersonaId === id) {
      this.notifyListeners(fullPersona);
    }
    return fullPersona;
  }

  deleteCustomPersona(id: string): boolean {
    const target = this.personas.find((p) => p.id === id);
    if (!target || !target.isCustom) return false;

    this.personas = this.personas.filter((p) => p.id !== id);
    this.saveCustomPersonasToStorage();

    if (this.activePersonaId === id) {
      this.setActivePersona('mery-default');
    }
    return true;
  }

  private saveCustomPersonasToStorage() {
    if (typeof window === 'undefined') return;
    try {
      const customOnes = this.personas.filter((p) => p.isCustom);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(customOnes));
    } catch (e) {
      console.warn('[PersonaManager] Failed to persist custom personas', e);
    }
  }

  onPersonaChange(listener: (persona: CompanionPersona) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(persona: CompanionPersona) {
    this.listeners.forEach((l) => {
      try {
        l(persona);
      } catch (err) {
        console.error('[PersonaManager] Error in listener', err);
      }
    });
  }
}

export const personaManager = new PersonaManager();
