import nodemailer from "nodemailer";
import { getRequiredServerEnv, parsePositiveIntEnv } from "@/lib/env";
import { htmlEscape } from "escape-goat";

let transporter: ReturnType<typeof nodemailer.createTransport> | null = null;
let emailFrom: string;
let supportEmail: string;

function getTransporter() {
  if (transporter) {
    return transporter;
  }

  const smtpHost = process.env.SMTP_HOST || process.env.EMAIL_SERVER_HOST;
  const smtpPortRaw = process.env.SMTP_PORT || process.env.EMAIL_SERVER_PORT;
  const smtpUser = process.env.SMTP_USER || process.env.EMAIL_SERVER_USER;
  const smtpPassword = process.env.SMTP_PASSWORD || process.env.EMAIL_SERVER_PASSWORD;

  if (!smtpHost || !smtpUser || !smtpPassword) {
    throw new Error("Missing SMTP configuration for email sending.");
  }

  const smtpPort =
    Number.isFinite(Number(smtpPortRaw)) && Number(smtpPortRaw) > 0
      ? Number(smtpPortRaw)
      : parsePositiveIntEnv("SMTP_PORT", 587);

  emailFrom = getRequiredServerEnv("EMAIL_FROM");
  supportEmail = getRequiredServerEnv("SUPPORT_EMAIL");

  transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: {
      user: smtpUser,
      pass: smtpPassword,
    },
  });

  return transporter;
}

export async function sendContactEmail(options: {
  name: string;
  email: string;
  subject: string;
  message: string;
}) {
  const transporterInstance = getTransporter();

  const html = `
    <h2>PsychVault contact form</h2>
    <p><strong>Name:</strong> ${htmlEscape(options.name)}</p>
    <p><strong>Email:</strong> ${htmlEscape(options.email)}</p>
    <p><strong>Subject:</strong> ${htmlEscape(options.subject)}</p>
    <hr />
    <p>${htmlEscape(options.message).replace(/\n/g, "<br/>")}</p>
  `;

  return transporterInstance.sendMail({
    from: emailFrom,
    to: supportEmail,
    subject: `[PsychVault] ${options.subject}`,
    replyTo: options.email,
    text: `Name: ${options.name}\nEmail: ${options.email}\nSubject: ${options.subject}\n\n${options.message}`,
    html,
  });
}

// Sends the verification email used to confirm a newly registered account.
export async function sendVerificationEmail(options: {
  email: string;
  name: string;
  verificationUrl: string;
}) {
  const transporterInstance = getTransporter();

  const html = `
    <h2>Verify your PsychVault email</h2>
    <p>Hi ${htmlEscape(options.name)},</p>
    <p>Please confirm your email address to unlock creator tools and protected buyer actions on PsychVault.</p>
    <p><a href="${htmlEscape(options.verificationUrl)}">Verify my email</a></p>
    <p>If the button does not work, copy and paste this URL into your browser:</p>
    <p>${htmlEscape(options.verificationUrl)}</p>
  `;

  return transporterInstance.sendMail({
    from: emailFrom,
    to: options.email,
    subject: "Verify your PsychVault email address",
    text: `Hi ${options.name},\n\nPlease verify your email address for PsychVault by opening this link:\n${options.verificationUrl}\n`,
    html,
  });
}
