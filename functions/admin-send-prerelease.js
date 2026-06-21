// /functions/admin-send-prerelease.js
// Cloudflare Pages Function — sends a pre-release notice to all active
// subscribers. Album art is expected as a base64 data URL (sent from
// the admin page after the file input is read client-side), since
// Pages Functions don't have a simple way to host arbitrary uploaded
// files without R2 — embedding the image directly in the email avoids
// needing separate file storage for this.

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const body = await request.json();
    const { albumName, releaseDate, trackCount, trackNames, previewUrl, albumArtBase64 } = body;

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
          previewUrl, albumArtBase64, env.RESEND_API_KEY
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

async function sendPreReleaseEmail(toEmail, albumName, releaseDate, trackCount, trackNames, previewUrl, albumArtBase64, apiKey) {
  const unsubscribeUrl = `https://turnthisshitoff.com/unsubscribe?email=${encodeURIComponent(toEmail)}`;
  const formattedDate = new Date(releaseDate).toLocaleDateString('en-US', { dateStyle: 'long' });

  const trackListHtml = (trackNames && trackNames.length > 0)
    ? `<ol style="color:#C8C8C8; font-size:13px; line-height:1.8; padding-left:20px; margin:0 0 16px;">
         ${trackNames.map(t => `<li>${escapeHtml(t)}</li>`).join('')}
       </ol>`
    : '';

  const albumArtHtml = albumArtBase64
    ? `<img src="${albumArtBase64}" alt="${escapeHtml(albumName)}" style="width:100%; max-width:200px; border-radius:4px; margin:0 0 20px; display:block;">`
    : '';

  const html = `
  <div style="background:#0A0A0A; padding:40px 20px; font-family:Arial,sans-serif;">
    <div style="max-width:480px; margin:0 auto; background:#111111; border:1px solid #2A2A2A; border-radius:4px; padding:32px;">
      <p style="color:#D4AF37; font-size:11px; letter-spacing:2px; text-transform:uppercase; margin:0 0 16px;">MadeUp MonkeyShit — Coming Soon</p>
      ${albumArtHtml}
      <h1 style="color:#F2F2F2; font-size:22px; font-style:italic; margin:0 0 8px; font-weight:normal;">${escapeHtml(albumName)}</h1>
      <p style="color:#888888; font-size:13px; margin:0 0 4px;">Releasing ${formattedDate}</p>
      ${trackCount ? `<p style="color:#888888; font-size:13px; margin:0 0 16px;">${trackCount} tracks</p>` : ''}

      <div style="text-align:center; margin:24px 0;">
        <a href="${previewUrl}" style="background:#D4AF37; color:#0A0A0A; text-decoration:none; padding:10px 24px; border-radius:3px; font-size:13px; font-weight:bold; letter-spacing:0.5px; text-transform:uppercase;">Preview It</a>
      </div>

      ${trackListHtml}

      <p style="color:#888888; font-size:12px; line-height:1.6; margin:16px 0 0;">
        Coming soon to all major streaming platforms.
      </p>

      <div style="text-align:center; margin:20px 0 0;">
        <a href="${previewUrl}" style="background:#D4AF37; color:#0A0A0A; text-decoration:none; padding:10px 24px; border-radius:3px; font-size:13px; font-weight:bold; letter-spacing:0.5px; text-transform:uppercase;">Preview It</a>
      </div>

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
      subject: `Coming soon: ${albumName}`,
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
