"use server";

import { connectDB } from "@/lib/mongodb";
import { AttendeeModel } from "@/lib/models/Attendee";
import { encryptId } from "@/lib/crypto";
import { getBaseUrl } from "@/lib/baseUrl";
import { buildThankYouEmail } from "@/lib/emailTemplate";
import { checkAdminSession } from "@/lib/actions";
import nodemailer from "nodemailer";
import QRCode from "qrcode";

interface SendResult {
  success: boolean;
  message: string;
}

interface BulkSendResult {
  success: boolean;
  message: string;
  sent: number;
  skipped: number;
  failed: number;
  errors: { id: string; name: string; error: string }[];
}

function getEmailFrom(): string {
  return process.env.EMAIL_FROM || "Heritage Without Borders <hwbsanfo101@gmail.com>";
}

async function sendViaBrevo({
  to,
  subject,
  html,
  qrBuffer,
}: {
  to: string;
  subject: string;
  html: string;
  qrBuffer: Buffer;
}): Promise<{ ok: boolean; error?: string }> {
  const smtpLogin = process.env.BREVO_SMTP_LOGIN;
  const smtpKey = process.env.BREVO_SMTP_KEY;

  if (!smtpLogin || !smtpKey) {
    return { ok: false, error: "BREVO_SMTP_LOGIN or BREVO_SMTP_KEY env var is not configured." };
  }

  try {
    const transporter = nodemailer.createTransport({
      host: "smtp-relay.brevo.com",
      port: 587,
      secure: false,
      auth: {
        user: smtpLogin,
        pass: smtpKey,
      },
    });

    await transporter.sendMail({
      from: getEmailFrom(),
      to,
      subject,
      html,
      attachments: [
        {
          filename: "qrcode.png",
          content: qrBuffer,
          cid: "qrcode",
        },
      ],
    });

    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return { ok: false, error: message };
  }
}

async function sendThankYouToAttendee(attendeeId: string): Promise<{
  ok: boolean;
  error?: string;
  name?: string;
}> {
  await connectDB();
  const doc = await AttendeeModel.findOne({ attendeeId }).lean<{
    name?: string;
    email?: string;
  } | null>();

  if (!doc) return { ok: false, error: "Attendee not found." };
  if (!doc.email?.trim()) {
    return { ok: false, error: "Attendee has no email address.", name: doc.name };
  }

  const token = encryptId(attendeeId);
  const baseUrl = getBaseUrl();
  const attendeeUrl = `${baseUrl}/?id=${encodeURIComponent(token)}`;

  const qrBuffer = await QRCode.toBuffer(attendeeUrl, {
    type: "png",
    width: 512,
    margin: 2,
    color: { dark: "#5C1A1A", light: "#FFFFFF" },
  });

  const { subject, html } = buildThankYouEmail({
    name: doc.name ?? "Attendee",
    attendeeUrl,
    qrCid: "qrcode",
  });

  const result = await sendViaBrevo({ to: doc.email.trim(), subject, html, qrBuffer });
  if (!result.ok) return { ok: false, error: result.error, name: doc.name };

  await AttendeeModel.updateOne(
    { attendeeId },
    { $set: { lastEmailSentAt: new Date() } }
  );

  return { ok: true, name: doc.name };
}

export async function sendThankYouEmail(attendeeId: string): Promise<SendResult> {
  const isAdmin = await checkAdminSession();
  if (!isAdmin) return { success: false, message: "Unauthorized." };

  const result = await sendThankYouToAttendee(attendeeId);
  if (!result.ok) {
    return { success: false, message: result.error || "Failed to send email." };
  }
  return {
    success: true,
    message: `Thank-you email sent to ${result.name ?? attendeeId}.`,
  };
}

export async function sendBulkThankYouEmails({
  skipAlreadySent = true,
}: {
  skipAlreadySent?: boolean;
} = {}): Promise<BulkSendResult> {
  const isAdmin = await checkAdminSession();
  if (!isAdmin) {
    return {
      success: false,
      message: "Unauthorized.",
      sent: 0,
      skipped: 0,
      failed: 0,
      errors: [],
    };
  }

  const smtpLogin = process.env.BREVO_SMTP_LOGIN;
  const smtpKey = process.env.BREVO_SMTP_KEY;

  if (!smtpLogin || !smtpKey) {
    return {
      success: false,
      message: "BREVO_SMTP_LOGIN or BREVO_SMTP_KEY env var is not configured.",
      sent: 0,
      skipped: 0,
      failed: 0,
      errors: [],
    };
  }

  await connectDB();
  const filter: Record<string, unknown> = { email: { $exists: true, $ne: "" } };
  if (skipAlreadySent) {
    filter.$or = [{ lastEmailSentAt: null }, { lastEmailSentAt: { $exists: false } }];
  }
  const docs = await AttendeeModel.find(filter)
    .select({ attendeeId: 1, name: 1, email: 1 })
    .lean<{ attendeeId: string; name: string; email: string }[]>();

  let sent = 0;
  let failed = 0;
  let skipped = 0;
  const errors: { id: string; name: string; error: string }[] = [];

  for (const doc of docs) {
    if (!doc.email?.trim()) {
      skipped++;
      continue;
    }
    const result = await sendThankYouToAttendee(doc.attendeeId);
    if (result.ok) {
      sent++;
    } else {
      failed++;
      errors.push({
        id: doc.attendeeId,
        name: doc.name,
        error: result.error || "Unknown error",
      });
    }
    // Gmail rate limit: ~100-200 emails/day for free accounts. Pace at 1s.
    await new Promise((r) => setTimeout(r, 1000));
  }

  const success = failed === 0;
  const summary = success
    ? `Sent ${sent} email${sent === 1 ? "" : "s"}.`
    : `Sent ${sent}, failed ${failed}${skipped ? `, skipped ${skipped}` : ""}.`;

  return { success, message: summary, sent, skipped, failed, errors };
}
