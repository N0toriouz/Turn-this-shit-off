export async function onRequestPost(context) {
  const { request, env } = context;
  const token = request.headers.get('X-Admin-Token');
  if (!token || token !== env.ADMIN_TOKEN) {
    return json({ success: false, message: 'Unauthorized' }, 401);
  }
  let body;
  try { body = await request.json(); } catch {
    return json({ success: false, message: 'Invalid JSON' }, 400);
  }
  const { action } = body;

  try {
    if (action === 'add') {
      const { album_id, name, art, release_date, active, countries } = body;
      if (!album_id || !name) return json({ success: false, message: 'album_id and name required' }, 400);
      const pf = platformValues(body);
      const cf = countryValues(countries || []);
      await env.SONGS_DB.prepare(`
        INSERT INTO song_stats (
          album_id, name, art, release_date, active,
          tiktok_views, tt_likes, tt_saves, tt_shares,
          facebook_views, fb_likes, fb_saves, fb_shares,
          instagram_views, in_likes, in_saves, in_reposts, in_shares,
          youtube_views, yt_likes, youtube_music,
          spotify_streams, sp_listeners, sp_playlist_adds, sp_saves,
          apple_streams, amazon_streams, tidal_streams,
          co1, cl1, co2, cl2, co3, cl3, co4, cl4, co5, cl5,
          co6, cl6, co7, cl7, co8, cl8, co9, cl9, co10, cl10
        ) VALUES (
          ?,?,?,?,?,
          ?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,
          ?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?
        )
      `).bind(
        parseInt(album_id), name.trim(), parseInt(art)||0,
        (release_date||'').trim(), active||'Yes',
        ...pf, ...cf
      ).run();
      return json({ success: true, message: 'Song stats created' });
    }

    if (action === 'edit') {
      const { id, album_id, name, art, release_date, active, countries } = body;
      if (!id) return json({ success: false, message: 'id required' }, 400);
      if (!album_id || !name) return json({ success: false, message: 'album_id and name required' }, 400);
      const pf = platformValues(body);
      const cf = countryValues(countries || []);
      const result = await env.SONGS_DB.prepare(`
        UPDATE song_stats SET
          album_id=?, name=?, art=?, release_date=?, active=?,
          tiktok_views=?, tt_likes=?, tt_saves=?, tt_shares=?,
          facebook_views=?, fb_likes=?, fb_saves=?, fb_shares=?,
          instagram_views=?, in_likes=?, in_saves=?, in_reposts=?, in_shares=?,
          youtube_views=?, yt_likes=?, youtube_music=?,
          spotify_streams=?, sp_listeners=?, sp_playlist_adds=?, sp_saves=?,
          apple_streams=?, amazon_streams=?, tidal_streams=?,
          co1=?, cl1=?, co2=?, cl2=?, co3=?, cl3=?, co4=?, cl4=?, co5=?, cl5=?,
          co6=?, cl6=?, co7=?, cl7=?, co8=?, cl8=?, co9=?, cl9=?, co10=?, cl10=?
        WHERE id=?
      `).bind(
        parseInt(album_id), name.trim(), parseInt(art)||0,
        (release_date||'').trim(), active||'Yes',
        ...pf, ...cf, id
      ).run();
      if (result.meta.changes === 0) return json({ success: false, message: 'Song not found' }, 404);
      return json({ success: true, message: 'Song stats updated' });
    }

    if (action === 'delete') {
      const { id } = body;
      if (!id) return json({ success: false, message: 'id required' }, 400);
      await env.SONGS_DB.prepare(`DELETE FROM song_stats WHERE id=?`).bind(id).run();
      return json({ success: true, message: 'Song stats deleted' });
    }

    return json({ success: false, message: 'Unknown action' }, 400);
  } catch (err) {
    return json({ success: false, message: err.message }, 500);
  }
}

function n(v) { return parseInt(v) || 0; }

function platformValues(b) {
  return [
    n(b.tiktok_views), n(b.tt_likes), n(b.tt_saves), n(b.tt_shares),
    n(b.facebook_views), n(b.fb_likes), n(b.fb_saves), n(b.fb_shares),
    n(b.instagram_views), n(b.in_likes), n(b.in_saves), n(b.in_reposts), n(b.in_shares),
    n(b.youtube_views), n(b.yt_likes), n(b.youtube_music),
    n(b.spotify_streams), n(b.sp_listeners), n(b.sp_playlist_adds), n(b.sp_saves),
    n(b.apple_streams), n(b.amazon_streams), n(b.tidal_streams)
  ];
}

function countryValues(countries) {
  let sorted = countries
    .filter(c => c.name && c.name.trim())
    .map(c => ({ name: c.name.trim(), count: parseInt(c.count) || 0 }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
  while (sorted.length < 10) sorted.push({ name: null, count: 0 });
  return sorted.flatMap(c => [c.name, c.count]);
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
  });
}
