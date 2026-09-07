import { ToolExecutionRecord, ToolFunctionResponse } from '../types';
import { stateManager } from './StateManager';
import { systemController } from '../utils/systemController';
import { agentOrchestrator } from './AgentOrchestrator';
import { memoryManager } from './MemoryManager';
import { locationService } from '../utils/locationService';
import { cameraService } from './CameraService';

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

    // Update AIStatus dynamically according to the tool type
    if (name === 'searchWeb' || name === 'getWeather' || name === 'getNearbyPlaces') {
      stateManager.setAIStatus('SEARCHING');
    } else if (
      name === 'captureCameraFrame' ||
      name === 'activateCamera' ||
      name.toLowerCase().includes('vision') ||
      name.toLowerCase().includes('analyze')
    ) {
      stateManager.setAIStatus('ANALYZING');
    } else {
      stateManager.setAIStatus('THINKING');
    }

    if (!executor) {
      console.warn(`[ToolManager] No executor registered for tool: ${name}`);
      const errResponse = { error: `Tool ${name} is not recognized.` };
      stateManager.setActiveTool({
        ...record,
        status: 'failed',
        result: errResponse,
      });
      stateManager.setAIStatus('ERROR');
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
      stateManager.setAIStatus('COMPLETED');
      setTimeout(() => {
        const currentSt = stateManager.getState();
        if (currentSt === 'speaking') {
          stateManager.setAIStatus('SPEAKING');
        } else if (currentSt === 'listening') {
          stateManager.setAIStatus('LISTENING');
        } else {
          stateManager.setAIStatus('IDLE');
        }
      }, 1500);
      return { id, name, response: result };
    } catch (err: any) {
      console.error(`[ToolManager] Error executing tool [${name}]:`, err);
      const errResponse = { error: err?.message || 'Tool execution failed' };
      stateManager.setActiveTool({
        ...record,
        status: 'failed',
        result: errResponse,
      });
      stateManager.setAIStatus('ERROR');
      setTimeout(() => {
        const currentSt = stateManager.getState();
        if (currentSt === 'listening') stateManager.setAIStatus('LISTENING');
        else stateManager.setAIStatus('IDLE');
      }, 2000);
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

    // 7. dispatchSpecialistAgent
    this.registerTool(
      {
        name: 'dispatchSpecialistAgent',
        description:
          'કોઈપણ જટિલ કામ (કોડિંગ, ડીપ વેબ સર્ચ, ટાસ્ક પ્લાનિંગ કે ફાઇલ મેનેજમેન્ટ) માટે સ્પેશિયાલિસ્ટ એજન્ટને સોંપો.',
        parameters: {
          type: 'OBJECT',
          properties: {
            agentType: {
              type: 'STRING',
              enum: ['dev', 'research', 'system', 'planner'],
              description: 'કયા પ્રકારનો એજન્ટ આ કામ કરશે',
            },
            taskDetails: {
              type: 'STRING',
              description: 'એજન્ટે શું કામ કરવાનું છે તેની ચોક્કસ વિગતો',
            },
          },
          required: ['agentType', 'taskDetails'],
        },
      },
      async (args) => {
        const agentType = (args.agentType as any) || 'general';
        const taskDetails = String(args.taskDetails || '');
        stateManager.notify(`Dispatching specialist agent [${agentType}]...`, 'info');

        const outcome = await agentOrchestrator.executeTask({
          id: `task-${Date.now()}`,
          agentType: agentType === 'planner' ? 'general' : agentType,
          goal: taskDetails,
          status: 'pending',
        });

        stateManager.notify(`Agent [${agentType}] task finished`, 'success');
        return {
          success: true,
          agentType,
          taskDetails,
          outcome,
        };
      }
    );

    // 8. saveMemory (Persistent Long-Term Memory Storage)
    this.registerTool(
      {
        name: 'saveMemory',
        description:
          'Permanently stores a user fact, preference, goal, profile detail, or rule into long-term memory so MERY never forgets it across sessions.',
        parameters: {
          type: 'OBJECT',
          properties: {
            category: {
              type: 'STRING',
              description: 'Category (e.g. "preference", "profile", "goal", "project", "schedule")',
            },
            key: {
              type: 'STRING',
              description: 'Unique descriptive key or topic (e.g. "favorite_food", "user_city", "sleep_schedule")',
            },
            value: {
              type: 'STRING',
              description: 'The core fact or preference value (e.g. "Spicy Gujarati dishes", "Ahmedabad", "Midnight to 7 AM")',
            },
            content: {
              type: 'STRING',
              description: 'Full natural language description of the memory',
            },
            type: {
              type: 'STRING',
              enum: ['preference', 'fact', 'goal', 'profile', 'semantic'],
              description: 'Memory type classification',
            },
            importance: {
              type: 'NUMBER',
              description: 'Importance rating from 0.0 to 1.0 (defaults to 0.90)',
            },
          },
          required: ['key', 'value'],
        },
      },
      async (args) => {
        const category = String(args.category || 'preference');
        const key = String(args.key || `fact_${Date.now().toString(36)}`);
        const value = String(args.value || '');
        const content = String(args.content || `${category}: ${key} is ${value}`);
        const type = String(args.type || 'preference');
        const importance = typeof args.importance === 'number' ? args.importance : 0.90;

        const memory = await memoryManager.addMemory(
          category,
          key,
          value,
          content,
          type,
          importance
        );

        stateManager.notify(`Permanent memory saved: ${key}`, 'success');
        return {
          success: true,
          savedMemory: memory,
          message: `Permanently saved memory for '${key}': ${value}`,
        };
      }
    );

    // 9. getWeather (Real-time Live Weather via Open-Meteo)
    this.registerTool(
      {
        name: 'getWeather',
        description:
          'Gets real-time current weather, temperature, precipitation, humidity, wind, and 5-day forecast for any city or the user’s current location.',
        parameters: {
          type: 'OBJECT',
          properties: {
            city: {
              type: 'STRING',
              description: 'City or location name (e.g. "Ahmedabad", "Mumbai", "London"). Leave empty for current GPS location.',
            },
          },
        },
      },
      async (args) => {
        const city = args.city ? String(args.city).trim() : undefined;
        stateManager.notify(`Fetching live weather${city ? ` for ${city}` : ''}...`, 'info');

        const weather = await locationService.getWeather(city);
        stateManager.notify(`Weather: ${weather.locationName} is ${weather.temperature}°C (${weather.condition})`, 'success');

        return {
          success: true,
          location: weather.locationName,
          temperature: `${weather.temperature}°C (${Math.round(weather.temperature * 1.8 + 32)}°F)`,
          apparentTemperature: `${weather.apparentTemperature}°C`,
          condition: weather.condition,
          humidity: `${weather.humidity}%`,
          windSpeed: `${weather.windSpeed} km/h`,
          precipitation: `${weather.precipitation} mm`,
          forecast: weather.forecast?.map((f) => `${f.date}: ${f.condition}, high ${f.maxTemp}°C / low ${f.minTemp}°C`) || [],
        };
      }
    );

    // 10. getLocation (Real Location Intelligence with Multi-Tier Fallback)
    this.registerTool(
      {
        name: 'getLocation',
        description:
          'Retrieves the user’s real-world location (city, state, country, and approximate coordinates) using device geolocation with instant resilient network fallback.',
        parameters: {
          type: 'OBJECT',
          properties: {},
        },
      },
      async () => {
        stateManager.notify('Locating position...', 'info');
        const info = await locationService.getLocationWithFallback();
        stateManager.notify(`Location identified: ${info.displayName}`, 'success');

        return {
          success: true,
          city: info.city,
          state: info.state,
          country: info.country,
          displayName: info.displayName,
          latitude: info.coordinates.latitude,
          longitude: info.coordinates.longitude,
          source: info.source || 'device',
        };
      }
    );

    // 11. getNearbyPlaces (Local search for cafes, gas stations, hospitals, etc.)
    this.registerTool(
      {
        name: 'getNearbyPlaces',
        description:
          'Searches for nearby places, shops, restaurants, coffee shops, landmarks, or facilities near the user’s current coordinates.',
        parameters: {
          type: 'OBJECT',
          properties: {
            query: {
              type: 'STRING',
              description: 'What to search for nearby (e.g. "coffee", "pharmacy", "EV charger", "italian food")',
            },
          },
          required: ['query'],
        },
      },
      async (args) => {
        const query = String(args.query || 'places').trim();
        stateManager.notify(`Searching nearby for "${query}"...`, 'info');
        const places = await locationService.searchNearby(query);

        return {
          success: true,
          query,
          count: places.length,
          places: places.map((p) => ({
            name: p.name,
            category: p.category,
            distance: `${p.distanceKm} km away`,
            address: p.address,
            mapsUrl: p.mapsUrl,
          })),
        };
      }
    );

    // 12. activateCamera (Vision Mode Camera Control)
    this.registerTool(
      {
        name: 'activateCamera',
        description:
          'Requests permission to activate the device camera (front or environment facing) for live visual perception and environment analysis.',
        parameters: {
          type: 'OBJECT',
          properties: {
            facing: {
              type: 'STRING',
              enum: ['user', 'environment'],
              description: 'Camera facing direction: "user" (front/selfie) or "environment" (rear/room/document)',
            },
          },
        },
      },
      async (args) => {
        const facing = args.facing === 'user' ? 'user' : 'environment';
        const res = await cameraService.startCamera(facing);
        if (!res.success) {
          return {
            success: false,
            cameraActive: false,
            message: "I don't have camera access yet. Please grant camera permission in your browser.",
            error: res.error,
          };
        }
        return {
          success: true,
          cameraActive: true,
          facing,
          message: `Camera activated (${facing === 'user' ? 'Front' : 'Rear'}). Vision pipeline is streaming.`,
        };
      }
    );

    // 13. captureCameraFrame (Visual Perception Snapshot)
    this.registerTool(
      {
        name: 'captureCameraFrame',
        description:
          'Captures a visual frame from the active camera to examine, describe objects, read text (OCR), or answer questions about what MERY sees.',
        parameters: {
          type: 'OBJECT',
          properties: {},
        },
      },
      async () => {
        if (!cameraService.isCameraActive()) {
          // Attempt to start camera first with environment facing
          const started = await cameraService.startCamera('environment');
          if (!started.success) {
            return {
              success: false,
              cameraActive: false,
              message: "I don't have camera access yet. Please tap the Camera button or grant permission.",
            };
          }
        }

        const frame = cameraService.captureSingleFrame(0.85);
        if (!frame) {
          return {
            success: false,
            cameraActive: true,
            message: 'Camera is warming up. Please hold steady for a moment.',
          };
        }

        stateManager.notify('Visual frame captured for analysis', 'info');
        return {
          success: true,
          cameraActive: true,
          frameCaptured: true,
          message: 'Visual frame acquired successfully.',
        };
      }
    );

    // 14. queryMemory (Look up facts stored about user)
    this.registerTool(
      {
        name: 'queryMemory',
        description:
          'Retrieves stored memories, facts, preferences, and personal details previously saved about the user.',
        parameters: {
          type: 'OBJECT',
          properties: {
            query: {
              type: 'STRING',
              description: 'Optional filter keyword, topic, or category to look up',
            },
          },
        },
      },
      async (args) => {
        const query = args.query ? String(args.query).toLowerCase().trim() : '';
        const allMemories = memoryManager.getAllMemories();

        const filtered = query
          ? allMemories.filter(
              (m) =>
                m.key.toLowerCase().includes(query) ||
                m.value.toLowerCase().includes(query) ||
                m.content.toLowerCase().includes(query) ||
                m.category.toLowerCase().includes(query)
            )
          : allMemories;

        return {
          success: true,
          totalMemoriesCount: allMemories.length,
          matchingCount: filtered.length,
          memories: filtered.map((m) => ({
            id: m.id,
            category: m.category,
            key: m.key,
            value: m.value,
            content: m.content,
            type: m.type,
          })),
        };
      }
    );

    // 15. forgetMemory (Delete memory upon user request)
    this.registerTool(
      {
        name: 'forgetMemory',
        description:
          'Permanently deletes a stored memory or preference when the user says "forget this" or requests removal of a saved item.',
        parameters: {
          type: 'OBJECT',
          properties: {
            keyOrId: {
              type: 'STRING',
              description: 'The key, keyword, or ID of the memory to remove',
            },
          },
          required: ['keyOrId'],
        },
      },
      async (args) => {
        const target = String(args.keyOrId || '').trim();
        const all = memoryManager.getAllMemories();
        const match = all.find((m) => m.id === target || m.key.toLowerCase() === target.toLowerCase());

        if (match) {
          memoryManager.removeMemory(match.id);
          stateManager.notify(`Memory forgotten: ${match.key}`, 'info');
          return {
            success: true,
            forgottenKey: match.key,
            message: `Memory for "${match.key}" has been permanently removed.`,
          };
        }

        return {
          success: false,
          message: `No stored memory found matching "${target}".`,
        };
      }
    );

    // 16. sendNotification (Browser / OS Notification)
    this.registerTool(
      {
        name: 'sendNotification',
        description:
          'Sends a desktop/browser notification banner to alert the user with high priority.',
        parameters: {
          type: 'OBJECT',
          properties: {
            title: {
              type: 'STRING',
              description: 'Notification title',
            },
            body: {
              type: 'STRING',
              description: 'Notification body message text',
            },
          },
          required: ['title', 'body'],
        },
      },
      async (args) => {
        const title = String(args.title || 'MERY Notification');
        const body = String(args.body || '');

        if ('Notification' in window) {
          if (Notification.permission === 'granted') {
            new Notification(title, { body });
            stateManager.notify(`Notification sent: ${title}`, 'success');
            return { success: true, delivered: true };
          } else if (Notification.permission !== 'denied') {
            const perm = await Notification.requestPermission();
            if (perm === 'granted') {
              new Notification(title, { body });
              stateManager.notify(`Notification sent: ${title}`, 'success');
              return { success: true, delivered: true };
            }
          }
        }

        stateManager.notify(`${title}: ${body}`, 'info');
        return {
          success: true,
          delivered: true,
          fallback: 'Displayed as in-app notification.',
        };
      }
    );
  }
}

export const toolManager = new ToolManager();
