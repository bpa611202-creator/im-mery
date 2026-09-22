import { getSystemSetting, setSystemSetting } from "./memory/database";

export interface ConnectorStatus {
  github: {
    connected: boolean;
    user?: string;
    missingKeyProtocol?: {
      feature: string;
      api: string;
      freeTierAvailable: string;
      whereToGetKey: string;
      whereToInsertKey: string;
    };
  };
  notion: {
    connected: boolean;
    workspace?: string;
    missingKeyProtocol?: {
      feature: string;
      api: string;
      freeTierAvailable: string;
      whereToGetKey: string;
      whereToInsertKey: string;
    };
  };
  telegram: {
    connected: boolean;
    botUsername?: string;
    defaultChatId?: string;
    missingKeyProtocol?: {
      feature: string;
      api: string;
      freeTierAvailable: string;
      whereToGetKey: string;
      whereToInsertKey: string;
    };
  };
}

class ConnectorsService {
  private telegramInboundLog: Array<{ from: string; text: string; date: string }> = [];

  public getStatus(): ConnectorStatus {
    const ghPat = process.env.GITHUB_PAT || getSystemSetting("github_pat", "");
    const notionKey = process.env.NOTION_API_KEY || getSystemSetting("notion_api_key", "");
    const tgToken = process.env.TELEGRAM_BOT_TOKEN || getSystemSetting("telegram_bot_token", "");
    const tgChatId = process.env.TELEGRAM_CHAT_ID || getSystemSetting("telegram_chat_id", "");

    return {
      github: {
        connected: Boolean(ghPat),
        user: ghPat ? "Authenticated GitHub User" : undefined,
        missingKeyProtocol: !ghPat
          ? {
              feature: "GitHub Repository Automation & Issues",
              api: "GitHub REST API (Personal Access Token)",
              freeTierAvailable: "Yes — 100% Free with standard GitHub account (5,000 req/hr)",
              whereToGetKey: "https://github.com/settings/tokens (Generate classic or fine-grained token with repo scope)",
              whereToInsertKey: "Settings > Connected Accounts > GitHub PAT (or .env GITHUB_PAT)",
            }
          : undefined,
      },
      notion: {
        connected: Boolean(notionKey),
        workspace: notionKey ? "Connected Notion Workspace" : undefined,
        missingKeyProtocol: !notionKey
          ? {
              feature: "Notion Knowledge Base & Task Sync",
              api: "Notion Integration API",
              freeTierAvailable: "Yes — 100% Free with personal Notion account",
              whereToGetKey: "https://www.notion.so/my-integrations (Create internal integration token)",
              whereToInsertKey: "Settings > Connected Accounts > Notion API Key (or .env NOTION_API_KEY)",
            }
          : undefined,
      },
      telegram: {
        connected: Boolean(tgToken),
        botUsername: tgToken ? "@MeryCompanionBot" : undefined,
        defaultChatId: tgChatId || undefined,
        missingKeyProtocol: !tgToken
          ? {
              feature: "Telegram Voice & Text Notifications",
              api: "Telegram Bot API",
              freeTierAvailable: "Yes — 100% Free with Telegram messenger",
              whereToGetKey: "Open Telegram, search for @BotFather, and run /newbot",
              whereToInsertKey: "Settings > Connected Accounts > Telegram Bot Token (or .env TELEGRAM_BOT_TOKEN)",
            }
          : undefined,
      },
    };
  }

  public saveTokens(tokens: {
    githubPat?: string;
    notionApiKey?: string;
    telegramBotToken?: string;
    telegramChatId?: string;
  }) {
    if (tokens.githubPat !== undefined) setSystemSetting("github_pat", tokens.githubPat);
    if (tokens.notionApiKey !== undefined) setSystemSetting("notion_api_key", tokens.notionApiKey);
    if (tokens.telegramBotToken !== undefined) setSystemSetting("telegram_bot_token", tokens.telegramBotToken);
    if (tokens.telegramChatId !== undefined) setSystemSetting("telegram_chat_id", tokens.telegramChatId);
    return this.getStatus();
  }

  // -------------------------------------------------------------
  // GITHUB ACTIONS
  // -------------------------------------------------------------
  public async executeGitHubAction(repo: string, action: string, payload: any = {}): Promise<any> {
    const token = process.env.GITHUB_PAT || getSystemSetting("github_pat", "");
    if (!token) {
      return {
        success: false,
        message: "GitHub PAT not configured. Provide GITHUB_PAT in Settings > Connected Accounts.",
      };
    }

    const headers = {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "MERY-Companion",
      "X-GitHub-Api-Version": "2022-11-28",
    };

    try {
      if (action === "createIssue") {
        const url = `https://api.github.com/repos/${repo}/issues`;
        const res = await fetch(url, {
          method: "POST",
          headers,
          body: JSON.stringify({
            title: payload.title || "Issue created by Mery AI",
            body: payload.body || "Automated issue report from MERY assistant.",
            labels: payload.labels || ["mery-assistant"],
          }),
        });
        const data = await res.json();
        if (res.ok) {
          return {
            success: true,
            issueUrl: data.html_url,
            number: data.number,
            message: `Created issue #${data.number} on ${repo}: ${data.title}`,
          };
        } else {
          return { success: false, message: `GitHub API error: ${data.message || JSON.stringify(data)}` };
        }
      } else if (action === "listIssues") {
        const url = `https://api.github.com/repos/${repo}/issues?state=${payload.state || "open"}&per_page=5`;
        const res = await fetch(url, { headers });
        const data = await res.json();
        if (res.ok && Array.isArray(data)) {
          return {
            success: true,
            issues: data.map((i) => ({ number: i.number, title: i.title, state: i.state, url: i.html_url })),
            message: `Retrieved ${data.length} issues from ${repo}.`,
          };
        } else {
          return { success: false, message: `Failed to list issues: ${data?.message || "Invalid repository"}` };
        }
      } else if (action === "getRepo") {
        const url = `https://api.github.com/repos/${repo}`;
        const res = await fetch(url, { headers });
        const data = await res.json();
        if (res.ok) {
          return {
            success: true,
            repo: {
              fullName: data.full_name,
              stars: data.stargazers_count,
              forks: data.forks_count,
              description: data.description,
              url: data.html_url,
            },
            message: `Repository ${data.full_name}: ${data.stargazers_count} stars, ${data.description || "No description"}.`,
          };
        }
      }
      return { success: false, message: `Unknown or unhandled GitHub action: ${action}` };
    } catch (err: any) {
      return { success: false, message: `GitHub action error: ${err?.message || err}` };
    }
  }

  // -------------------------------------------------------------
  // NOTION ACTIONS
  // -------------------------------------------------------------
  public async executeNotionAction(targetId: string, action: string, payload: any = {}): Promise<any> {
    const token = process.env.NOTION_API_KEY || getSystemSetting("notion_api_key", "");
    if (!token) {
      return {
        success: false,
        message: "Notion API key not configured. Add NOTION_API_KEY in Settings > Connected Accounts.",
      };
    }

    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "Notion-Version": "2022-06-28",
    };

    try {
      if (action === "createPage") {
        const res = await fetch("https://api.notion.com/v1/pages", {
          method: "POST",
          headers,
          body: JSON.stringify({
            parent: targetId.includes("-") || targetId.length === 32 ? { page_id: targetId } : { database_id: targetId },
            properties: {
              title: {
                title: [{ text: { content: payload.title || "Note from Mery" } }],
              },
            },
            children: [
              {
                object: "block",
                type: "paragraph",
                paragraph: {
                  rich_text: [{ text: { content: payload.content || "Saved via Mery AI Companion." } }],
                },
              },
            ],
          }),
        });
        const data = await res.json();
        if (res.ok) {
          return {
            success: true,
            pageUrl: data.url,
            pageId: data.id,
            message: `Created page "${payload.title || "Note"}" in Notion!`,
          };
        } else {
          return { success: false, message: `Notion API error: ${data.message || JSON.stringify(data)}` };
        }
      } else if (action === "search") {
        const res = await fetch("https://api.notion.com/v1/search", {
          method: "POST",
          headers,
          body: JSON.stringify({ query: payload.query || "", page_size: 5 }),
        });
        const data = await res.json();
        if (res.ok && Array.isArray(data.results)) {
          return {
            success: true,
            results: data.results.map((r: any) => ({
              id: r.id,
              type: r.object,
              url: r.url,
            })),
            message: `Found ${data.results.length} results in Notion for query "${payload.query}".`,
          };
        }
      }
      return { success: false, message: `Notion action ${action} executed.` };
    } catch (err: any) {
      return { success: false, message: `Notion action error: ${err?.message || err}` };
    }
  }

  // -------------------------------------------------------------
  // TELEGRAM BOT ACTIONS
  // -------------------------------------------------------------
  public async sendTelegramMessage(chatId: string, text: string): Promise<any> {
    const token = process.env.TELEGRAM_BOT_TOKEN || getSystemSetting("telegram_bot_token", "");
    const targetChatId = chatId || process.env.TELEGRAM_CHAT_ID || getSystemSetting("telegram_chat_id", "");

    if (!token) {
      return {
        success: false,
        message: "Telegram Bot Token not configured. Add TELEGRAM_BOT_TOKEN in Settings > Connected Accounts.",
      };
    }

    if (!targetChatId) {
      return {
        success: false,
        message: "Telegram Chat ID not provided. Send a message to your bot first, or provide TELEGRAM_CHAT_ID in settings.",
      };
    }

    try {
      const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: targetChatId,
          text: `🤖 *Mery AI Companion*:\n${text}`,
          parse_mode: "Markdown",
        }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        return {
          success: true,
          messageId: data.result.message_id,
          message: `Dispatched Telegram message to chat ${targetChatId}.`,
        };
      } else {
        return {
          success: false,
          message: `Telegram Bot API notice: ${data.description || "Failed to dispatch message"}`,
        };
      }
    } catch (err: any) {
      return { success: false, message: `Telegram error: ${err?.message || err}` };
    }
  }

  public handleInboundTelegramWebhook(body: any) {
    if (body?.message) {
      const msg = body.message;
      const record = {
        from: msg.from?.username || msg.from?.first_name || "Telegram User",
        text: msg.text || "[Non-text message]",
        date: new Date().toLocaleTimeString(),
      };
      this.telegramInboundLog.unshift(record);
      if (this.telegramInboundLog.length > 50) this.telegramInboundLog.pop();

      // Automatically capture user's chat_id if not set!
      if (!getSystemSetting("telegram_chat_id", "") && msg.chat?.id) {
        setSystemSetting("telegram_chat_id", String(msg.chat.id));
        console.log(`[ConnectorsService] Auto-saved Telegram Chat ID: ${msg.chat.id}`);
      }
      return record;
    }
    return null;
  }

  public getTelegramInboundLog() {
    return this.telegramInboundLog;
  }
}

export const connectorsService = new ConnectorsService();
