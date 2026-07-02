export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const name = url.searchParams.get('name');
  const id = url.searchParams.get('id');
  if (!name && !id) return json({ success: false, message: 'name or id required' }, 400);

  const BASE = `
    SELECT
      a.id, a.name, a.art, a.release_date, a.active,
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
    const row = id
      ? await env.CONTENT_DB.prepare(`${BASE} WHERE a.id=? GROUP BY a.id`).bind(id).first()
      : await env.CONTENT_DB.prepare(`${BASE} WHERE a.name=? GROUP BY a.id`).bind(name).first();
    if (!row) return json({ success: false, message: 'Album not found' }, 404);
    return json({ success: true, result: row });
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
