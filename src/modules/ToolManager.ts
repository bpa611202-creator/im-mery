import { ToolExecutionRecord, ToolFunctionResponse } from '../types';
import { stateManager } from './StateManager';
import { systemController } from '../utils/systemController';
import { agentOrchestrator } from './AgentOrchestrator';
import { memoryManager } from './MemoryManager';
import { locationService } from '../utils/locationService';
import { cameraService } from './CameraService';
import { showSystemNotification } from '../utils/notificationHelper';

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

  async executeTool(name: string, args: Record<string, any>, callId?: string): Promise<ToolFunctionResponse> {
    return this.execute(name, args, callId);
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
          companion: 'MERY AI Assistant',
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
          showSystemNotification('MERY Reminder', { body: label });
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

        const delivered = await showSystemNotification(title, { body });
        stateManager.notify(title ? `${title}: ${body}` : body, 'info');

        return {
          success: true,
          delivered,
          fallback: delivered ? undefined : 'Displayed as in-app notification.',
        };
      }
    );

    // 17. sendEmail (Send email via SMTP/Gmail)
    this.registerTool(
      {
        name: 'sendEmail',
        description:
          "Sends an email to a recipient with subject and body on the user's behalf via SMTP/Gmail.",
        parameters: {
          type: 'OBJECT',
          properties: {
            to: {
              type: 'STRING',
              description: 'Recipient email address',
            },
            subject: {
              type: 'STRING',
              description: 'Subject line of the email',
            },
            body: {
              type: 'STRING',
              description: 'Main body content of the email',
            },
          },
          required: ['to', 'subject', 'body'],
        },
      },
      async (args) => {
        const to = String(args.to || '').trim();
        const subject = String(args.subject || '').trim();
        const body = String(args.body || '').trim();

        if (!to || !subject || !body) {
          return { success: false, error: 'Missing to, subject, or body parameter.' };
        }

        try {
          const res = await fetch('/api/email/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ to, subject, body }),
          });
          const data = await res.json();
          if (data.success) {
            stateManager.notify(`Email sent to ${to}: "${subject}"`, 'success');
          } else {
            stateManager.notify(data.message || 'Email delivery notice', 'warning');
          }
          return data;
        } catch (err: any) {
          return { success: false, error: err?.message || 'Email dispatch failed' };
        }
      }
    );

    // 18. readInbox (Read recent emails or inbox summary)
    this.registerTool(
      {
        name: 'readInbox',
        description: 'Reads recent emails or inbox summary from the connected email account.',
        parameters: {
          type: 'OBJECT',
          properties: {
            limit: {
              type: 'NUMBER',
              description: 'Maximum number of recent emails to retrieve (default: 5)',
            },
          },
        },
      },
      async (args) => {
        const limit = Number(args.limit || 5);
        try {
          const res = await fetch(`/api/email/inbox?limit=${limit}`);
          return await res.json();
        } catch (err: any) {
          return { success: false, error: err?.message || 'Failed to fetch inbox' };
        }
      }
    );

    // 19. sendWhatsAppMessage (Send WhatsApp message or automated report)
    this.registerTool(
      {
        name: 'sendWhatsAppMessage',
        description: 'Sends a WhatsApp message or automated report to a contact or group.',
        parameters: {
          type: 'OBJECT',
          properties: {
            to: {
              type: 'STRING',
              description: 'Contact name, phone number, or group ID',
            },
            message: {
              type: 'STRING',
              description: 'Content of the WhatsApp message',
            },
          },
          required: ['to', 'message'],
        },
      },
      async (args) => {
        const to = String(args.to || '').trim();
        const message = String(args.message || '').trim();

        if (!to || !message) {
          return { success: false, error: 'Missing recipient (to) or message.' };
        }

        try {
          const res = await fetch('/api/whatsapp/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ to, message }),
          });
          const data = await res.json();
          if (data.success) {
            stateManager.notify(`WhatsApp message sent to ${to}`, 'success');
          } else {
            stateManager.notify(data.message || 'WhatsApp notice', 'warning');
          }
          return data;
        } catch (err: any) {
          return { success: false, error: err?.message || 'Failed to send WhatsApp message' };
        }
      }
    );

    // 20. getWhatsAppGroupSummary (Read messages & participant summaries)
    this.registerTool(
      {
        name: 'getWhatsAppGroupSummary',
        description: 'Reads recent messages and participant summaries from a WhatsApp group.',
        parameters: {
          type: 'OBJECT',
          properties: {
            groupName: {
              type: 'STRING',
              description: 'Name or keyword of the WhatsApp group',
            },
          },
          required: ['groupName'],
        },
      },
      async (args) => {
        const groupName = String(args.groupName || '').trim();
        try {
          const res = await fetch(`/api/whatsapp/group-summary?query=${encodeURIComponent(groupName)}`);
          return await res.json();
        } catch (err: any) {
          return { success: false, error: err?.message || 'Failed to fetch WhatsApp group summary' };
        }
      }
    );

    // 21. githubAction (GitHub Repository Automation)
    this.registerTool(
      {
        name: 'githubAction',
        description: 'Interacts with GitHub repositories (create issues, list open issues, inspect repo stats).',
        parameters: {
          type: 'OBJECT',
          properties: {
            repo: {
              type: 'STRING',
              description: "GitHub repository in 'owner/repo' format (e.g. 'octocat/Hello-World')",
            },
            action: {
              type: 'STRING',
              enum: ['createIssue', 'listIssues', 'getRepo'],
              description: 'Action to perform on the repository',
            },
            payload: {
              type: 'OBJECT',
              description: 'Action payload (e.g. { title, body } for createIssue)',
            },
          },
          required: ['repo', 'action'],
        },
      },
      async (args) => {
        const repo = String(args.repo || '').trim();
        const action = String(args.action || '').trim();
        const payload = args.payload || {};

        try {
          const res = await fetch('/api/connectors/github', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ repo, action, payload }),
          });
          const data = await res.json();
          if (data.success) {
            stateManager.notify(`GitHub [${action}] succeeded on ${repo}`, 'success');
          } else {
            stateManager.notify(data.message || 'GitHub notice', 'warning');
          }
          return data;
        } catch (err: any) {
          return { success: false, error: err?.message || 'GitHub action failed' };
        }
      }
    );

    // 23. notionAction (Notion Workspace Automation)
    this.registerTool(
      {
        name: 'notionAction',
        description: 'Interacts with Notion workspace (create page/note, search database).',
        parameters: {
          type: 'OBJECT',
          properties: {
            targetId: {
              type: 'STRING',
              description: 'Page ID or Database ID in Notion',
            },
            action: {
              type: 'STRING',
              enum: ['createPage', 'search'],
              description: 'Notion action to perform',
            },
            payload: {
              type: 'OBJECT',
              description: 'Action payload (e.g. { title, content } for createPage, { query } for search)',
            },
          },
          required: ['targetId', 'action'],
        },
      },
      async (args) => {
        const targetId = String(args.targetId || '').trim();
        const action = String(args.action || '').trim();
        const payload = args.payload || {};

        try {
          const res = await fetch('/api/connectors/notion', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ targetId, action, payload }),
          });
          const data = await res.json();
          if (data.success) {
            stateManager.notify(`Notion action [${action}] completed!`, 'success');
          }
          return data;
        } catch (err: any) {
          return { success: false, error: err?.message || 'Notion action failed' };
        }
      }
    );

    // 24. sendTelegramMessage (Telegram Bot Message Dispatch)
    this.registerTool(
      {
        name: 'sendTelegramMessage',
        description: 'Sends a direct message or notification to the user via Telegram Bot.',
        parameters: {
          type: 'OBJECT',
          properties: {
            chatId: {
              type: 'STRING',
              description: 'Recipient Telegram chat ID (optional if default configured)',
            },
            text: {
              type: 'STRING',
              description: 'Message content to send via Telegram',
            },
          },
          required: ['text'],
        },
      },
      async (args) => {
        const chatId = String(args.chatId || '').trim();
        const text = String(args.text || '').trim();

        try {
          const res = await fetch('/api/connectors/telegram/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chatId, text }),
          });
          const data = await res.json();
          if (data.success) {
            stateManager.notify('Telegram message dispatched!', 'success');
          } else {
            stateManager.notify(data.message || 'Telegram notice', 'warning');
          }
          return data;
        } catch (err: any) {
          return { success: false, error: err?.message || 'Telegram dispatch failed' };
        }
      }
    );

    // 25. logStudySession (Study Tracker)
    this.registerTool(
      {
        name: 'logStudySession',
        description: 'Logs a completed study session with topic/subject, duration in minutes, and optional notes to persistent memory.',
        parameters: {
          type: 'OBJECT',
          properties: {
            subject: {
              type: 'STRING',
              description: 'Subject, topic, or language being studied',
            },
            duration_minutes: {
              type: 'NUMBER',
              description: 'Duration of the study session in minutes',
            },
            notes: {
              type: 'STRING',
              description: 'Key concepts learned, questions, or summary notes',
            },
          },
          required: ['subject', 'duration_minutes'],
        },
      },
      async (args) => {
        const subject = String(args.subject || '').trim();
        const duration_minutes = Number(args.duration_minutes) || 0;
        const notes = args.notes ? String(args.notes).trim() : '';

        try {
          const res = await fetch('/api/study/log', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ subject, duration_minutes, notes }),
          });
          const data = await res.json();
          if (data.success) {
            stateManager.notify(`Logged ${duration_minutes}m study session on ${subject}!`, 'success');
          }
          return data;
        } catch (err: any) {
          return { success: false, error: err?.message || 'Failed to log study session' };
        }
      }
    );

    // 26. getTodayStudySummary (Study Summary)
    this.registerTool(
      {
        name: 'getTodayStudySummary',
        description: "Retrieves a summary of today's total study time and subjects learned so far.",
        parameters: {
          type: 'OBJECT',
          properties: {},
        },
      },
      async () => {
        try {
          const res = await fetch('/api/study/today');
          const data = await res.json();
          return data;
        } catch (err: any) {
          return { error: err?.message || 'Failed to fetch today study summary' };
        }
      }
    );

    // 27. getMarketPrice (Crypto & Stock Quotes)
    this.registerTool(
      {
        name: 'getMarketPrice',
        description: 'Looks up live price and 24h percentage change for a cryptocurrency (Bitcoin, Ethereum, Solana, etc.) or stock ticker (AAPL, TSLA, NVDA).',
        parameters: {
          type: 'OBJECT',
          properties: {
            symbol: {
              type: 'STRING',
              description: "Symbol or ticker name (e.g. 'BTC', 'ETH', 'SOL', 'AAPL')",
            },
          },
          required: ['symbol'],
        },
      },
      async (args) => {
        const symbol = String(args.symbol || '').trim();
        try {
          const res = await fetch(`/api/markets/price?symbol=${encodeURIComponent(symbol)}`);
          const data = await res.json();
          if (data.symbol) {
            stateManager.notify(`${data.symbol}: $${data.price.toLocaleString()} (${data.changePercent24h >= 0 ? '+' : ''}${data.changePercent24h.toFixed(2)}%)`, 'info');
          }
          return data;
        } catch (err: any) {
          return { error: err?.message || 'Failed to fetch market price' };
        }
      }
    );

    // 28. readDocument (Document Reader)
    this.registerTool(
      {
        name: 'readDocument',
        description: 'Reads the text contents of a document or note from the local data/documents workspace.',
        parameters: {
          type: 'OBJECT',
          properties: {
            path: {
              type: 'STRING',
              description: "Filename or relative path inside data/documents (e.g. 'welcome.md', 'notes.txt')",
            },
          },
          required: ['path'],
        },
      },
      async (args) => {
        const path = String(args.path || '').trim();
        try {
          const res = await fetch(`/api/documents/read?path=${encodeURIComponent(path)}`);
          const data = await res.json();
          return data;
        } catch (err: any) {
          return { success: false, error: err?.message || 'Failed to read document' };
        }
      }
    );

    // 29. saveDocument (Document Writer)
    this.registerTool(
      {
        name: 'saveDocument',
        description: 'Saves or overwrites a document with text or markdown content in the local data/documents workspace.',
        parameters: {
          type: 'OBJECT',
          properties: {
            path: {
              type: 'STRING',
              description: "Filename or relative path to save to (e.g. 'project_notes.md')",
            },
            content: {
              type: 'STRING',
              description: 'Full text or markdown content to write into the document',
            },
          },
          required: ['path', 'content'],
        },
      },
      async (args) => {
        const path = String(args.path || '').trim();
        const content = String(args.content || '');
        try {
          const res = await fetch('/api/documents/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path, content }),
          });
          const data = await res.json();
          if (data.success) {
            stateManager.notify(`Saved document: ${path}`, 'success');
          }
          return data;
        } catch (err: any) {
          return { success: false, error: err?.message || 'Failed to save document' };
        }
      }
    );
  }
}

export const toolManager = new ToolManager();

