export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const album_id   = url.searchParams.get('album_id');
  const album_name = url.searchParams.get('album_name');
  const name       = url.searchParams.get('name');
  if (!album_id && !album_name && !name) {
    return json({ success: false, message: 'album_id, album_name, or name required' }, 400);
  }

  try {
    if (album_id || album_name) {
      let numericId = album_id ? parseInt(album_id) : null;

      if (!numericId && album_name) {
        const albumRow = await env.ALBUMS_DB.prepare(
          `SELECT id FROM albums WHERE name=? LIMIT 1`
        ).bind(album_name).first();
        if (!albumRow) return json({ success: false, message: 'Album not found' }, 404);
        numericId = albumRow.id;
      }

      const { results } = await env.SONGS_DB.prepare(`
        SELECT id, name, art, spotify_url, spotify_embed_url,
          (tiktok_views+facebook_views+instagram_views+youtube_views+youtube_music+
           spotify_streams+apple_streams+amazon_streams+tidal_streams) AS compiled_streams,
          dk_total,
          (tt_likes+fb_likes+in_likes+yt_likes) AS total_likes,
          (tt_shares+fb_shares+in_shares+in_reposts) AS total_shares,
          (tt_saves+fb_saves+in_saves+sp_saves) AS total_saves,
          sp_listeners,
          co1, cl1, co2, cl2, co3, cl3, co4, cl4, co5, cl5,
          co6, cl6, co7, cl7, co8, cl8, co9, cl9, co10, cl10
        FROM song_stats WHERE album_id=? ORDER BY name ASC
      `).bind(numericId).all();
      const mapped = (results || []).map(r => ({
        ...r,
        top_country: topCountry(r),
        total_streams: Math.max(r.dk_total || 0, r.compiled_streams || 0)
      }));
      return json({ success: true, results: mapped });
    }

    const row = await env.SONGS_DB.prepare(`
      SELECT id, name, art, spotify_url, spotify_embed_url,
        (tiktok_views+facebook_views+instagram_views+youtube_views+youtube_music+
         spotify_streams+apple_streams+amazon_streams+tidal_streams) AS compiled_streams,
        dk_total,
        (tt_likes+fb_likes+in_likes+yt_likes) AS total_likes,
        (tt_shares+fb_shares+in_shares+in_reposts) AS total_shares,
        (tt_saves+fb_saves+in_saves+sp_saves) AS total_saves,
        sp_listeners,
        co1, cl1, co2, cl2, co3, cl3, co4, cl4, co5, cl5,
        co6, cl6, co7, cl7, co8, cl8, co9, cl9, co10, cl10
      FROM song_stats WHERE name=? LIMIT 1
    `).bind(name).first();
    if (row) {
      row.top_country = topCountry(row);
      row.total_streams = Math.max(row.dk_total || 0, row.compiled_streams || 0);
    }
    return json({ success: true, result: row || null });
  } catch (err) {
    return json({ success: false, message: err.message }, 500);
  }
}

function topCountry(row) {
  let best = null, bestVal = 0;
  for (let i = 1; i <= 10; i++) {
    const val = parseInt(row['cl' + i]) || 0;
    if (val > bestVal) { bestVal = val; best = row['co' + i] || null; }
  }
  return best;
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
  });
}
