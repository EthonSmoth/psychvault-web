import { htmlEscape } from "escape-goat";
import { Resend } from "resend";
import { logger } from "@/lib/logger";
import { buildUnsubscribeUrl } from "@/lib/unsubscribe";

type EmailTag = {
  name: string;
  value: string;
};

type SendEmailOptions = {
  to: string | string[];
  subject: string;
  html: string;
  text: string;
  replyTo?: string | string[];
  tags?: EmailTag[];
};

type ContactEmailOptions = {
  name: string;
  email: string;
  subject: string;
  message: string;
};

type VerificationEmailOptions = {
  email: string;
  name: string;
  verificationUrl: string;
};

let resendClient: Resend | null = null;

function getOptionalServerEnv(name: string) {
  const value = process.env[name];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function getResendClient() {
  if (resendClient) return resendClient;

  const apiKey = getOptionalServerEnv("RESEND_API_KEY");
  if (!apiKey) return null;

  resendClient = new Resend(apiKey);
  return resendClient;
}

function getEmailFrom() {
  return getOptionalServerEnv("EMAIL_FROM");
}

function getSupportEmail() {
  return getOptionalServerEnv("SUPPORT_EMAIL");
}

export function isEmailConfigured() {
  return Boolean(getResendClient() && getEmailFrom());
}

export class EmailConfigurationError extends Error {
  constructor(message = "Missing email configuration for email sending.") {
    super(message);
    this.name = "EmailConfigurationError";
  }
}

export async function sendEmail(options: SendEmailOptions) {
  const resend = getResendClient();
  const from = getEmailFrom();

  if (!resend || !from) {
    throw new EmailConfigurationError();
  }

  const { data, error } = await resend.emails.send({
    from,
    to: options.to,
    subject: options.subject,
    html: options.html,
    text: options.text,
    replyTo: options.replyTo,
    tags: options.tags,
  });

  if (error) {
    logger.error("Resend email send failed", error);
    throw new Error(`Unable to send email: ${error.message}`);
  }

  if (!data?.id) {
    logger.error("Resend email send returned no id", data);
    throw new Error("Unable to send email.");
  }

  return data;
}

export async function trySendEmail(options: SendEmailOptions) {
  try {
    const data = await sendEmail(options);
    return {
      ok: true as const,
      skipped: false as const,
      data,
    };
  } catch (error) {
    if (error instanceof EmailConfigurationError) {
      logger.warn("Email skipped due to missing configuration");
      return {
        ok: false as const,
        skipped: true as const,
        reason: "missing_configuration" as const,
      };
    }

    logger.error("Email send failed unexpectedly", error);
    return {
      ok: false as const,
      skipped: false as const,
      reason: "send_failed" as const,
    };
  }
}

export async function sendContactEmail(options: ContactEmailOptions) {
  const subject = options.subject.trim();
  const supportEmail = getSupportEmail();

  if (!supportEmail) {
    throw new EmailConfigurationError("Missing SUPPORT_EMAIL configuration.");
  }

  const html = `
    <h2>PsychVault contact/support enquiry</h2>
    <p><strong>Name:</strong> ${htmlEscape(options.name)}</p>
    <p><strong>Email:</strong> ${htmlEscape(options.email)}</p>
    <p><strong>Subject:</strong> ${htmlEscape(subject)}</p>
    <hr />
    <p><strong>Message:</strong></p>
    <p>${htmlEscape(options.message).replace(/\n/g, "<br/>")}</p>
  `;

  const text = [
    "PsychVault contact/support enquiry",
    "",
    `Name: ${options.name}`,
    `Email: ${options.email}`,
    `Subject: ${subject}`,
    "",
    "Message:",
    options.message,
  ].join("\n");

  return sendEmail({
    to: supportEmail,
    subject: `[PsychVault Contact] ${subject}`,
    html,
    text,
    replyTo: options.email,
    tags: [
      { name: "type", value: "contact" },
      { name: "channel", value: "support-form" },
    ],
  });
}

function buildVerificationEmail(options: VerificationEmailOptions) {
  const html = `
    <h2>Verify your PsychVault email</h2>
    <p>Hi ${htmlEscape(options.name)},</p>
    <p>Please confirm your email address to unlock creator tools and protected buyer actions on PsychVault.</p>
    <p><a href="${htmlEscape(options.verificationUrl)}">Verify my email</a></p>
    <p>If the button does not work, copy and paste this URL into your browser:</p>
    <p>${htmlEscape(options.verificationUrl)}</p>
  `;

  const text = [
    `Hi ${options.name},`,
    "",
    "Please verify your email address for PsychVault by opening this link:",
    options.verificationUrl,
  ].join("\n");

  return {
    to: options.email,
    subject: "Verify your PsychVault email address",
    html,
    text,
    tags: [{ name: "type", value: "verification" }] as EmailTag[],
  };
}

type PasswordResetEmailOptions = {
  email: string;
  name: string;
  resetUrl: string;
};

function buildPasswordResetEmail(options: PasswordResetEmailOptions) {
  const html = `
    <h2>Reset your PsychVault password</h2>
    <p>Hi ${htmlEscape(options.name)},</p>
    <p>We received a request to reset your password. Click the link below to choose a new one.</p>
    <p><a href="${htmlEscape(options.resetUrl)}">Reset my password</a></p>
    <p>If the button does not work, copy and paste this URL into your browser:</p>
    <p>${htmlEscape(options.resetUrl)}</p>
    <p>This link expires in 1 hour. If you did not request a password reset, you can safely ignore this email.</p>
  `;

  const text = [
    `Hi ${options.name},`,
    "",
    "We received a request to reset your PsychVault password.",
    "Open this link to choose a new password:",
    options.resetUrl,
    "",
    "This link expires in 1 hour.",
    "If you did not request this, you can ignore this email.",
  ].join("\n");

  return {
    to: options.email,
    subject: "Reset your PsychVault password",
    html,
    text,
    tags: [{ name: "type", value: "password-reset" }] as EmailTag[],
  };
}

export async function sendPasswordResetEmail(options: PasswordResetEmailOptions) {
  return sendEmail(buildPasswordResetEmail(options));
}

export async function trySendPasswordResetEmail(options: PasswordResetEmailOptions) {
  return trySendEmail(buildPasswordResetEmail(options));
}

export async function sendVerificationEmail(options: VerificationEmailOptions) {
  return sendEmail(buildVerificationEmail(options));
}

export async function trySendVerificationEmail(options: VerificationEmailOptions) {
  return trySendEmail(buildVerificationEmail(options));
}

// ─── Purchase confirmation ────────────────────────────────────────────────────

type PurchaseConfirmationEmailOptions = {
  buyerEmail: string;
  buyerName: string;
  buyerId: string;
  resourceTitle: string;
  resourceSlug: string;
  storeName: string;
  amountCents: number;
  isFree: boolean;
  appBaseUrl: string;
};

function buildPurchaseConfirmationEmail(options: PurchaseConfirmationEmailOptions) {
  const priceLabel = options.isFree
    ? "Free"
    : new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(
        options.amountCents / 100
      );
  const libraryUrl = `${options.appBaseUrl}/library`;
  const resourceUrl = `${options.appBaseUrl}/resources/${htmlEscape(options.resourceSlug)}`;
  const unsubscribeUrl = buildUnsubscribeUrl(options.buyerId);

  const html = `
    <h2>Your PsychVault purchase is confirmed</h2>
    <p>Hi ${htmlEscape(options.buyerName)},</p>
    <p>Thanks for your purchase. Your resource is now in your library and ready to download.</p>
    <table style="border-collapse:collapse;margin:16px 0">
      <tr><td style="padding:4px 12px 4px 0;color:#6b7280;font-size:14px">Resource</td><td style="padding:4px 0;font-size:14px;font-weight:600">${htmlEscape(options.resourceTitle)}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#6b7280;font-size:14px">Creator</td><td style="padding:4px 0;font-size:14px">${htmlEscape(options.storeName)}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#6b7280;font-size:14px">Amount</td><td style="padding:4px 0;font-size:14px">${htmlEscape(priceLabel)}</td></tr>
    </table>
    <p><a href="${htmlEscape(libraryUrl)}" style="display:inline-block;background:#0f172a;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600">Go to my library</a></p>
    <p style="font-size:13px;color:#6b7280">You can also <a href="${htmlEscape(resourceUrl)}">view the resource page</a> or reply to this email if you have any questions.</p>
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0"/>
    <p style="font-size:11px;color:#9ca3af">PsychVault &mdash; <a href="${htmlEscape(unsubscribeUrl)}" style="color:#9ca3af">Unsubscribe from notification emails</a></p>
  `;

  const text = [
    `Hi ${options.buyerName},`,
    "",
    "Your PsychVault purchase is confirmed.",
    "",
    `Resource: ${options.resourceTitle}`,
    `Creator: ${options.storeName}`,
    `Amount: ${priceLabel}`,
    "",
    `Download it from your library: ${libraryUrl}`,
  ].join("\n");

  return {
    to: options.buyerEmail,
    subject: `Your purchase: ${options.resourceTitle}`,
    html,
    text,
    tags: [{ name: "type", value: "purchase-confirmation" }] as EmailTag[],
  };
}

export async function trySendPurchaseConfirmationEmail(
  options: PurchaseConfirmationEmailOptions
) {
  return trySendEmail(buildPurchaseConfirmationEmail(options));
}

// ─── Message notification ─────────────────────────────────────────────────────

type MessageNotificationEmailOptions = {
  recipientEmail: string;
  recipientName: string;
  recipientId: string;
  senderName: string;
  messagePreview: string;
  conversationId: string;
  appBaseUrl: string;
};

function buildMessageNotificationEmail(options: MessageNotificationEmailOptions) {
  const inboxUrl = `${options.appBaseUrl}/messages/${htmlEscape(options.conversationId)}`;
  const unsubscribeUrl = buildUnsubscribeUrl(options.recipientId);
  const preview =
    options.messagePreview.length > 120
      ? options.messagePreview.slice(0, 120) + "…"
      : options.messagePreview;

  const html = `
    <h2>New message on PsychVault</h2>
    <p>Hi ${htmlEscape(options.recipientName)},</p>
    <p><strong>${htmlEscape(options.senderName)}</strong> sent you a message:</p>
    <blockquote style="border-left:3px solid #e2e8f0;margin:12px 0;padding:8px 16px;color:#374151;font-size:14px">${htmlEscape(preview)}</blockquote>
    <p><a href="${htmlEscape(inboxUrl)}" style="display:inline-block;background:#0f172a;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600">Reply</a></p>
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0"/>
    <p style="font-size:11px;color:#9ca3af">PsychVault &mdash; <a href="${htmlEscape(unsubscribeUrl)}" style="color:#9ca3af">Unsubscribe from notification emails</a></p>
  `;

  const text = [
    `Hi ${options.recipientName},`,
    "",
    `${options.senderName} sent you a message on PsychVault:`,
    "",
    preview,
    "",
    `Reply here: ${inboxUrl}`,
  ].join("\n");

  return {
    to: options.recipientEmail,
    subject: `New message from ${options.senderName}`,
    html,
    text,
    tags: [{ name: "type", value: "message-notification" }] as EmailTag[],
  };
}

export async function trySendMessageNotificationEmail(
  options: MessageNotificationEmailOptions
) {
  return trySendEmail(buildMessageNotificationEmail(options));
}

// ─── Refund request (admin alert) ────────────────────────────────────────────

type RefundRequestAdminEmailOptions = {
  buyerEmail: string;
  buyerName: string;
  resourceTitle: string;
  reason: string;
  message: string | null;
  purchaseId: string;
  appBaseUrl: string;
};

function buildRefundRequestAdminEmail(options: RefundRequestAdminEmailOptions) {
  const html = `
    <h2>New refund request — PsychVault</h2>
    <table style="border-collapse:collapse;margin:16px 0">
      <tr><td style="padding:4px 12px 4px 0;color:#6b7280;font-size:14px">Buyer</td><td style="padding:4px 0;font-size:14px">${htmlEscape(options.buyerName)} (${htmlEscape(options.buyerEmail)})</td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#6b7280;font-size:14px">Resource</td><td style="padding:4px 0;font-size:14px;font-weight:600">${htmlEscape(options.resourceTitle)}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#6b7280;font-size:14px">Reason</td><td style="padding:4px 0;font-size:14px">${htmlEscape(options.reason)}</td></tr>
      ${options.message ? `<tr><td style="padding:4px 12px 4px 0;color:#6b7280;font-size:14px;vertical-align:top">Message</td><td style="padding:4px 0;font-size:14px">${htmlEscape(options.message).replace(/\n/g, "<br/>")}</td></tr>` : ""}
      <tr><td style="padding:4px 12px 4px 0;color:#6b7280;font-size:14px">Purchase ID</td><td style="padding:4px 0;font-size:14px;font-family:monospace">${htmlEscape(options.purchaseId)}</td></tr>
    </table>
    <p style="font-size:13px;color:#6b7280">Review this request in the admin panel.</p>
  `;

  const text = [
    "New refund request — PsychVault",
    "",
    `Buyer: ${options.buyerName} (${options.buyerEmail})`,
    `Resource: ${options.resourceTitle}`,
    `Reason: ${options.reason}`,
    options.message ? `Message: ${options.message}` : "",
    `Purchase ID: ${options.purchaseId}`,
  ]
    .filter(Boolean)
    .join("\n");

  const supportEmail = getSupportEmail();
  if (!supportEmail) {
    throw new EmailConfigurationError("Missing SUPPORT_EMAIL configuration.");
  }

  return {
    to: supportEmail,
    subject: `[Refund Request] ${options.resourceTitle} — ${options.buyerName}`,
    html,
    text,
    replyTo: options.buyerEmail,
    tags: [{ name: "type", value: "refund-request" }] as EmailTag[],
  };
}

export async function trySendRefundRequestAdminEmail(
  options: RefundRequestAdminEmailOptions
) {
  try {
    return trySendEmail(buildRefundRequestAdminEmail(options));
  } catch {
    // getSupportEmail() not configured — skip silently
    return { ok: false as const, skipped: true as const, reason: "missing_configuration" as const };
  }
}
