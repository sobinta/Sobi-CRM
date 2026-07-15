import nodemailer from "nodemailer";
import { logger } from "@/core/observability/logger";

/**
 * Notification channel abstraction.
 *
 * Each channel implements send(); the notification engine fans a notification
 * out to the channels enabled in the recipient's preferences. Email is live
 * (SMTP → Mailpit in dev); SMS/WhatsApp/Telegram are stubs that log intent so
 * the wiring is proven and a real provider drops in later.
 */

export interface OutboundMessage {
  to: string;
  subject: string;
  body: string;
}

export interface NotificationChannel {
  key: string;
  send(msg: OutboundMessage): Promise<void>;
}

let transporter: nodemailer.Transporter | null = null;
function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST ?? "localhost",
      port: Number(process.env.SMTP_PORT ?? 1025),
      secure: false,
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
        : undefined,
    });
  }
  return transporter;
}

/** Raw send — rethrows on failure so callers who need real delivery
 *  confirmation (e.g. campaigns) can tell success from failure. The
 *  best-effort `emailChannel.send` below wraps this and swallows errors for
 *  callers (e.g. in-app notification fan-out) where email is a bonus channel,
 *  not the outcome itself. */
async function sendEmailStrict(msg: OutboundMessage): Promise<void> {
  await getTransporter().sendMail({
    from: process.env.SMTP_FROM ?? "SOBI CRM <no-reply@sobicrm.local>",
    to: msg.to,
    subject: msg.subject,
    text: msg.body,
  });
}

export const emailChannel: NotificationChannel & {
  sendStrict: (msg: OutboundMessage) => Promise<void>;
} = {
  key: "email",
  sendStrict: sendEmailStrict,
  async send(msg) {
    try {
      await sendEmailStrict(msg);
    } catch (err) {
      logger.warn("Email send failed (is Mailpit running?)", {
        error: (err as Error).message,
      });
    }
  },
};

/** Stub channels — log intent; swap in real providers later. */
function stubChannel(key: string): NotificationChannel {
  return {
    key,
    async send(msg) {
      logger.info(`[${key}] would send`, { to: msg.to, subject: msg.subject });
    },
  };
}

export const smsChannel = stubChannel("sms");
export const whatsappChannel = stubChannel("whatsapp");
export const telegramChannel = stubChannel("telegram");

export const channels: Record<string, NotificationChannel> = {
  email: emailChannel,
  sms: smsChannel,
  whatsapp: whatsappChannel,
  telegram: telegramChannel,
};
