// /functions/admin-send-prerelease.js
// Cloudflare Pages Function — sends a pre-release notice to all active
// subscribers. Album art is now a plain URL (e.g. an image already
// hosted on turnthisshitoff.com) rather than a base64 upload — avoids
// Gmail's ~102KB clipping threshold and the truncated-image problem
// that came with embedding image data directly in the email.

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const body = await request.json();
    const { albumName, releaseDate, trackCount, trackNames, previewUrl, albumArtUrl } = body;

    if (!albumName || !releaseDate || !previewUrl) {
      return jsonResponse(false, "Album name, release date, and preview link are required.");
    }

    const { results: subscribers } = await env.DB.prepare(
      `SELECT email FROM subscribers WHERE status = 'active'`
    ).all();

    if (!subscribers || subscribers.length === 0) {
      return jsonResponse(false, "No active subscribers to send to.");
    }

    let sentCount = 0;
    let failedCount = 0;

    for (const sub of subscribers) {
      try {
        await sendPreReleaseEmail(
          sub.email, albumName, releaseDate, trackCount, trackNames,
          previewUrl, albumArtUrl, env.RESEND_API_KEY
        );
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
      `Pre-release notice sent to ${sentCount} subscriber(s).${failedCount > 0 ? ` ${failedCount} failed.` : ''}`
    );

  } catch (err) {
    return jsonResponse(false, "Something went wrong. No emails were sent.");
  }
}

async function sendPreReleaseEmail(toEmail, albumName, releaseDate, trackCount, trackNames, previewUrl, albumArtUrl, apiKey) {
  const unsubscribeUrl = `https://turnthisshitoff.com/unsubscribe?email=${encodeURIComponent(toEmail)}`;
  const formattedDate = new Date(releaseDate).toLocaleDateString('en-US', { dateStyle: 'long' });

  const trackListHtml = (trackNames && trackNames.length > 0)
    ? `<ol style="color:#C8C8C8; font-size:13px; line-height:1.8; padding-left:20px; margin:0 0 16px;">
         ${trackNames.map(t => `<li>${escapeHtml(t)}</li>`).join('')}
       </ol>`
    : '';

  const albumArtHtml = albumArtUrl
    ? `<img src="${escapeHtml(albumArtUrl)}" alt="${escapeHtml(albumName)}" style="width:100%; max-width:200px; border-radius:4px; margin:0 0 20px; display:block;">`
    : '';

  const previewButtonHtml = `
    <div style="text-align:center; margin:24px 0;">
      <a href="${previewUrl}" style="background:#D4AF37; color:#0A0A0A; text-decoration:none; padding:10px 24px; border-radius:3px; font-size:13px; font-weight:bold; letter-spacing:0.5px; text-transform:uppercase;">Preview It</a>
    </div>`;

  // ── New element order: preview button → album title → album art → track list ──
  const html = `
  <div style="background:#0A0A0A; padding:40px 20px; font-family:Arial,sans-serif;">
    <div style="max-width:480px; margin:0 auto; background:#111111; border:1px solid #2A2A2A; border-radius:4px; padding:32px;">
      <p style="color:#D4AF37; font-size:11px; letter-spacing:2px; text-transform:uppercase; margin:0 0 16px;">MadeUp MonkeyShit — New Album</p>

      ${previewButtonHtml}

      <h1 style="color:#F2F2F2; font-size:22px; font-style:italic; margin:0 0 8px; font-weight:normal; text-align:center;">${escapeHtml(albumName)}</h1>
      <p style="color:#888888; font-size:13px; margin:0 0 20px; text-align:center;">Releasing ${formattedDate}${trackCount ? ` &middot; ${trackCount} tracks` : ''}</p>

      ${albumArtHtml}

      ${trackListHtml}

      <p style="color:#888888; font-size:12px; line-height:1.6; margin:16px 0 0;">
        Coming soon to all major streaming platforms.
      </p>

      ${previewButtonHtml}

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
      subject: `New Album: ${albumName} — ${formattedDate}`,
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
