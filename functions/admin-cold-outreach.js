// /functions/admin-cold-outreach.js
// Cloudflare Pages Function — sends a one-off cold outreach email
// to a single address not yet in the subscriber database.
// Protected implicitly by Cloudflare Access on the /admin path.

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const body = await request.json();
    const { to, subject, messageBody } = body;

    if (!to || !subject || !messageBody) {
      return jsonResponse(false, "To, Subject, and Message are all required.");
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(to)) {
      return jsonResponse(false, "That doesn't look like a valid email address.");
    }

    const normalizedEmail = to.trim().toLowerCase();
    const now = new Date().toISOString();

    // ── Pre-send database check ──
    const existing = await env.DB.prepare(
      `SELECT id, unsubscribed_timestamp FROM subscribers WHERE email = ?`
    ).bind(normalizedEmail).first();

    if (existing) {
      // Hard stop: previously unsubscribed — manual review required
      if (existing.unsubscribed_timestamp) {
        return jsonResponse(false, "This email has a previous unsubscribe on record. Manual review is required before contacting this address.");
      }

      // Already in database and active — do not duplicate
      return jsonResponse(false, "This email is already in the subscriber database. Use the broadcast function to reach existing subscribers.");
    }

    // ── Email not in database — create cold outreach row, then send ──
    await env.DB.prepare(
      `INSERT INTO subscribers
        (email, consent_given, consent_text_version, consent_timestamp,
         submission_timestamp, ip_address, status, cold_outreach, cold_date)
       VALUES (?, 0, NULL, NULL, NULL, NULL, 'active', 1, ?)`
    ).bind(normalizedEmail, now).run();

    // ── Attempt send ──
    try {
      await sendColdOutreachEmail(normalizedEmail, subject, messageBody, env.RESEND_API_KEY);
    } catch (emailError) {
      // Row was written — flag the send failure clearly
      return jsonResponse(false, `Row created in database, but email failed to send: ${emailError.message}`);
    }

    return jsonResponse(true, `Cold outreach sent to ${normalizedEmail}.`);

  } catch (err) {
    return jsonResponse(false, "Something went wrong. No action was taken.");
  }
}

async function sendColdOutreachEmail(toEmail, subject, messageBody, apiKey) {
  const unsubscribeUrl = `https://turnthisshitoff.com/unsubscribe?email=${encodeURIComponent(toEmail)}`;

  const html = `
  <div style="background:#0A0A0A; padding:40px 20px; font-family:Arial,sans-serif;">
    <div style="max-width:480px; margin:0 auto; background:#111111; border:1px solid #2A2A2A; border-radius:4px; padding:32px;">
      <p style="color:#D4AF37; font-size:11px; letter-spacing:2px; text-transform:uppercase; margin:0 0 16px;">MadeUp MonkeyShit</p>
      <h1 style="color:#F2F2F2; font-size:22px; font-style:italic; margin:0 0 16px; font-weight:normal;">${escapeHtml(subject)}</h1>
      <p style="color:#C8C8C8; font-size:14px; line-height:1.6; margin:0 0 16px; white-space:pre-wrap;">${escapeHtml(messageBody)}</p>
      <p style="color:#888888; font-size:12px; line-height:1.6; margin:24px 0 0;">
        <a href="${unsubscribeUrl}" style="color:#D4AF37;">Unsubscribe</a> from these emails.
      </p>
    </div>
  </div>`;

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: 'MadeUp MonkeyShit <no-reply@turnthisshitoff.com>',
      to: [toEmail],
      subject: subject,
      html: html
    })
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`Resend API error: ${response.status} — ${errBody}`);
  }
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function jsonResponse(success, message) {
  return new Response(JSON.stringify({ success, message }), {
    status: success ? 200 : 400,
    headers: { 'Content-Type': 'application/json' }
  });
}