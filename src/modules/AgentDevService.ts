import {
  AgentArchetype,
  AgentBlueprint,
  AgentExecutionTrace,
  AgentExecutionStep,
  SwarmSubAgent,
} from '../types';
import { screenShareService } from './ScreenShareService';
import { memoryService } from '../memory/MemoryService';

export const DEFAULT_AGENT_BLUEPRINTS: AgentBlueprint[] = [
  {
    id: 'agent_mery_reflex',
    name: 'MERY Reflex Companion',
    archetype: 'REACTIVE_CONVERSATIONAL',
    tagline: 'Empathetic, zero-latency conversational AI partner',
    description:
      'Fast, direct-reflex agent prioritizing warmth, vocal continuity, real-time backchanneling, and emotional resonance.',
    systemInstruction:
      'You are MERY, a voice-native AI companion and system interface. Provide immediate, warm, and natural responses without robotic hesitation. Stay attuned to the user’s emotion and keep interactions concise and engaging.',
    model: 'gemini-2.5-flash',
    temperature: 0.85,
    maxSteps: 1,
    allowedTools: ['searchWeb', 'getWeather', 'openWebsite'],
    memoryRecall: true,
    visionEnabled: true,
  },
  {
    id: 'agent_react_reasoner',
    name: 'ReAct Cognitive Reasoner',
    archetype: 'REACT_REASONING',
    tagline: 'Explicit Thought ➔ Action ➔ Observation cycle',
    description:
      'Employs the classic Reasoning + Acting paradigm. Breaks complex problems down, maintains an auditable scratchpad, and verifies intermediate findings before formulating conclusions.',
    systemInstruction:
      'You are an analytical ReAct Reasoner. Before answering, articulate your cognitive step: Thought -> Action -> Observation -> Reflection -> Final Answer. Verify all premises before committing to facts.',
    model: 'gemini-2.5-flash',
    temperature: 0.4,
    maxSteps: 6,
    allowedTools: ['searchWeb', 'getWeather', 'openWebsite', 'getSystemStatus'],
    memoryRecall: true,
    visionEnabled: true,
  },
  {
    id: 'agent_autonomous_goal',
    name: 'Autonomous Task Strategist',
    archetype: 'AUTONOMOUS_GOAL_DIRECTED',
    tagline: 'Hierarchical task planning & self-directed completion',
    description:
      'Accepts high-level objectives, generates a structured plan with ordered milestones, autonomously executes sub-tasks sequentially, self-evaluates completion criteria, and generates an executive report.',
    systemInstruction:
      'You are an Autonomous Goal-Directed Agent. Upon receiving an objective: 1) Formulate a milestone-driven plan. 2) Sequentially execute each sub-task. 3) Validate deliverables against acceptance criteria. 4) Synthesize results into an actionable executive summary.',
    model: 'gemini-2.5-flash',
    temperature: 0.5,
    maxSteps: 8,
    allowedTools: ['searchWeb', 'openWebsite', 'getWeather', 'controlSystem', 'setSystemReminder'],
    memoryRecall: true,
    visionEnabled: false,
  },
  {
    id: 'agent_tool_specialist',
    name: 'Cybernetic Tool Operator',
    archetype: 'TOOL_CALLING_SYSTEM',
    tagline: 'Dynamic browser navigation, system automation & API calls',
    description:
      'Specialized in interface operations, operating system commands, real-time web telemetry, and reliable multi-tool parameter orchestration.',
    systemInstruction:
      'You are an expert Tool Calling & System Automation Agent. Your primary mode of problem solving is invoking external tools, parsing JSON responses, retrying failed calls, and chaining outputs to complete workflows.',
    model: 'gemini-2.5-flash',
    temperature: 0.3,
    maxSteps: 10,
    allowedTools: [
      'openWebsite',
      'searchWeb',
      'getWeather',
      'controlSystem',
      'setSystemReminder',
      'getSystemStatus',
      'toggleTheme',
    ],
    memoryRecall: false,
    visionEnabled: true,
  },
  {
    id: 'agent_multi_swarm',
    name: 'Autonomous Swarm Syndicate',
    archetype: 'MULTI_AGENT_SWARM',
    tagline: 'Coordinated specialist collective: Orchestrator, Researcher, Coder, Critic & Voice',
    description:
      'Deploys a specialized team of autonomous sub-agents working in unison. The Orchestrator delegates to a Deep Researcher, Software Architect, and Critic before the Voice Synthesizer summarizes.',
    systemInstruction:
      'You coordinate an Autonomous Multi-Agent Swarm comprising: 1. Orchestrator, 2. Deep Researcher, 3. Software Architect, 4. Critical Evaluator, and 5. Executive Synthesizer. Facilitate multi-agent collaboration to solve complex multifaceted challenges.',
    model: 'gemini-2.5-flash',
    temperature: 0.6,
    maxSteps: 12,
    allowedTools: ['searchWeb', 'openWebsite', 'getSystemStatus'],
    memoryRecall: true,
    visionEnabled: true,
  },
  {
    id: 'agent_vision_multimodal',
    name: 'Multimodal Vision Inspector',
    archetype: 'MULTIMODAL_VISION',
    tagline: 'Live screen perception, UI grounding & document OCR',
    description:
      'Inspects live screen captures and visual artifacts. Grounded in pixel-level layout inspection, code review from IDE screens, and graphical workflow assistance.',
    systemInstruction:
      'You are a Multimodal Vision Agent. Inspect the captured user screen or visual snapshot with high precision. Identify user interface elements, error callouts, visual bugs, and layout hierarchies. Provide step-by-step guidance based on what you observe.',
    model: 'gemini-2.5-flash',
    temperature: 0.4,
    maxSteps: 5,
    allowedTools: ['searchWeb', 'openWebsite'],
    memoryRecall: false,
    visionEnabled: true,
  },
  {
    id: 'agent_memory_reflection',
    name: 'Episodic Memory Biographer',
    archetype: 'MEMORY_REFLECTION',
    tagline: 'Continuous persona synthesis, recall & long-term alignment',
    description:
      'Focuses on cognitive continuity. Retrieves verified long-term memories, correlates historical user preferences, detects behavioral patterns, and updates internal knowledge graphs.',
    systemInstruction:
      'You are an Episodic Memory & Reflection Agent. Your purpose is maintaining continuity across interactions. Inspect recalled user facts, preferences, and patterns to deliver contextually grounded, deeply personalized guidance.',
    model: 'gemini-2.5-flash',
    temperature: 0.6,
    maxSteps: 4,
    allowedTools: ['searchWeb'],
    memoryRecall: true,
    visionEnabled: false,
  },
  {
    id: 'agent_code_engineer',
    name: 'Full-Stack Software Engineer',
    archetype: 'CODE_ENGINEERING',
    tagline: 'Algorithm design, code review, debugging & architecture',
    description:
      'Specialized in writing idiomatic TypeScript, Python, and system scripts. Generates clean implementations with complexity analysis, edge case test suites, and terminal commands.',
    systemInstruction:
      'You are an elite Software Engineering Agent. Produce clean, production-grade, well-commented code. Address edge cases, concurrency, security, and algorithmic efficiency. Provide both code implementations and verification steps.',
    model: 'gemini-2.5-flash',
    temperature: 0.2,
    maxSteps: 6,
    allowedTools: ['searchWeb', 'openWebsite', 'getSystemStatus'],
    memoryRecall: false,
    visionEnabled: true,
  },
];

const LOCAL_STORAGE_KEY = 'mery_custom_agents_v1';
const ACTIVE_AGENT_KEY = 'mery_active_agent_id_v1';

class AgentDevService {
  private customBlueprints: AgentBlueprint[] = [];
  private activeBlueprint: AgentBlueprint;
  private activeTrace: AgentExecutionTrace | null = null;
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.loadCustomBlueprints();
    this.activeBlueprint = this.loadActiveBlueprint();
  }

  private loadCustomBlueprints() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (raw) {
          this.customBlueprints = JSON.parse(raw);
        }
      }
    } catch (e) {
      console.warn('[AgentDevService] Could not load custom blueprints:', e);
    }
  }

  private saveCustomBlueprints() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(
          LOCAL_STORAGE_KEY,
          JSON.stringify(this.customBlueprints)
        );
      }
    } catch (e) {
      console.warn('[AgentDevService] Could not save custom blueprints:', e);
    }
    this.notify();
  }

  private loadActiveBlueprint(): AgentBlueprint {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const activeId = localStorage.getItem(ACTIVE_AGENT_KEY);
        if (activeId) {
          const found = this.getAllBlueprints().find((b) => b.id === activeId);
          if (found) return found;
        }
      }
    } catch {}
    return DEFAULT_AGENT_BLUEPRINTS[0];
  }

  public subscribe(cb: () => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private notify() {
    this.listeners.forEach((cb) => {
      try {
        cb();
      } catch (err) {
        console.warn('[AgentDevService] Listener error:', err);
      }
    });
  }

  public getAllBlueprints(): AgentBlueprint[] {
    return [...DEFAULT_AGENT_BLUEPRINTS, ...this.customBlueprints];
  }

  public getActiveBlueprint(): AgentBlueprint {
    return this.activeBlueprint;
  }

  public setActiveBlueprint(id: string): boolean {
    const found = this.getAllBlueprints().find((b) => b.id === id);
    if (!found) return false;
    this.activeBlueprint = found;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(ACTIVE_AGENT_KEY, id);
      }
    } catch {}
    this.notify();
    return true;
  }

  public createBlueprint(blueprint: Omit<AgentBlueprint, 'id' | 'createdAt'>): AgentBlueprint {
    const newBlueprint: AgentBlueprint = {
      ...blueprint,
      id: `custom_agent_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      isCustom: true,
      createdAt: new Date().toISOString(),
    };
    this.customBlueprints.push(newBlueprint);
    this.saveCustomBlueprints();
    return newBlueprint;
  }

  public updateBlueprint(id: string, updates: Partial<AgentBlueprint>): boolean {
    const idx = this.customBlueprints.findIndex((b) => b.id === id);
    if (idx === -1) return false;
    this.customBlueprints[idx] = { ...this.customBlueprints[idx], ...updates };
    this.saveCustomBlueprints();
    if (this.activeBlueprint.id === id) {
      this.activeBlueprint = this.customBlueprints[idx];
    }
    return true;
  }

  public deleteBlueprint(id: string): boolean {
    const initialLen = this.customBlueprints.length;
    this.customBlueprints = this.customBlueprints.filter((b) => b.id !== id);
    if (this.customBlueprints.length !== initialLen) {
      this.saveCustomBlueprints();
      if (this.activeBlueprint.id === id) {
        this.activeBlueprint = DEFAULT_AGENT_BLUEPRINTS[0];
      }
      return true;
    }
    return false;
  }

  public getActiveTrace(): AgentExecutionTrace | null {
    return this.activeTrace;
  }

  public clearTrace() {
    this.activeTrace = null;
    this.notify();
  }

  /**
   * Execute an Agent Run via the real backend `/api/agent/run` endpoint
   */
  public async executeAgent(
    blueprint: AgentBlueprint,
    goal: string,
    onStepUpdate?: (step: AgentExecutionStep) => void
  ): Promise<AgentExecutionTrace> {
    const startTime = Date.now();
    const traceId = `trace_${Date.now()}`;

    const trace: AgentExecutionTrace = {
      id: traceId,
      agentId: blueprint.id,
      archetype: blueprint.archetype,
      goal,
      status: 'running',
      steps: [],
      metrics: {
        durationMs: 0,
        stepsCount: 0,
        toolsInvoked: 0,
      },
      createdAt: new Date().toLocaleTimeString(),
    };

    this.activeTrace = trace;
    this.notify();

    // Collect optional vision snapshot if vision is enabled
    let screenSnapshot: string | undefined = undefined;
    if (blueprint.visionEnabled && screenShareService.isSharing()) {
      screenSnapshot =
        screenShareService.getLatestSnapshot() ||
        screenShareService.captureSingleFrame() ||
        undefined;
    }

    // Collect verified long-term memory context if memoryRecall is enabled
    let memoryContext: string | undefined = undefined;
    if (blueprint.memoryRecall) {
      try {
        const topMemories = await memoryService.list({ limit: 5 });
        if (topMemories && topMemories.length > 0) {
          memoryContext = topMemories
            .map((m) => `[Fact: ${m.normalizedCategory || m.type}] ${m.content}`)
            .join('\n');
        }
      } catch {}
    }

    try {
      const response = await fetch('/api/agent/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blueprint,
          goal,
          screenSnapshot,
          memoryContext,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Agent execution failed (${response.status}): ${errText}`);
      }

      const data = await response.json();
      const steps: AgentExecutionStep[] = data.steps || [];

      // Update trace with returned steps
      trace.steps = steps;
      trace.finalOutput = data.finalOutput || 'Agent execution completed.';
      trace.status = 'completed';
      trace.metrics = {
        durationMs: Date.now() - startTime,
        stepsCount: steps.length,
        toolsInvoked: steps.filter((s) => s.type === 'action' && s.toolCall).length,
      };

      if (onStepUpdate) {
        steps.forEach((st) => onStepUpdate(st));
      }

      this.activeTrace = { ...trace };
      this.notify();
      return trace;
    } catch (err: any) {
      trace.status = 'failed';
      trace.error = err?.message || 'Execution error';
      trace.metrics = {
        durationMs: Date.now() - startTime,
        stepsCount: trace.steps.length,
        toolsInvoked: 0,
      };
      this.activeTrace = { ...trace };
      this.notify();
      throw err;
    }
  }

  public exportBlueprintJson(blueprint: AgentBlueprint): string {
    return JSON.stringify(blueprint, null, 2);
  }

  public importBlueprintJson(jsonStr: string): AgentBlueprint {
    const parsed = JSON.parse(jsonStr);
    if (!parsed.name || !parsed.archetype || !parsed.systemInstruction) {
      throw new Error('Invalid agent blueprint format: missing required fields.');
    }
    return this.createBlueprint({
      name: parsed.name,
      archetype: parsed.archetype,
      tagline: parsed.tagline || 'Custom Imported Agent',
      description: parsed.description || 'Imported custom agent blueprint.',
      systemInstruction: parsed.systemInstruction,
      model: parsed.model || 'gemini-2.5-flash',
      temperature: typeof parsed.temperature === 'number' ? parsed.temperature : 0.5,
      maxSteps: parsed.maxSteps || 5,
      allowedTools: Array.isArray(parsed.allowedTools) ? parsed.allowedTools : ['searchWeb'],
      memoryRecall: !!parsed.memoryRecall,
      visionEnabled: !!parsed.visionEnabled,
    });
  }
}

export const agentDevService = new AgentDevService();
