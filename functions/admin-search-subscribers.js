// /functions/admin-search-subscribers.js
// Cloudflare Pages Function — searches subscribers by partial email match
// Protected implicitly: only reachable via the /admin path, which is
// gated by Cloudflare Access. No separate auth check needed here since
// Access already blocks unauthenticated requests before they reach this function.

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const query = url.searchParams.get('q');

  if (!query || query.trim().length === 0) {
    return jsonResponse(false, "Search query is required.", []);
  }

  const searchTerm = `%${query.trim().toLowerCase()}%`;

  try {
    const result = await env.DB.prepare(
      `SELECT id, email, status, consent_timestamp, unsubscribed_timestamp
       FROM subscribers
       WHERE email LIKE ?
       ORDER BY consent_timestamp DESC
       LIMIT 25`
    ).bind(searchTerm).all();

    return jsonResponse(true, null, result.results);

  } catch (err) {
    return jsonResponse(false, "Search failed. Please try again.", []);
  }
}

function jsonResponse(success, message, results) {
  return new Response(JSON.stringify({ success, message, results }), {
    status: success ? 200 : 400,
    headers: { 'Content-Type': 'application/json' }
  });
}
