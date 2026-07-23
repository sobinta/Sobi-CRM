import nodemailer from "nodemailer";
import { logger } from "@/core/observability/logger";

/**
 * Notification channel abstraction.
 *
 * Each channel implements send(); the notification engine fans a notification
 * out to the channels enabled in the recipient's preferences. Email is live
 * and provider-selectable (SMTP/Mailpit in dev by default, Resend or Amazon
 * SES for production bulk sending via EMAIL_PROVIDER); SMS/WhatsApp/Telegram
 * are stubs that log intent so the wiring is proven and a real provider drops
 * in later.
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

function fromAddress(): string {
  return process.env.EMAIL_FROM ?? process.env.SMTP_FROM ?? "SOBI CRM <no-reply@sobicrm.local>";
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

async function sendViaSmtp(msg: OutboundMessage): Promise<void> {
  await getTransporter().sendMail({
    from: fromAddress(),
    to: msg.to,
    subject: msg.subject,
    text: msg.body,
  });
}

/** Resend's REST API is a single JSON POST — a raw fetch call avoids pulling in a dedicated SDK for one endpoint. */
async function sendViaResend(msg: OutboundMessage): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY is required when EMAIL_PROVIDER=resend.");
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromAddress(),
      to: [msg.to],
      subject: msg.subject,
      text: msg.body,
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Resend send failed (${res.status}): ${detail.slice(0, 300)}`);
  }
}

let sesClientPromise: Promise<import("@aws-sdk/client-sesv2").SESv2Client> | null = null;
async function getSesClient() {
  if (!sesClientPromise) {
    sesClientPromise = import("@aws-sdk/client-sesv2").then(({ SESv2Client }) => {
      const region = process.env.SES_REGION;
      if (!region) throw new Error("SES_REGION is required when EMAIL_PROVIDER=ses.");
      const accessKeyId = process.env.SES_ACCESS_KEY_ID;
      const secretAccessKey = process.env.SES_SECRET_ACCESS_KEY;
      return new SESv2Client({
        region,
        // Omit credentials on AWS when the workload has an IAM role; required for local/testing.
        credentials: accessKeyId && secretAccessKey ? { accessKeyId, secretAccessKey } : undefined,
      });
    });
  }
  return sesClientPromise;
}

async function sendViaSes(msg: OutboundMessage): Promise<void> {
  const { SendEmailCommand } = await import("@aws-sdk/client-sesv2");
  const client = await getSesClient();
  await client.send(
    new SendEmailCommand({
      FromEmailAddress: fromAddress(),
      Destination: { ToAddresses: [msg.to] },
      Content: {
        Simple: {
          Subject: { Data: msg.subject, Charset: "UTF-8" },
          Body: { Text: { Data: msg.body, Charset: "UTF-8" } },
        },
      },
    }),
  );
}

/** Raw send — rethrows on failure so callers who need real delivery
 *  confirmation (e.g. campaigns) can tell success from failure. The
 *  best-effort `emailChannel.send` below wraps this and swallows errors for
 *  callers (e.g. in-app notification fan-out) where email is a bonus channel,
 *  not the outcome itself. Provider chosen via EMAIL_PROVIDER (smtp | resend
 *  | ses), defaulting to smtp so local dev works against Mailpit unchanged. */
async function sendEmailStrict(msg: OutboundMessage): Promise<void> {
  const provider = (process.env.EMAIL_PROVIDER ?? "smtp").toLowerCase();
  if (provider === "resend") return sendViaResend(msg);
  if (provider === "ses") return sendViaSes(msg);
  return sendViaSmtp(msg);
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
      logger.warn("Email send failed (is Mailpit running, or is the configured provider reachable?)", {
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
