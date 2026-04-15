import { htmlEscape } from "escape-goat";
import { Resend } from "resend";
import { logger } from "@/lib/logger";

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
