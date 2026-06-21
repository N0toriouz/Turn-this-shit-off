// /functions/admin-send-notification.js
// Cloudflare Pages Function — sends a system/broadcast notification
// to every active subscriber. Triggered from the admin page's
// "System Notification" section.

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const body = await request.json();
    const { subject, attentionTo, messageBody } = body;

    if (!subject || !messageBody) {
      return jsonResponse(false, "Subject and message body are required.");
    }

    // ── Pull every active subscriber ──
    const { results: subscribers } = await env.DB.prepare(
      `SELECT email FROM subscribers WHERE status = 'active'`
    ).all();

    if (!subscribers || subscribers.length === 0) {
      return jsonResponse(false, "No active subscribers to send to.");
    }

    // ── Send to each subscriber individually ──
    // (Individual sends, not one bulk "to" list, so each person gets
    // their own unique unsubscribe link and no one sees other recipients.)
    let sentCount = 0;
    let failedCount = 0;

    for (const sub of subscribers) {
      try {
        await sendNotificationEmail(sub.email, subject, attentionTo, messageBody, env.RESEND_API_KEY);
        sentCount++;
      } catch (e) {
        failedCount++;
      }
    }

    if (sentCount === 0) {
      return jsonResponse(false, `Failed to send to all ${failedCount} subscriber(s).`);
    }

    return jsonResponse(
      true,
      `Sent to ${sentCount} subscriber(s).${failedCount > 0 ? ` ${failedCount} failed.` : ''}`
    );

  } catch (err) {
    return jsonResponse(false, "Something went wrong. No emails were sent.");
  }
}

async function sendNotificationEmail(toEmail, subject, attentionTo, messageBody, apiKey) {
  const unsubscribeUrl = `https://turnthisshitoff.com/unsubscribe?email=${encodeURIComponent(toEmail)}`;

  const html = `
  <div style="background:#0A0A0A; padding:40px 20px; font-family:Arial,sans-serif;">
    <div style="max-width:480px; margin:0 auto; background:#111111; border:1px solid #2A2A2A; border-radius:4px; padding:32px;">
      <p style="color:#D4AF37; font-size:11px; letter-spacing:2px; text-transform:uppercase; margin:0 0 16px;">MadeUp MonkeyShit</p>
      ${attentionTo ? `<p style="color:#888888; font-size:11px; margin:0 0 12px; text-transform:uppercase; letter-spacing:1px;">Attn: ${escapeHtml(attentionTo)}</p>` : ''}
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
