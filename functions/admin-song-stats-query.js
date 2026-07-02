export async function onRequestGet(context) {
  const { request, env } = context;
  const token = request.headers.get('X-Admin-Token');
  if (!token || token !== env.ADMIN_TOKEN) {
    return json({ success: false, message: 'Unauthorized' }, 401);
  }
  const url = new URL(request.url);
  const action = url.searchParams.get('action');

  try {
    if (action === 'list') {
      const album_id = url.searchParams.get('album_id');
      if (!album_id) return json({ success: false, message: 'album_id required' }, 400);
      const { results } = await env.CONTENT_DB.prepare(
        `SELECT * FROM song_stats WHERE album_id = ? ORDER BY name ASC`
      ).bind(album_id).all();
      return json({ success: true, results: results || [] });
    }

    if (action === 'get') {
      const id = url.searchParams.get('id');
      if (!id) return json({ success: false, message: 'id required' }, 400);
      const row = await env.CONTENT_DB.prepare(
        `SELECT * FROM song_stats WHERE id = ?`
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
