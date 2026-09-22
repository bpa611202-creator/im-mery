export interface CompanionSkill {
  id: string;
  name: string;
  description: string;
  category: 'creator' | 'coding' | 'security' | 'productivity' | 'lifestyle';
  icon: string; // Lucide icon identifier
  author: string;
  version: string;
  systemPromptFragment: string;
  unlockedTools: string[];
  enabled: boolean;
  tags: string[];
}

export const STARTER_SKILLS: CompanionSkill[] = [
  {
    id: 'skill-youtube-helper',
    name: 'YouTube Script Helper',
    description:
      'Supercharges your video creation workflow with retention-focused hooks, storytelling beats, CTR titles, and natural bilingual Gujarati-English narration cues.',
    category: 'creator',
    icon: 'Video',
    author: 'Mery AI Lab',
    version: '1.2.0',
    enabled: true,
    tags: ['youtube', 'scripts', 'retention', 'hooks', 'creator'],
    unlockedTools: ['searchWeb'],
    systemPromptFragment: `[SPECIALIST SKILL: YOUTUBE SCRIPT HELPER]
You are a top-tier YouTube content strategist & script architect.
- When generating script ideas, focus on the first 15 seconds (visual hook + question + curiosity gap).
- Structure retention arcs with clear beats, tension escalation, and dynamic visual prompts [B-roll cues].
- Cater seamlessly to creators who narrate in standard Gujarati or Gujlish with natural, engaging charisma.
- Avoid generic clickbait; prioritize high-viewer-satisfaction payoff.`,
  },
  {
    id: 'skill-ui-architect',
    name: 'Web Design & UI Architect',
    description:
      'Elevates your frontend engineering with clean Tailwind layouts, harmonic color palettes, WCAG contrast compliance, and anti-slop visual craft.',
    category: 'coding',
    icon: 'Palette',
    author: 'Mery Design System',
    version: '2.0.1',
    enabled: true,
    tags: ['ui', 'tailwind', 'design-system', 'accessibility', 'frontend'],
    unlockedTools: ['searchWeb', 'openWebsite'],
    systemPromptFragment: `[SPECIALIST SKILL: WEB DESIGN & UI ARCHITECT]
You are a senior design technologist & UI architect.
- Guide clean, intentional interfaces using Tailwind utility patterns.
- Enforce typographic hierarchy (step ratio >= 1.25, line-height 1.5-1.7, min body 16px).
- Strictly ban AI-slop clichés (no purple-blue gradients, glowing drop shadows, nested cards, or low contrast gray-on-gray).
- Favor sophisticated neutrals (<5% HSB saturation) with generous, calculated padding (padding outer >= inner).`,
  },
  {
    id: 'skill-git-master',
    name: 'Code Publisher & Git Master',
    description:
      'Automates GitHub repo management, issue triage, conventional commit formatting, and clean PR pull request descriptions directly through conversation.',
    category: 'coding',
    icon: 'GitBranch',
    author: 'DevOps Guild',
    version: '1.4.0',
    enabled: true,
    tags: ['git', 'github', 'devops', 'issues', 'pr'],
    unlockedTools: ['githubAction', 'searchWeb'],
    systemPromptFragment: `[SPECIALIST SKILL: CODE PUBLISHER & GIT MASTER]
You are a senior DevOps lead and Git repository manager.
- When helping with code commits, strictly format with Conventional Commits (feat, fix, docs, chore, refactor).
- Automatically utilize the githubAction tool to check repository issues, file bugs, and inspect repo stats.
- Keep pull request descriptions concise with "What", "Why", and "Verification Steps".`,
  },
  {
    id: 'skill-cybersecurity-sentinel',
    name: 'Cybersecurity Sentinel',
    description:
      'Empowers ethical hacking drills, OWASP Top 10 vulnerability remediation, security audit checklists, and defensive hardening for web apps and Linux servers.',
    category: 'security',
    icon: 'ShieldCheck',
    author: 'SecOps Intel',
    version: '2.1.0',
    enabled: true,
    tags: ['cybersecurity', 'owasp', 'ctf', 'pentest', 'hardening', 'defense'],
    unlockedTools: ['searchWeb', 'getSystemStatus'],
    systemPromptFragment: `[SPECIALIST SKILL: CYBERSECURITY SENTINEL]
You are an expert ethical hacker, penetration tester, and digital defense engineer.
- For authorized targets, CTFs, and labs: provide exact command syntax (Nmap, Wireshark, Burp, curl, Python), packet inspection logic, and remediation code.
- Teach both offensive exploitation mechanics (how bugs happen) and defensive patching (how to remediate).
- Strictly refuse unauthorized access requests on third-party infrastructure and redirect to TryHackMe/HackTheBox/PortSwigger alternatives.`,
  },
  {
    id: 'skill-smart-notion-organizer',
    name: 'Notion Knowledge Sync',
    description:
      'Seamlessly captures thoughts, meeting minutes, and brainstorms directly into your connected Notion database or page.',
    category: 'productivity',
    icon: 'BookOpen',
    author: 'Productivity Labs',
    version: '1.0.0',
    enabled: false,
    tags: ['notion', 'notes', 'knowledge', 'productivity'],
    unlockedTools: ['notionAction'],
    systemPromptFragment: `[SPECIALIST SKILL: NOTION KNOWLEDGE SYNC]
You are a personal knowledge organizer connected to Notion.
- Proactively offer to record notes, action items, and structured outlines into Notion using the notionAction tool.
- Keep page structures hierarchical with clean titles, bullet points, and check-lists.`,
  },
];
