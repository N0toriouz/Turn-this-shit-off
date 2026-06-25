export async function onRequestGet(context) {
  const { request, env } = context;
    const token = request.headers.get('X-Admin-Token');
  if (!token || token !== env.ADMIN_TOKEN) {
    return new Response(JSON.stringify({ success: false, message: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
    });
  }
  const url = new URL(request.url);
  const action = url.searchParams.get('action');

  try {
    if (action === 'tables') {
      const tables = [
        'featured',
        'mood-1','mood-2','mood-3','mood-4','mood-5',
        'album-ait','album-week-6','album-melted-ice-cream',
        'album-still-cooking','album-pick-a-struggle','album-half-way-there'
      ];
      return json({ success: true, results: tables });
    }

    if (action === 'list') {
      const tableName = url.searchParams.get('table');
      if (!tableName) return json({ success: false, message: 'table required' }, 400);
      const { results } = await env.CONTENT_DB.prepare(
        `SELECT id, song_name, table_name, spotify_url, spotify_embed_url,
                stream_count, release_date, art_number
         FROM songs WHERE table_name = ? ORDER BY stream_count DESC`
      ).bind(tableName).all();
      return json({ success: true, results: results || [] });
    }

    if (action === 'get') {
      const id = url.searchParams.get('id');
      if (!id) return json({ success: false, message: 'id required' }, 400);
      const row = await env.CONTENT_DB.prepare(
        `SELECT id, song_name, table_name, spotify_url, spotify_embed_url,
                stream_count, release_date, art_number
         FROM songs WHERE id = ?`
      ).bind(id).first();
      if (!row) return json({ success: false, message: 'Not found' }, 404);
      return json({ success: true, result: row });
    }

    return json({ success: false, message: 'Unknown action' }, 400);
  } catch (err) {
    return json({ success: false, message: err.message }, 500);
  }
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
  });
}
