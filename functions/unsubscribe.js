// /functions/unsubscribe.js
// Cloudflare Pages Function — handles unsubscribe requests
// Triggered via a unique link in every email: /unsubscribe?email=...

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const email = url.searchParams.get('email');

  if (!email) {
    return htmlResponse(false, "No email address provided.");
  }

  const normalizedEmail = email.trim().toLowerCase();

  try {
    const result = await env.DB.prepare(
      `UPDATE subscribers
       SET status = 'unsubscribed', unsubscribed_timestamp = ?
       WHERE email = ? AND status = 'active'`
    ).bind(
      new Date().toISOString(),
      normalizedEmail
    ).run();

    if (result.meta.changes === 0) {
      // Either email doesn't exist, or was already unsubscribed —
      // both cases show the same neutral message (don't reveal
      // whether an email exists in the database to an anonymous visitor)
      return htmlResponse(true, "You're unsubscribed (or already were). You won't receive any more emails from us.");
    }

    return htmlResponse(true, "You've been unsubscribed. You won't receive any more emails from us.");

  } catch (err) {
    return htmlResponse(false, "Something went wrong. Please try again, or reach out at help@turnthisshitoff.com.");
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
