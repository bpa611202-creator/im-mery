import { CompanionSkill, STARTER_SKILLS } from './skillsData';

const STORAGE_KEY = 'mery_installed_skills_v1';

class SkillManager {
  private skills: CompanionSkill[] = [];
  private listeners: Array<() => void> = [];

  constructor() {
    this.loadSkills();
  }

  private loadSkills() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Merge with starter skills to guarantee new fields and updates
          this.skills = STARTER_SKILLS.map((starter) => {
            const savedSkill = parsed.find((p: any) => p.id === starter.id);
            return savedSkill ? { ...starter, enabled: Boolean(savedSkill.enabled) } : starter;
          });
          return;
        }
      }
    } catch (e) {
      console.warn('[SkillManager] Notice parsing saved skills:', e);
    }
    this.skills = [...STARTER_SKILLS];
  }

  private saveSkills() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.skills));
      this.notifyListeners();
    } catch (e) {
      console.warn('[SkillManager] Notice saving skills:', e);
    }
  }

  public getAllSkills(): CompanionSkill[] {
    return [...this.skills];
  }

  public getEnabledSkills(): CompanionSkill[] {
    return this.skills.filter((s) => s.enabled);
  }

  public toggleSkill(id: string): boolean {
    const skill = this.skills.find((s) => s.id === id);
    if (!skill) return false;
    skill.enabled = !skill.enabled;
    this.saveSkills();
    return skill.enabled;
  }

  public setSkillEnabled(id: string, enabled: boolean): void {
    const skill = this.skills.find((s) => s.id === id);
    if (!skill) return;
    skill.enabled = enabled;
    this.saveSkills();
  }

  public getMergedPromptFragment(): string {
    const enabled = this.getEnabledSkills();
    if (enabled.length === 0) return '';
    return enabled.map((s) => s.systemPromptFragment).join('\n\n');
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach((l) => l());
  }
}

export const skillManager = new SkillManager();
