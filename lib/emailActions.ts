"use server";

import { connectDB } from "@/lib/mongodb";
import { AttendeeModel } from "@/lib/models/Attendee";
import { encryptId } from "@/lib/crypto";
import { getBaseUrl } from "@/lib/baseUrl";
import { buildThankYouEmail } from "@/lib/emailTemplate";
import { checkAdminSession } from "@/lib/actions";

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

interface ResendErrorBody {
  message?: string;
  name?: string;
}

const RESEND_ENDPOINT = "https://api.resend.com/emails";
const DEFAULT_FROM = "Heritage Without Borders <onboarding@resend.dev>";

function getResendKey(): string | null {
  return process.env.RESEND_API || process.env.RESEND_API_KEY || null;
}

function getEmailFrom(): string {
  return process.env.EMAIL_FROM || DEFAULT_FROM;
}

async function sendViaResend({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}): Promise<{ ok: boolean; error?: string }> {
  const apiKey = getResendKey();
  if (!apiKey) {
    return { ok: false, error: "RESEND_API env var is not configured." };
  }

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: getEmailFrom(),
        to: [to],
        subject,
        html,
      }),
    });

    if (!res.ok) {
      let detail = res.statusText;
      try {
        const body = (await res.json()) as ResendErrorBody;
        detail = body.message || body.name || detail;
      } catch {
        // ignore body parse error
      }
      return { ok: false, error: `Resend API ${res.status}: ${detail}` };
    }

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
  const qrUrl = `${baseUrl}/api/qr/${encodeURIComponent(token)}`;

  const { subject, html } = buildThankYouEmail({
    name: doc.name ?? "Attendee",
    qrUrl,
    attendeeUrl,
  });

  const result = await sendViaResend({ to: doc.email.trim(), subject, html });
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

  if (!getResendKey()) {
    return {
      success: false,
      message: "RESEND_API env var is not configured.",
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
    // Resend free-tier rate limit: 2 req/sec. Pace at ~500ms.
    await new Promise((r) => setTimeout(r, 550));
  }

  const success = failed === 0;
  const summary = success
    ? `Sent ${sent} email${sent === 1 ? "" : "s"}.`
    : `Sent ${sent}, failed ${failed}${skipped ? `, skipped ${skipped}` : ""}.`;

  return { success, message: summary, sent, skipped, failed, errors };
}
