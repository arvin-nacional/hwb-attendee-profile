interface ThankYouEmailParams {
  name: string;
  attendeeUrl: string;
}

export interface BuiltEmail {
  subject: string;
  html: string;
}

const HEADER_IMAGE_URL =
  "https://mcusercontent.com/586325cac2d38d2d2412ce5ec/images/7aea13f3-2e83-2a21-c21c-5ac7dcb21e9f.png";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function buildThankYouEmail({
  name,
  attendeeUrl,
}: ThankYouEmailParams): BuiltEmail {
  const safeName = escapeHtml(name);
  const safeAttendeeUrl = escapeHtml(attendeeUrl);

  const html = `<!-- Heritage Without Borders - Thank You & Downloads -->
<div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:24px auto;color:#1F2937;font-size:14px;line-height:1.6;background-color:#ffffff;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">

<!-- Header Image -->
<table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%">
	<tbody>
		<tr>
			<td><img alt="Heritage Without Borders" src="${HEADER_IMAGE_URL}" style="display:block;width:100%;max-width:600px;height:auto;border:0;" width="600" /></td>
		</tr>
	</tbody>
</table>

<!-- Body -->
<div style="padding:24px;">

<!-- Fallback Header Text -->
<p style="margin:0 0 4px 0;font-size:11px;letter-spacing:2px;color:#800000;font-weight:bold;text-transform:uppercase;">Thank You</p>
<h2 style="margin:0 0 4px 0;font-size:22px;font-weight:bold;color:#1F2937;font-family:Arial,Helvetica,sans-serif;">Your Presentations &amp; Certificate Are Ready</h2>
<p style="margin:0 0 20px 0;font-size:15px;color:#6B7280;">Heritage Without Borders</p>

<!-- Greeting & Body -->
<p style="margin:0 0 16px 0;">Hello, <strong>${safeName}</strong>,</p>

<p style="margin:0 0 16px 0;">Thank you for being part of <strong>Heritage Without Borders</strong>. We hope the lectures, sessions, and conversations left you inspired and enriched.</p>

<p style="margin:0 0 12px 0;">As promised, we have prepared the following for you:</p>

<ul style="margin:0 0 16px 0;padding-left:22px;">
	<li style="padding:4px 0;">Presentation decks from the event sessions</li>
	<li style="padding:4px 0;">Your personalized <strong>Certificate of Attendance</strong></li>
</ul>

<p style="margin:0 0 16px 0;">To access your downloads, kindly complete a short <strong>evaluation form</strong>. Your feedback helps us shape future Heritage Without Borders gatherings.</p>

<!-- Attendee Profile / Evaluation Button -->
<table border="0" cellpadding="0" cellspacing="0" role="presentation" style="margin:20px 0;" width="100%">
	<tbody>
		<tr>
			<td align="center">
			<table border="0" cellpadding="0" cellspacing="0" role="presentation">
				<tbody>
					<tr>
						<td bgcolor="#800000" style="border-radius:6px;"><a href="${safeAttendeeUrl}" style="display:inline-block;padding:14px 36px;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#ffffff;text-decoration:none;font-weight:bold;" target="_blank">Complete Evaluation &amp; Download Files</a></td>
					</tr>
				</tbody>
			</table>
			</td>
		</tr>
	</tbody>
</table>

<!-- How It Works -->
<table border="0" cellpadding="0" cellspacing="0" role="presentation" style="margin:20px 0;width:100%;background-color:#F9FAFB;border-left:4px solid #6B7280;border-radius:4px;">
	<tbody>
		<tr>
			<td style="padding:16px 20px;">
			<p style="margin:0 0 12px 0;color:#374151;font-weight:bold;">HOW IT WORKS</p>

			<table border="0" cellpadding="0" cellspacing="0" role="presentation" style="width:100%;font-size:14px;">
				<tbody>
					<tr>
						<td style="padding:6px 0;width:32px;font-weight:bold;vertical-align:top;color:#800000;">1.</td>
						<td style="padding:6px 0;vertical-align:top;">Open your attendee profile via the button above.</td>
					</tr>
					<tr>
						<td colspan="2" style="padding:0;border-bottom:1px solid #E5E7EB;"></td>
					</tr>
					<tr>
						<td style="padding:6px 0;font-weight:bold;vertical-align:top;color:#800000;">2.</td>
						<td style="padding:6px 0;vertical-align:top;">Answer the brief evaluation form (takes about 2&ndash;3 minutes).</td>
					</tr>
					<tr>
						<td colspan="2" style="padding:0;border-bottom:1px solid #E5E7EB;"></td>
					</tr>
					<tr>
						<td style="padding:6px 0;font-weight:bold;vertical-align:top;color:#800000;">3.</td>
						<td style="padding:6px 0;vertical-align:top;">Once submitted, your <strong>presentations</strong> and <strong>certificate</strong> become available for download.</td>
					</tr>
				</tbody>
			</table>
			</td>
		</tr>
	</tbody>
</table>

<!-- Support -->
<p style="margin:0 0 16px 0;">If you encounter any issues accessing your files, please reach out through our official website and our team will be glad to help.</p>

<!-- Closing -->
<p style="margin:0 0 16px 0;">Thank you again for being part of Heritage Without Borders. We look forward to welcoming you to future gatherings.</p>

<p style="margin:0;">Warm regards,<br />
<strong>Heritage Without Borders Team</strong></p>

</div>
</div>
<!-- End Heritage Without Borders - Thank You & Downloads -->`;

  return {
    subject: "Your Heritage Without Borders Presentations & Certificate",
    html,
  };
}
