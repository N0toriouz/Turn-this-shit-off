export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const album_id = url.searchParams.get('album_id');
  const name = url.searchParams.get('name');

  if (!album_id && !name) return json({ success: false, message: 'album_id or name required' }, 400);

  try {
    if (album_id) {
      const { results } = await env.CONTENT_DB.prepare(`
        SELECT id, name, art,
          (tiktok_views + facebook_views + instagram_views + youtube_views +
           youtube_music + spotify_streams + apple_streams + amazon_streams + tidal_streams) AS total_streams,
          (tt_likes + fb_likes + in_likes + yt_likes) AS total_likes,
          (tt_shares + fb_shares + in_shares + in_reposts) AS total_shares,
          (tt_saves + fb_saves + in_saves + sp_saves) AS total_saves,
          sp_listeners
        FROM song_stats WHERE album_id = ? ORDER BY name ASC
      `).bind(album_id).all();
      return json({ success: true, results: results || [] });
    }

    const row = await env.CONTENT_DB.prepare(`
      SELECT id, name, art,
        (tiktok_views + facebook_views + instagram_views + youtube_views +
         youtube_music + spotify_streams + apple_streams + amazon_streams + tidal_streams) AS total_streams,
        (tt_likes + fb_likes + in_likes + yt_likes) AS total_likes,
        (tt_shares + fb_shares + in_shares + in_reposts) AS total_shares,
        (tt_saves + fb_saves + in_saves + sp_saves) AS total_saves,
        sp_listeners
      FROM song_stats WHERE name = ? LIMIT 1
    `).bind(name).first();
    return json({ success: true, result: row || null });
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
