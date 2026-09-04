import { ToolExecutionRecord, ToolFunctionResponse } from '../types';
import { stateManager } from './StateManager';
import { systemController } from '../utils/systemController';

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };
}

export type ToolExecutor = (
  args: Record<string, any>,
  callId?: string
) => Promise<Record<string, any>>;

export class ToolManager {
  private toolDefinitions: Map<string, ToolDefinition> = new Map();
  private toolExecutors: Map<string, ToolExecutor> = new Map();
  private safetyHandler: ((request: {
    id: string;
    title: string;
    description: string;
    onConfirm: () => void;
    onCancel: () => void;
  }) => void) | null = null;

  constructor() {
    this.registerDefaultTools();
  }

  setSafetyHandler(
    handler: (request: {
      id: string;
      title: string;
      description: string;
      onConfirm: () => void;
      onCancel: () => void;
    }) => void
  ) {
    this.safetyHandler = handler;
  }

  registerTool(def: ToolDefinition, executor: ToolExecutor) {
    this.toolDefinitions.set(def.name, def);
    this.toolExecutors.set(def.name, executor);
  }

  getToolDefinitions(): ToolDefinition[] {
    return Array.from(this.toolDefinitions.values());
  }

  getFunctionDeclarations(): any[] {
    return this.getToolDefinitions().map((tool) => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    }));
  }

  async execute(
    name: string,
    args: Record<string, any>,
    callId?: string
  ): Promise<ToolFunctionResponse> {
    const id = callId || `call_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const executor = this.toolExecutors.get(name);

    const record: ToolExecutionRecord = {
      id,
      name,
      args,
      status: 'running',
      timestamp: new Date().toLocaleTimeString(),
    };
    stateManager.setActiveTool(record);

    if (!executor) {
      console.warn(`[ToolManager] No executor registered for tool: ${name}`);
      const errResponse = { error: `Tool ${name} is not recognized.` };
      stateManager.setActiveTool({
        ...record,
        status: 'failed',
        result: errResponse,
      });
      return { id, name, response: errResponse };
    }

    try {
      console.log(`[ToolManager] Executing tool [${name}]:`, args);
      const result = await executor(args, id);
      stateManager.setActiveTool({
        ...record,
        status: 'success',
        result,
      });
      return { id, name, response: result };
    } catch (err: any) {
      console.error(`[ToolManager] Error executing tool [${name}]:`, err);
      const errResponse = { error: err?.message || 'Tool execution failed' };
      stateManager.setActiveTool({
        ...record,
        status: 'failed',
        result: errResponse,
      });
      return { id, name, response: errResponse };
    }
  }

  private registerDefaultTools() {
    // 1. openWebsite
    this.registerTool(
      {
        name: 'openWebsite',
        description:
          'Opens a destination website or URL in a new browser tab or navigates directly to it.',
        parameters: {
          type: 'OBJECT',
          properties: {
            url: {
              type: 'STRING',
              description: 'The URL to open (e.g. https://google.com, https://github.com)',
            },
            title: {
              type: 'STRING',
              description: 'Human friendly name or title of the website (e.g. "Google Search", "GitHub")',
            },
          },
          required: ['url'],
        },
      },
      async (args) => {
        let url = String(args.url || '').trim();
        if (!/^https?:\/\//i.test(url)) {
          url = `https://${url}`;
        }
        const title = args.title || url;

        try {
          const win = window.open(url, '_blank', 'noopener,noreferrer');
          stateManager.notify(`Opened ${title} in new tab`, 'success');
          return {
            success: true,
            opened: url,
            title,
            tabOpened: !!win,
            message: win ? `Opened ${title} in a new tab.` : `Popup was blocked, but URL is ready: ${url}`,
          };
        } catch {
          return {
            success: true,
            opened: url,
            title,
            message: `Initiated navigation to ${url}`,
          };
        }
      }
    );

    // 2. searchWeb
    this.registerTool(
      {
        name: 'searchWeb',
        description:
          'Searches the web for up-to-date facts, current news, live documentation, and real-time answers.',
        parameters: {
          type: 'OBJECT',
          properties: {
            query: {
              type: 'STRING',
              description: 'The search query to look up on the live web',
            },
          },
          required: ['query'],
        },
      },
      async (args) => {
        const query = String(args.query || '').trim();
        stateManager.notify(`Searching web for: "${query}"...`, 'info');

        try {
          const res = await fetch('/api/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query }),
          });

          if (res.ok) {
            const data = await res.json();
            return {
              query,
              summary: data.summary || 'Search complete.',
              sources: data.sources || [],
              searchTimeMs: data.searchTimeMs || 0,
            };
          }
          return {
            query,
            summary: `Web search performed for "${query}".`,
            sources: [
              { title: 'Google Search', url: `https://www.google.com/search?q=${encodeURIComponent(query)}` },
            ],
          };
        } catch (e: any) {
          return {
            query,
            summary: `Search lookup fallback for "${query}".`,
            error: e?.message,
          };
        }
      }
    );

    // 3. getSystemStatus
    this.registerTool(
      {
        name: 'getSystemStatus',
        description:
          'Retrieves the real-time device and operating context: battery level, current time, theme, network status, and companion metrics.',
        parameters: {
          type: 'OBJECT',
          properties: {},
        },
      },
      async () => {
        let batteryInfo = 'Unknown';
        try {
          if ('getBattery' in navigator) {
            const b = await (navigator as any).getBattery();
            batteryInfo = `${Math.round(b.level * 100)}% (${b.charging ? 'Charging' : 'On Battery'})`;
          }
        } catch {}

        return {
          companion: 'MERY AI Assistant (M4 System)',
          currentTime: new Date().toLocaleTimeString(),
          currentDate: new Date().toLocaleDateString(),
          theme: stateManager.getTheme(),
          networkOnline: navigator.onLine,
          battery: batteryInfo,
          latency: `${stateManager.getLatency()}ms`,
          status: 'Operational',
        };
      }
    );

    // 4. setTimerOrReminder
    this.registerTool(
      {
        name: 'setTimerOrReminder',
        description: 'Sets a timer or reminder for the user with an alert.',
        parameters: {
          type: 'OBJECT',
          properties: {
            label: {
              type: 'STRING',
              description: 'What the timer or reminder is for',
            },
            minutes: {
              type: 'NUMBER',
              description: 'Timer duration in minutes (e.g. 5, 15, 25)',
            },
          },
          required: ['label', 'minutes'],
        },
      },
      async (args) => {
        const label = String(args.label || 'Reminder');
        const minutes = Number(args.minutes) || 1;
        const ms = Math.max(5000, minutes * 60 * 1000);

        systemController.addReminder(label, `${minutes}m`);

        setTimeout(() => {
          stateManager.notify(`Timer alert: ${label}`, 'warning');
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('MERY Reminder', { body: label });
          }
        }, ms);

        stateManager.notify(`Timer set: "${label}" for ${minutes} min`, 'success');
        return {
          success: true,
          label,
          minutes,
          alertAt: new Date(Date.now() + ms).toLocaleTimeString(),
        };
      }
    );

    // 5. toggleTheme
    this.registerTool(
      {
        name: 'toggleTheme',
        description: 'Switches the visual appearance between futuristic dark and light mode.',
        parameters: {
          type: 'OBJECT',
          properties: {
            mode: {
              type: 'STRING',
              enum: ['dark', 'light'],
              description: 'Target visual theme',
            },
          },
          required: ['mode'],
        },
      },
      async (args) => {
        const mode = args.mode === 'light' ? 'light' : 'dark';
        stateManager.setTheme(mode);
        stateManager.notify(`Theme switched to ${mode} mode`, 'info');
        return { success: true, activeTheme: mode };
      }
    );

    // 6. executeDangerousAction
    this.registerTool(
      {
        name: 'executeDangerousAction',
        description:
          'Executes a sensitive, destructive, or irreversible system action (such as wiping memory, clearing logs, or resetting companion cache). STRICTLY requires user approval.',
        parameters: {
          type: 'OBJECT',
          properties: {
            actionName: {
              type: 'STRING',
              description: 'Clear name of the dangerous action',
            },
            target: {
              type: 'STRING',
              description: 'Target resource or data to be modified or deleted',
            },
          },
          required: ['actionName'],
        },
      },
      async (args) => {
        const actionName = String(args.actionName || 'Sensitive Action');
        const target = String(args.target || 'System Context');

        if (!this.safetyHandler) {
          return {
            confirmed: false,
            message: 'No safety approval handler available. Action blocked.',
          };
        }

        return new Promise((resolve) => {
          this.safetyHandler!({
            id: `safe_${Date.now()}`,
            title: `Confirm: ${actionName}`,
            description: `MERY requested to execute "${actionName}" on target [${target}]. This action is irreversible.`,
            onConfirm: () => {
              stateManager.notify(`Approved and executed: ${actionName}`, 'success');
              resolve({
                confirmed: true,
                executed: actionName,
                target,
                status: 'Completed successfully upon user authorization.',
              });
            },
            onCancel: () => {
              stateManager.notify(`Cancelled: ${actionName}`, 'warning');
              resolve({
                confirmed: false,
                cancelled: true,
                message: 'The user declined permission to execute this sensitive action.',
              });
            },
          });
        });
      }
    );
  }
}

export const toolManager = new ToolManager();
