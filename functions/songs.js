// /functions/songs.js
// Cloudflare Pages Function — public read API for songs in CONTENT_DB
// Used by homepage featured section and mood pages
// GET /songs?table=[table_name]

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const tableName = url.searchParams.get('table');

  if (!tableName || tableName.trim() === '') {
    return jsonResponse(false, "table parameter is required.", []);
  }

  try {
    const { results } = await env.CONTENT_DB.prepare(
      `SELECT id, spotify_url, spotify_embed_url, stream_count,
              release_date, song_name, art_number
       FROM songs
       WHERE table_name = ?
       ORDER BY stream_count DESC`
    ).bind(tableName.trim()).all();

    return jsonResponse(true, null, results || []);

  } catch (err) {
    return jsonResponse(false, "Failed to fetch songs.", []);
  }
}

function jsonResponse(success, message, results) {
  return new Response(JSON.stringify({ success, message, results }), {
    status: success ? 200 : 400,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store'
    }
  });
}
