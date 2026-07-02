export async function onRequestGet(context) {
  const { request, env } = context;
  const token = request.headers.get('X-Admin-Token');
  if (!token || token !== env.ADMIN_TOKEN) {
    return json({ success: false, message: 'Unauthorized' }, 401);
  }
  const url = new URL(request.url);
  const action = url.searchParams.get('action');

  const TOTALS_SQL = `
    SELECT
      a.*,
      COALESCE(SUM(s.tiktok_views + s.facebook_views + s.instagram_views +
        s.youtube_views + s.youtube_music + s.spotify_streams +
        s.apple_streams + s.amazon_streams + s.tidal_streams), 0) AS total_streams,
      COALESCE(SUM(s.tt_likes + s.fb_likes + s.in_likes + s.yt_likes), 0) AS total_likes,
      COALESCE(SUM(s.tt_shares + s.fb_shares + s.in_shares + s.in_reposts), 0) AS total_shares,
      COALESCE(SUM(s.tt_saves + s.fb_saves + s.in_saves + s.sp_saves), 0) AS total_saves,
      COALESCE(SUM(s.sp_listeners), 0) AS total_listeners
    FROM albums a
    LEFT JOIN song_stats s ON s.album_id = a.id`;

  try {
    if (action === 'list') {
      const { results } = await env.CONTENT_DB.prepare(
        `${TOTALS_SQL} GROUP BY a.id ORDER BY a.release_date DESC`
      ).all();
      return json({ success: true, results: results || [] });
    }

    if (action === 'get') {
      const id = url.searchParams.get('id');
      if (!id) return json({ success: false, message: 'id required' }, 400);
      const row = await env.CONTENT_DB.prepare(
        `${TOTALS_SQL} WHERE a.id = ? GROUP BY a.id`
      ).bind(id).first();
      if (!row) return json({ success: false, message: 'Not found' }, 404);
      return json({ success: true, result: row });
    }

    if (action === 'names') {
      const { results } = await env.CONTENT_DB.prepare(
        `SELECT id, name FROM albums ORDER BY name ASC`
      ).all();
      return json({ success: true, results: results || [] });
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
