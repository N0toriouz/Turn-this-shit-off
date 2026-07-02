export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const name = url.searchParams.get('name');
  const id = url.searchParams.get('id');
  if (!name && !id) return json({ success: false, message: 'name or id required' }, 400);

  try {
    const album = id
      ? await env.ALBUMS_DB.prepare(`SELECT * FROM albums WHERE id=?`).bind(id).first()
      : await env.ALBUMS_DB.prepare(`SELECT * FROM albums WHERE name=?`).bind(name).first();
    if (!album) return json({ success: false, message: 'Album not found' }, 404);

    const { results: songs } = await env.SONGS_DB.prepare(
      `SELECT tiktok_views, facebook_views, instagram_views, youtube_views,
              youtube_music, spotify_streams, apple_streams, amazon_streams, tidal_streams,
              tt_likes, fb_likes, in_likes, yt_likes,
              tt_shares, fb_shares, in_shares, in_reposts,
              tt_saves, fb_saves, in_saves, sp_saves, sp_listeners
       FROM song_stats WHERE album_id=?`
    ).bind(album.id).all();

    const totals = (songs || []).reduce((t, s) => {
      t.total_streams   += (s.tiktok_views||0)+(s.facebook_views||0)+(s.instagram_views||0)+(s.youtube_views||0)+(s.youtube_music||0)+(s.spotify_streams||0)+(s.apple_streams||0)+(s.amazon_streams||0)+(s.tidal_streams||0);
      t.total_likes     += (s.tt_likes||0)+(s.fb_likes||0)+(s.in_likes||0)+(s.yt_likes||0);
      t.total_shares    += (s.tt_shares||0)+(s.fb_shares||0)+(s.in_shares||0)+(s.in_reposts||0);
      t.total_saves     += (s.tt_saves||0)+(s.fb_saves||0)+(s.in_saves||0)+(s.sp_saves||0);
      t.total_listeners += (s.sp_listeners||0);
      return t;
    }, { total_streams:0, total_likes:0, total_shares:0, total_saves:0, total_listeners:0 });

    return json({ success: true, result: { ...album, ...totals } });
  } catch (err) {
    return json({ success: false, message: err.message }, 500);
  }
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
  });
}
