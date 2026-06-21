// /functions/admin-unsubscribe.js
// Cloudflare Pages Function — manually unsubscribes a specific subscriber
// by ID, triggered from the admin search results table. Sends a
// confirmation email with the unsubscribe timestamp, per governing rule 5.3.

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return jsonResponse(false, "Missing subscriber ID.");
    }

    const now = new Date().toISOString();

    const result = await env.DB.prepare(
      `UPDATE subscribers
       SET status = 'unsubscribed', unsubscribed_timestamp = ?
       WHERE id = ? AND status = 'active'`
    ).bind(now, id).run();

    if (result.meta.changes === 0) {
      return jsonResponse(false, "Subscriber not found, or already unsubscribed.");
    }

    // Look up the email so we can send the confirmation
    const subscriber = await env.DB.prepare(
      `SELECT email FROM subscribers WHERE id = ?`
    ).bind(id).first();

    let emailSent = true;
    if (subscriber && subscriber.email) {
      try {
        await sendUnsubscribeConfirmation(subscriber.email, now, env.RESEND_API_KEY);
      } catch (e) {
        emailSent = false;
      }
    }

    return jsonResponse(true, emailSent ? "Unsubscribed and confirmation sent." : "Unsubscribed, but confirmation email failed to send.");

  } catch (err) {
    return jsonResponse(false, "Something went wrong. No changes were made.");
  }
}

async function sendUnsubscribeConfirmation(toEmail, timestamp, apiKey) {
  const formattedDate = new Date(timestamp).toLocaleString('en-US', {
    dateStyle: 'long',
    timeStyle: 'short'
  });

  const html = `
  <div style="background:#0A0A0A; padding:40px 20px; font-family:Arial,sans-serif;">
    <div style="max-width:480px; margin:0 auto; background:#111111; border:1px solid #2A2A2A; border-radius:4px; padding:32px;">
      <p style="color:#D4AF37; font-size:11px; letter-spacing:2px; text-transform:uppercase; margin:0 0 16px;">MadeUp MonkeyShit</p>
      <h1 style="color:#F2F2F2; font-size:22px; font-style:italic; margin:0 0 16px; font-weight:normal;">You're unsubscribed.</h1>
      <p style="color:#C8C8C8; font-size:14px; line-height:1.6; margin:0 0 16px;">
        This confirms you were unsubscribed from MadeUp MonkeyShit release updates on ${formattedDate}. You won't receive any further emails from us.
      </p>
      <p style="color:#888888; font-size:12px; line-height:1.6; margin:24px 0 0;">
        Change your mind? You can always resubscribe at <a href="https://turnthisshitoff.com" style="color:#D4AF37;">turnthisshitoff.com</a>.
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
      subject: "You've been unsubscribed",
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
