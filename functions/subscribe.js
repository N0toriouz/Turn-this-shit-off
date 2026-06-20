// /functions/subscribe.js
// Cloudflare Pages Function — handles email subscription form submissions
// Validates input, enforces consent, writes to D1 "subscribers" table

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

    // ── Capture IP address (Cloudflare provides this automatically) ──
    const ipAddress = request.headers.get('CF-Connecting-IP') || 'unknown';

    const now = new Date().toISOString();
    const consentTextVersion = "v1.0-2026-06-20";

    // ── Insert into D1 — UNIQUE constraint on email handles duplicates ──
    try {
      await env.DB.prepare(
        `INSERT INTO subscribers
          (email, consent_given, consent_text_version, consent_timestamp, submission_timestamp, ip_address, status)
         VALUES (?, ?, ?, ?, ?, ?, 'active')`
      ).bind(
        email.trim().toLowerCase(),
        1,
        consentTextVersion,
        now,
        now,
        ipAddress
      ).run();

    } catch (dbError) {
      // UNIQUE constraint violation = duplicate email
      if (dbError.message && dbError.message.includes('UNIQUE')) {
        return jsonResponse(false, "This email is already subscribed.");
      }
      // Any other DB error — fail closed, do not silently succeed
      return jsonResponse(false, "We couldn't save your subscription. Please try again.");
    }

    return jsonResponse(true, "You're on the list.");

  } catch (err) {
    // Catches malformed JSON, network issues, anything unexpected
    return jsonResponse(false, "Something went wrong. Your request was not saved.");
  }
}

function jsonResponse(success, message) {
  return new Response(JSON.stringify({ success, message }), {
    status: success ? 200 : 400,
    headers: { 'Content-Type': 'application/json' }
  });
}
