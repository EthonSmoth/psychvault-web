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

// ─── Shared email layout ──────────────────────────────────────────────────────

// Wraps all outbound HTML emails in the PsychVault branded shell.
// Uses table-based layout for compatibility with Outlook and older clients.
function buildEmailLayout(
  content: string,
  opts: {
    preheader?: string;
    unsubscribeUrl?: string;
    showSupport?: boolean;
  } = {}
): string {
  const preheader = opts.preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;font-size:1px;line-height:1px;color:#fbf0e4;">${htmlEscape(opts.preheader)}&nbsp;&zwnj;&zwnj;&zwnj;&zwnj;&zwnj;&zwnj;&zwnj;&zwnj;&zwnj;&zwnj;&zwnj;&zwnj;&zwnj;&zwnj;&zwnj;</div>`
    : "";

  const footer = [
    opts.unsubscribeUrl
      ? `<a href="${opts.unsubscribeUrl}" style="color:#b09070;text-decoration:underline;">Unsubscribe from notifications</a>`
      : "",
    opts.showSupport
      ? `<a href="mailto:${htmlEscape(getSupportEmail() ?? "support@psychvault.com.au")}" style="color:#b09070;text-decoration:underline;">Contact support</a>`
      : "",
  ]
    .filter(Boolean)
    .join(" &nbsp;&middot;&nbsp; ");

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#fbf0e4;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
  ${preheader}
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#fbf0e4;">
    <tr>
      <td align="center" style="padding:40px 16px 48px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:580px;">

          <!-- Header -->
          <tr>
            <td style="background-color:#4c3523;border-radius:12px 12px 0 0;padding:24px 40px;text-align:center;">
              <span style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:20px;font-weight:700;color:#fbf0e4;letter-spacing:-0.3px;">PsychVault</span>
            </td>
          </tr>

          <!-- Body card -->
          <tr>
            <td style="background-color:#fdfaf6;border:1px solid #dfc9b0;border-top:none;border-radius:0 0 12px 12px;padding:40px 40px 36px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#4c3523;">
                    ${content}
                  </td>
                </tr>
              </table>

              <!-- Footer -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:32px;">
                <tr>
                  <td style="border-top:1px solid #e8d5c0;padding-top:20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:12px;color:#b09070;text-align:center;line-height:1.6;">
                    PsychVault &mdash; Resources for Australian clinicians<br/>
                    ${footer ? `<span style="display:inline-block;margin-top:4px;">${footer}</span>` : ""}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// Renders a full-width CTA button suitable for all major email clients.
function buildEmailButton(label: string, url: string): string {
  return `
    <table cellpadding="0" cellspacing="0" border="0" style="margin:28px 0 8px;">
      <tr>
        <td style="border-radius:8px;background-color:#c47f2c;" align="center">
          <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${url}" style="height:44px;v-text-anchor:middle;width:200px;" arcsize="18%" stroke="f" fillcolor="#c47f2c"><w:anchorlock/><center style="color:#ffffff;font-family:sans-serif;font-size:14px;font-weight:bold;">${htmlEscape(label)}</center></v:roundrect><![endif]-->
          <!--[if !mso]><!-->
          <a href="${url}" style="display:inline-block;padding:13px 28px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;background-color:#c47f2c;">${htmlEscape(label)}</a>
          <!--<![endif]-->
        </td>
      </tr>
    </table>`;
}

// Renders a two-column label/value row for receipt-style summary tables.
function buildSummaryRow(label: string, value: string): string {
  return `
    <tr>
      <td style="padding:8px 16px 8px 0;font-size:13px;color:#9b7f6a;white-space:nowrap;vertical-align:top;">${label}</td>
      <td style="padding:8px 0;font-size:13px;color:#4c3523;font-weight:500;">${value}</td>
    </tr>`;
}

export async function sendContactEmail(options: ContactEmailOptions) {
  const subject = options.subject.trim();
  const supportEmail = getSupportEmail();

  if (!supportEmail) {
    throw new EmailConfigurationError("Missing SUPPORT_EMAIL configuration.");
  }

  // Internal alert — plain layout is fine for admin inboxes.
  const html = `
    <h2 style="margin:0 0 16px;font-size:18px;">PsychVault contact enquiry</h2>
    <table cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;margin-bottom:16px;">
      ${buildSummaryRow("Name", htmlEscape(options.name))}
      ${buildSummaryRow("Email", htmlEscape(options.email))}
      ${buildSummaryRow("Subject", htmlEscape(subject))}
    </table>
    <p style="margin:0 0 6px;font-size:13px;color:#9b7f6a;">Message</p>
    <p style="margin:0;font-size:14px;color:#4c3523;white-space:pre-wrap;">${htmlEscape(options.message)}</p>
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
    html: buildEmailLayout(html),
    text,
    replyTo: options.email,
    tags: [
      { name: "type", value: "contact" },
      { name: "channel", value: "support-form" },
    ],
  });
}

// ─── Email verification ───────────────────────────────────────────────────────

function buildVerificationEmail(options: VerificationEmailOptions) {
  const content = `
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#4c3523;letter-spacing:-0.3px;">Verify your email address</h1>
    <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#6b4f3a;">Hi ${htmlEscape(options.name)},</p>
    <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#6b4f3a;">
      Thanks for joining PsychVault. Please verify your email to unlock your full account — including purchasing and downloading resources, writing reviews, and messaging creators.
    </p>
    ${buildEmailButton("Verify my email", htmlEscape(options.verificationUrl))}
    <p style="margin:20px 0 0;font-size:13px;line-height:1.6;color:#9b7f6a;">
      Button not working? Copy and paste this link into your browser:<br/>
      <a href="${htmlEscape(options.verificationUrl)}" style="color:#c47f2c;word-break:break-all;">${htmlEscape(options.verificationUrl)}</a>
    </p>
    <p style="margin:16px 0 0;font-size:13px;line-height:1.5;color:#b09070;">
      If you did not create a PsychVault account, you can safely ignore this email.
    </p>
  `;

  const text = [
    `Hi ${options.name},`,
    "",
    "Thanks for joining PsychVault. Please verify your email address by opening the link below:",
    "",
    options.verificationUrl,
    "",
    "If you didn't create a PsychVault account, you can safely ignore this email.",
  ].join("\n");

  return {
    to: options.email,
    subject: "Verify your PsychVault email address",
    html: buildEmailLayout(content, {
      preheader: "Tap to verify your email and unlock your full PsychVault account.",
    }),
    text,
    tags: [{ name: "type", value: "verification" }] as EmailTag[],
  };
}

export async function sendVerificationEmail(options: VerificationEmailOptions) {
  return sendEmail(buildVerificationEmail(options));
}

export async function trySendVerificationEmail(options: VerificationEmailOptions) {
  return trySendEmail(buildVerificationEmail(options));
}

// ─── Password reset ───────────────────────────────────────────────────────────

type PasswordResetEmailOptions = {
  email: string;
  name: string;
  resetUrl: string;
};

function buildPasswordResetEmail(options: PasswordResetEmailOptions) {
  const content = `
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#4c3523;letter-spacing:-0.3px;">Reset your password</h1>
    <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#6b4f3a;">Hi ${htmlEscape(options.name)},</p>
    <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#6b4f3a;">
      We received a request to reset the password for your PsychVault account. Click the button below to choose a new password.
    </p>
    ${buildEmailButton("Reset my password", htmlEscape(options.resetUrl))}
    <p style="margin:20px 0 0;font-size:13px;line-height:1.6;color:#9b7f6a;">
      Button not working? Copy and paste this link into your browser:<br/>
      <a href="${htmlEscape(options.resetUrl)}" style="color:#c47f2c;word-break:break-all;">${htmlEscape(options.resetUrl)}</a>
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:24px;">
      <tr>
        <td style="background-color:#fdf3e3;border:1px solid #e8d5c0;border-radius:8px;padding:14px 16px;font-size:13px;color:#6b4f3a;line-height:1.5;">
          This link expires in <strong>1 hour</strong>. If you did not request a password reset, no action is needed — your account is safe.
        </td>
      </tr>
    </table>
  `;

  const text = [
    `Hi ${options.name},`,
    "",
    "We received a request to reset your PsychVault password.",
    "Open this link to choose a new password (expires in 1 hour):",
    "",
    options.resetUrl,
    "",
    "If you did not request this, you can safely ignore this email.",
  ].join("\n");

  return {
    to: options.email,
    subject: "Reset your PsychVault password",
    html: buildEmailLayout(content, {
      preheader: "Use this link to set a new password for your PsychVault account.",
    }),
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

  const content = `
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#4c3523;letter-spacing:-0.3px;">
      ${options.isFree ? "Resource added to your library" : "Purchase confirmed"}
    </h1>
    <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#6b4f3a;">Hi ${htmlEscape(options.buyerName)},</p>
    <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#6b4f3a;">
      ${options.isFree
        ? "Your free resource has been added to your library and is ready to download."
        : "Your payment was processed successfully. Your resource is in your library and ready to download."}
    </p>

    <!-- Order summary -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#fdf5ea;border:1px solid #e8d5c0;border-radius:10px;margin-bottom:28px;">
      <tr>
        <td style="padding:20px 20px 4px;">
          <p style="margin:0 0 12px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.8px;color:#9b7f6a;">Order summary</p>
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            ${buildSummaryRow("Resource", htmlEscape(options.resourceTitle))}
            ${buildSummaryRow("Creator", htmlEscape(options.storeName))}
            ${buildSummaryRow("Amount", htmlEscape(priceLabel))}
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding:4px 20px 16px;">
          &nbsp;
        </td>
      </tr>
    </table>

    ${buildEmailButton("Go to my library", libraryUrl)}

    <p style="margin:20px 0 0;font-size:13px;line-height:1.6;color:#9b7f6a;">
      You can also <a href="${resourceUrl}" style="color:#c47f2c;text-decoration:underline;">view the resource page</a> or reply to this email if you have any questions.
    </p>
  `;

  const text = [
    `Hi ${options.buyerName},`,
    "",
    options.isFree
      ? "Your free resource has been added to your library and is ready to download."
      : "Your PsychVault purchase is confirmed.",
    "",
    `Resource: ${options.resourceTitle}`,
    `Creator: ${options.storeName}`,
    `Amount: ${priceLabel}`,
    "",
    `Go to your library: ${libraryUrl}`,
  ].join("\n");

  return {
    to: options.buyerEmail,
    subject: options.isFree
      ? `Added to your library: ${options.resourceTitle}`
      : `Purchase confirmed: ${options.resourceTitle}`,
    html: buildEmailLayout(content, {
      preheader: options.isFree
        ? `${options.resourceTitle} is now in your library.`
        : `Your purchase of ${options.resourceTitle} is confirmed. Go to your library to download.`,
      unsubscribeUrl,
    }),
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
    options.messagePreview.length > 200
      ? options.messagePreview.slice(0, 200) + "…"
      : options.messagePreview;

  const content = `
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#4c3523;letter-spacing:-0.3px;">New message</h1>
    <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#6b4f3a;">Hi ${htmlEscape(options.recipientName)},</p>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#6b4f3a;">
      <strong style="color:#4c3523;">${htmlEscape(options.senderName)}</strong> sent you a message on PsychVault:
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:24px;">
      <tr>
        <td style="background-color:#fdf5ea;border-left:3px solid #c47f2c;border-radius:0 8px 8px 0;padding:14px 16px;font-size:14px;color:#4c3523;line-height:1.6;font-style:italic;">
          ${htmlEscape(preview)}
        </td>
      </tr>
    </table>
    ${buildEmailButton("View conversation", inboxUrl)}
    <p style="margin:20px 0 0;font-size:13px;line-height:1.5;color:#b09070;">
      You are receiving this because you have message notifications enabled. To turn them off, visit your account settings or use the link below.
    </p>
  `;

  const text = [
    `Hi ${options.recipientName},`,
    "",
    `${options.senderName} sent you a message on PsychVault:`,
    "",
    `"${preview}"`,
    "",
    `Reply here: ${inboxUrl}`,
  ].join("\n");

  return {
    to: options.recipientEmail,
    subject: `New message from ${options.senderName}`,
    html: buildEmailLayout(content, {
      preheader: `${options.senderName}: ${preview.slice(0, 80)}`,
      unsubscribeUrl,
    }),
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
  const content = `
    <h1 style="margin:0 0 20px;font-size:20px;font-weight:700;color:#4c3523;">New refund request</h1>
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#fdf5ea;border:1px solid #e8d5c0;border-radius:10px;margin-bottom:20px;">
      <tr>
        <td style="padding:20px 20px 4px;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            ${buildSummaryRow("Buyer", `${htmlEscape(options.buyerName)} &lt;${htmlEscape(options.buyerEmail)}&gt;`)}
            ${buildSummaryRow("Resource", htmlEscape(options.resourceTitle))}
            ${buildSummaryRow("Reason", htmlEscape(options.reason))}
            ${options.message ? buildSummaryRow("Message", htmlEscape(options.message).replace(/\n/g, "<br/>")) : ""}
            ${buildSummaryRow("Purchase ID", `<code style="font-family:monospace;font-size:12px;">${htmlEscape(options.purchaseId)}</code>`)}
          </table>
        </td>
      </tr>
      <tr><td style="padding:4px 20px 16px;">&nbsp;</td></tr>
    </table>
    <p style="margin:0;font-size:13px;color:#9b7f6a;">Review this in the admin panel and reply to the buyer directly if needed.</p>
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
    html: buildEmailLayout(content),
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
