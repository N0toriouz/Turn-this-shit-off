// /functions/unsubscribe.js
// Cloudflare Pages Function — handles self-service unsubscribe requests
// Triggered via a unique link in every email: /unsubscribe?email=...
// Now also sends a confirmation email per governing rule 5.3.

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const email = url.searchParams.get('email');

  if (!email) {
    return htmlResponse(false, "No email address provided.");
  }

  const normalizedEmail = email.trim().toLowerCase();

  try {
    const now = new Date().toISOString();

    const result = await env.DB.prepare(
      `UPDATE subscribers
       SET status = 'unsubscribed', unsubscribed_timestamp = ?
       WHERE email = ? AND status = 'active'`
    ).bind(now, normalizedEmail).run();

    if (result.meta.changes === 0) {
      return htmlResponse(true, "You're unsubscribed (or already were). You won't receive any more emails from us.");
    }

    // Send confirmation — best-effort, doesn't block the response either way
    try {
      await sendUnsubscribeConfirmation(normalizedEmail, now, env.RESEND_API_KEY);
    } catch (e) {
      // Confirmation failing doesn't change the unsubscribe outcome
    }

    return htmlResponse(true, "You've been unsubscribed. You won't receive any more emails from us. A confirmation has been sent to your inbox.");

  } catch (err) {
    return htmlResponse(false, "Something went wrong. Please try again, or reach out at help@turnthisshitoff.com.");
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

function htmlResponse(success, message) {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Unsubscribed — MadeUp MonkeyShit</title>
<link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Inter:wght@300;400&display=swap" rel="stylesheet">
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
background: #0A0A0A;
color: #C8C8C8;
font-family: 'Inter', sans-serif;
min-height: 100vh;
display: flex;
align-items: center;
justify-content: center;
padding: 2rem;
text-align: center;
}
.card { max-width: 440px; }
h1 {
font-family: 'DM Serif Display', serif;
font-style: italic;
color: #F2F2F2;
font-size: 1.6rem;
margin-bottom: 1rem;
}
p { font-size: 0.95rem; line-height: 1.6; color: #888888; margin-bottom: 1.5rem; }
a {
color: #D4AF37;
text-decoration: none;
font-size: 0.8rem;
letter-spacing: 0.08em;
text-transform: uppercase;
}
</style>
</head>
<body>
<div class="card">
<h1>${success ? "Done." : "Hmm."}</h1>
<p>${message}</p>
<a href="/">← Back to MadeUp MonkeyShit</a>
</div>
</body>
</html>`;

  return new Response(html, {
    status: success ? 200 : 400,
    headers: { 'Content-Type': 'text/html' }
  });
}
