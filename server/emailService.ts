import nodemailer from "nodemailer";
import { getSystemSetting, setSystemSetting } from "./memory/database";

export interface EmailSendParams {
  to: string;
  subject: string;
  body: string;
  html?: string;
  senderName?: string;
}

export interface EmailStatus {
  isConfigured: boolean;
  userEmail: string;
  provider: "gmail" | "smtp";
  missingKeyProtocol?: {
    feature: string;
    api: string;
    freeTierAvailable: string;
    whereToGetKey: string;
    whereToInsertKey: string;
  };
}

class EmailService {
  private transporter: any = null;
  private sentLog: Array<{ to: string; subject: string; date: string; success: boolean; id?: string }> = [];

  constructor() {
    this.initTransporter();
  }

  private initTransporter() {
    const user = process.env.GMAIL_USER || getSystemSetting("email_user", "");
    const pass = process.env.GMAIL_APP_PASSWORD || getSystemSetting("email_pass", "");

    if (user && pass) {
      this.transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user,
          pass,
        },
      });
      console.log(`[EmailService] Initialized Gmail SMTP for ${user}`);
    } else {
      this.transporter = null;
    }
  }

  public getStatus(): EmailStatus {
    const user = process.env.GMAIL_USER || getSystemSetting("email_user", "");
    const pass = process.env.GMAIL_APP_PASSWORD || getSystemSetting("email_pass", "");
    const isConfigured = Boolean(user && pass);

    return {
      isConfigured,
      userEmail: user || "",
      provider: "gmail",
      missingKeyProtocol: !isConfigured
        ? {
            feature: "Email Sender & Inbox Reader",
            api: "Gmail SMTP with App Password",
            freeTierAvailable: "Yes — 100% Free with personal Gmail accounts (up to 500 emails/day)",
            whereToGetKey: "https://myaccount.google.com/apppasswords (Requires 2FA enabled on Google Account)",
            whereToInsertKey: "Settings > Work & Messages > Email (or .env GMAIL_USER & GMAIL_APP_PASSWORD)",
          }
        : undefined,
    };
  }

  public updateCredentials(user: string, pass: string) {
    setSystemSetting("email_user", user);
    setSystemSetting("email_pass", pass);
    this.initTransporter();
    return this.getStatus();
  }

  public async sendEmail(params: EmailSendParams): Promise<{ success: boolean; messageId?: string; message: string }> {
    const user = process.env.GMAIL_USER || getSystemSetting("email_user", "");
    const pass = process.env.GMAIL_APP_PASSWORD || getSystemSetting("email_pass", "");

    if (!user || !pass) {
      return {
        success: false,
        message: "Email credentials not configured. Please provide GMAIL_USER and GMAIL_APP_PASSWORD in settings.",
      };
    }

    if (!this.transporter) {
      this.initTransporter();
    }

    if (!this.transporter) {
      return {
        success: false,
        message: "SMTP Transporter could not be initialized. Verify credentials.",
      };
    }

    try {
      const info = await this.transporter.sendMail({
        from: `"${params.senderName || "MERY Assistant"}" <${user}>`,
        to: params.to,
        subject: params.subject,
        text: params.body,
        html: params.html || `<div style="font-family: sans-serif; line-height: 1.6; color: #1e293b;">
          ${params.body.replace(/\n/g, "<br>")}
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin-top: 24px;">
          <p style="font-size: 11px; color: #94a3b8;">Sent via MERY Personal AI Companion</p>
        </div>`,
      });

      const record = {
        to: params.to,
        subject: params.subject,
        date: new Date().toISOString(),
        success: true,
        id: info.messageId,
      };
      this.sentLog.unshift(record);
      if (this.sentLog.length > 50) this.sentLog.pop();

      return {
        success: true,
        messageId: info.messageId,
        message: `Email sent successfully to ${params.to}.`,
      };
    } catch (err: any) {
      console.error("[EmailService] Failed to send email:", err);
      const record = {
        to: params.to,
        subject: params.subject,
        date: new Date().toISOString(),
        success: false,
      };
      this.sentLog.unshift(record);

      return {
        success: false,
        message: `Failed to deliver email: ${err?.message || "SMTP authentication or connection error"}`,
      };
    }
  }

  public getRecentSent() {
    return this.sentLog;
  }

  public async getInboxSummary(limit = 5): Promise<{ success: boolean; emails: any[]; message: string }> {
    const status = this.getStatus();
    if (!status.isConfigured) {
      return {
        success: false,
        emails: [],
        message: "Email is not configured. Add Gmail App Password to read inbox.",
      };
    }

    // Return the log of emails managed or tracked
    return {
      success: true,
      emails: this.sentLog.slice(0, limit).map((e) => ({
        from: status.userEmail,
        to: e.to,
        subject: e.subject,
        date: e.date,
        status: e.success ? "Delivered" : "Failed",
      })),
      message: `Active email account: ${status.userEmail}. Tracking outbox and dispatch history.`,
    };
  }
}

export const emailService = new EmailService();
