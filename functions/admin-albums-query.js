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
      const { results: albums } = await env.ALBUMS_DB.prepare(
        `SELECT * FROM albums ORDER BY release_date DESC`
      ).all();
      const { results: songs } = await env.SONGS_DB.prepare(
        `SELECT album_id, tiktok_views, facebook_views, instagram_views, youtube_views,
                youtube_music, spotify_streams, apple_streams, amazon_streams, tidal_streams,
                tt_likes, fb_likes, in_likes, yt_likes,
                tt_shares, fb_shares, in_shares, in_reposts,
                tt_saves, fb_saves, in_saves, sp_saves, sp_listeners
         FROM song_stats`
      ).all();
      const totalsMap = buildTotalsMap(songs || []);
      const results = (albums || []).map(a => ({ ...a, ...( totalsMap[a.id] || zeroes()) }));
      return json({ success: true, results });
    }

    if (action === 'get') {
      const id = url.searchParams.get('id');
      if (!id) return json({ success: false, message: 'id required' }, 400);
      const album = await env.ALBUMS_DB.prepare(`SELECT * FROM albums WHERE id=?`).bind(id).first();
      if (!album) return json({ success: false, message: 'Not found' }, 404);
      const { results: songs } = await env.SONGS_DB.prepare(
        `SELECT tiktok_views, facebook_views, instagram_views, youtube_views,
                youtube_music, spotify_streams, apple_streams, amazon_streams, tidal_streams,
                tt_likes, fb_likes, in_likes, yt_likes,
                tt_shares, fb_shares, in_shares, in_reposts,
                tt_saves, fb_saves, in_saves, sp_saves, sp_listeners
         FROM song_stats WHERE album_id=?`
      ).bind(id).all();
      return json({ success: true, result: { ...album, ...computeTotals(songs || []) } });
    }

    if (action === 'names') {
      const { results } = await env.ALBUMS_DB.prepare(
        `SELECT id, name FROM albums ORDER BY name ASC`
      ).all();
      return json({ success: true, results: results || [] });
    }

    return json({ success: false, message: 'Unknown action' }, 400);
  } catch (err) {
    return json({ success: false, message: err.message }, 500);
  }
}

function buildTotalsMap(songs) {
  const map = {};
  for (const s of songs) {
    if (!map[s.album_id]) map[s.album_id] = zeroes();
    const t = map[s.album_id];
    t.total_streams += (s.tiktok_views||0)+(s.facebook_views||0)+(s.instagram_views||0)+(s.youtube_views||0)+(s.youtube_music||0)+(s.spotify_streams||0)+(s.apple_streams||0)+(s.amazon_streams||0)+(s.tidal_streams||0);
    t.total_likes   += (s.tt_likes||0)+(s.fb_likes||0)+(s.in_likes||0)+(s.yt_likes||0);
    t.total_shares  += (s.tt_shares||0)+(s.fb_shares||0)+(s.in_shares||0)+(s.in_reposts||0);
    t.total_saves   += (s.tt_saves||0)+(s.fb_saves||0)+(s.in_saves||0)+(s.sp_saves||0);
    t.total_listeners += (s.sp_listeners||0);
  }
  return map;
}

function computeTotals(songs) {
  return songs.reduce((t, s) => {
    t.total_streams += (s.tiktok_views||0)+(s.facebook_views||0)+(s.instagram_views||0)+(s.youtube_views||0)+(s.youtube_music||0)+(s.spotify_streams||0)+(s.apple_streams||0)+(s.amazon_streams||0)+(s.tidal_streams||0);
    t.total_likes   += (s.tt_likes||0)+(s.fb_likes||0)+(s.in_likes||0)+(s.yt_likes||0);
    t.total_shares  += (s.tt_shares||0)+(s.fb_shares||0)+(s.in_shares||0)+(s.in_reposts||0);
    t.total_saves   += (s.tt_saves||0)+(s.fb_saves||0)+(s.in_saves||0)+(s.sp_saves||0);
    t.total_listeners += (s.sp_listeners||0);
    return t;
  }, zeroes());
}

function zeroes() {
  return { total_streams:0, total_likes:0, total_shares:0, total_saves:0, total_listeners:0 };
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
  });
}
