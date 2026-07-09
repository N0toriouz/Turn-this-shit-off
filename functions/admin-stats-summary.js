export async function onRequestGet(context) {
  const { request, env } = context;
  const token = request.headers.get('X-Admin-Token');
  if (!token || token !== env.ADMIN_TOKEN) {
    return json({ success: false, message: 'Unauthorized' }, 401);
  }

  try {
    const { results } = await env.SONGS_DB.prepare(`
      SELECT tiktok_views, tt_likes, tt_saves, tt_shares,
             facebook_views, fb_likes, fb_saves, fb_shares,
             instagram_views, in_likes, in_saves, in_reposts, in_shares,
             youtube_views, yt_likes, youtube_music,
             spotify_streams, sp_listeners, sp_playlist_adds, sp_saves,
             apple_streams, amazon_streams, tidal_streams
      FROM song_stats
    `).all();

    const t = (results || []).reduce((acc, s) => {
      for (const k in acc) acc[k] += s[k] || 0;
      return acc;
    }, zeroes());

    const ratio = (num, den) => den > 0 ? num / den : 0;

    const tiktokEng    = t.tt_likes + t.tt_saves + t.tt_shares;
    const facebookEng  = t.fb_likes + t.fb_saves + t.fb_shares;
    const instagramEng = t.in_likes + t.in_saves + t.in_reposts + t.in_shares;
    const spotifyEng   = t.sp_playlist_adds + t.sp_saves;

    // Sitewide totals + signal strength — mirrors computeSignalStrength() in
    // admin-song-stats.js exactly (same engagement fields, same denominator),
    // just applied to summed totals instead of one song. dk_* fields are never
    // read here, per spec.
    const website = {
      total_streams: t.tiktok_views + t.facebook_views + t.instagram_views + t.youtube_views + t.youtube_music + t.spotify_streams + t.apple_streams + t.amazon_streams + t.tidal_streams,
      total_likes: t.tt_likes + t.fb_likes + t.in_likes + t.yt_likes,
      total_shares: t.tt_shares + t.fb_shares + t.in_shares + t.in_reposts,
      total_saves: t.tt_saves + t.fb_saves + t.in_saves + t.sp_saves,
      signal_strength: ratio(
        tiktokEng + instagramEng + facebookEng + t.yt_likes + spotifyEng,
        t.tiktok_views + t.instagram_views + t.facebook_views + t.youtube_views + t.youtube_music + t.spotify_streams
      )
    };

    // Per-platform totals + signal strength, scoped to each platform's own
    // collected fields. YouTube views + music streams share one combined
    // denominator here (per spec); Apple/Amazon/Tidal have no engagement
    // fields and report streams only.
    const platforms = {
      tiktok:    { views: t.tiktok_views, likes: t.tt_likes, saves: t.tt_saves, shares: t.tt_shares, signal_strength: ratio(tiktokEng, t.tiktok_views) },
      facebook:  { views: t.facebook_views, likes: t.fb_likes, saves: t.fb_saves, shares: t.fb_shares, signal_strength: ratio(facebookEng, t.facebook_views) },
      instagram: { views: t.instagram_views, likes: t.in_likes, saves: t.in_saves, reposts: t.in_reposts, shares: t.in_shares, signal_strength: ratio(instagramEng, t.instagram_views) },
      youtube:   { views: t.youtube_views, likes: t.yt_likes, music_streams: t.youtube_music, signal_strength: ratio(t.yt_likes, t.youtube_views + t.youtube_music) },
      spotify:   { streams: t.spotify_streams, listeners: t.sp_listeners, playlist_adds: t.sp_playlist_adds, saves: t.sp_saves, signal_strength: ratio(spotifyEng, t.spotify_streams) },
      apple:     { streams: t.apple_streams },
      amazon:    { streams: t.amazon_streams },
      tidal:     { streams: t.tidal_streams }
    };

    return json({ success: true, website, platforms });
  } catch (err) {
    return json({ success: false, message: err.message }, 500);
  }
}

function zeroes() {
  return {
    tiktok_views:0, tt_likes:0, tt_saves:0, tt_shares:0,
    facebook_views:0, fb_likes:0, fb_saves:0, fb_shares:0,
    instagram_views:0, in_likes:0, in_saves:0, in_reposts:0, in_shares:0,
    youtube_views:0, yt_likes:0, youtube_music:0,
    spotify_streams:0, sp_listeners:0, sp_playlist_adds:0, sp_saves:0,
    apple_streams:0, amazon_streams:0, tidal_streams:0
  };
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
  });
}
