// /functions/subscribe.js
// Cloudflare Pages Function — handles email subscription form submissions
// Validates input, enforces consent, writes to D1, sends confirmation via Resend

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const body = await request.json();
    const { email, consentGiven } = body;

    // ── Validation: fail closed, fail clearly ──
    if (!email || typeof email !== 'string') {
      return jsonResponse(false, "Missing or invalid email.");
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
      return jsonResponse(false, "That doesn't look like a valid email address.");
    }

    if (consentGiven !== true) {
      return jsonResponse(false, "Consent is required to subscribe.");
    }

    const normalizedEmail = email.trim().toLowerCase();
    const ipAddress = request.headers.get('CF-Connecting-IP') || 'unknown';
    const now = new Date().toISOString();
    const consentTextVersion = "v1.0-2026-06-20";

    // ── Pre-write check: look up email before attempting any write ──
    const existing = await env.DB.prepare(
      `SELECT id, status, unsubscribed_timestamp, cold_outreach FROM subscribers WHERE email = ?`
    ).bind(normalizedEmail).first();

    if (existing) {
      // Hard stop: unsubscribed email — manual reactivation only
      if (existing.unsubscribed_timestamp) {
        return jsonResponse(false, "This email was previously unsubscribed. Please contact support at help@turnthisshitoff.com to reactivate.");
      }

      // Cold outreach row exists and is active — UPSERT: convert to full subscriber
      if (existing.cold_outreach === 1) {
        await env.DB.prepare(
          `UPDATE subscribers
           SET consent_given = 1,
               consent_text_version = ?,
               consent_timestamp = ?,
               submission_timestamp = ?,
               ip_address = ?,
               status = 'active'
           WHERE id = ? AND unsubscribed_timestamp IS NULL`
        ).bind(consentTextVersion, now, now, ipAddress, existing.id).run();

        let emailSent = true;
        try {
          await sendConfirmationEmail(normalizedEmail, env.RESEND_API_KEY);
        } catch (e) {
          emailSent = false;
        }

        return jsonResponse(
          true,
          emailSent
            ? "You're on the list. Check your inbox for a confirmation."
            : "You're on the list — though our confirmation email may be delayed."
        );
      }

      // Active non-cold-outreach subscriber — already subscribed
      return jsonResponse(false, "This email is already subscribed.");
    }

    // ── No existing row — insert as normal ──
    try {
      await env.DB.prepare(
        `INSERT INTO subscribers
          (email, consent_given, consent_text_version, consent_timestamp, submission_timestamp, ip_address, status)
         VALUES (?, ?, ?, ?, ?, ?, 'active')`
      ).bind(
        normalizedEmail,
        1,
        consentTextVersion,
        now,
        now,
        ipAddress
      ).run();

    } catch (dbError) {
      return jsonResponse(false, "We couldn't save your subscription. Please try again.");
    }

    // ── D1 write succeeded. Now attempt the confirmation email. ──
    // IMPORTANT: the subscription is already saved at this point.
    // If the email fails to send, we do NOT undo the subscription —
    // we just log it and let the user know separately.
    let emailSent = true;
    try {
      await sendConfirmationEmail(normalizedEmail, env.RESEND_API_KEY);
    } catch (emailError) {
      emailSent = false;
    }

    return jsonResponse(
      true,
      emailSent
        ? "You're on the list. Check your inbox for a confirmation."
        : "You're on the list — though our confirmation email may be delayed."
    );

  } catch (err) {
    return jsonResponse(false, "Something went wrong. Your request was not saved.");
  }
}

async function sendConfirmationEmail(toEmail, apiKey) {
  const unsubscribeUrl = `https://turnthisshitoff.com/unsubscribe?email=${encodeURIComponent(toEmail)}`;

  const html = `
  <div style="background:#0A0A0A; padding:40px 20px; font-family:Arial,sans-serif;">
    <div style="max-width:480px; margin:0 auto; background:#111111; border:1px solid #2A2A2A; border-radius:4px; padding:32px;">
      <p style="color:#D4AF37; font-size:11px; letter-spacing:2px; text-transform:uppercase; margin:0 0 16px;">MadeUp MonkeyShit</p>
      <h1 style="color:#F2F2F2; font-size:22px; font-style:italic; margin:0 0 16px; font-weight:normal;">You're in.</h1>
      <p style="color:#C8C8C8; font-size:14px; line-height:1.6; margin:0 0 16px;">
        Thanks for subscribing. You'll get an email the moment new music drops — nothing more, nothing less.
      </p>
      <p style="color:#888888; font-size:12px; line-height:1.6; margin:24px 0 0;">
        Didn't sign up for this? <a href="${unsubscribeUrl}" style="color:#D4AF37;">Unsubscribe here</a>.
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
      subject: "You're on the list",
      html: html
    })
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`Resend API error: ${response.status} — ${errBody}`);
  }
}

function jsonResponse(success, message) {
  return new Response(JSON.stringify({ success, message }), {
    status: success ? 200 : 400,
    headers: { 'Content-Type': 'application/json' }
  });
}
