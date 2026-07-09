// Public, unauthenticated endpoint — sitewide totals for homepage display
// (hero stat row). Mirrors the "website" object formula in
// admin-stats-summary.js exactly (same fields, same dk_*-exclusion rule);
// this is the public-facing counterpart, same relationship as songs.js is
// to admin-songs.js.
export async function onRequestGet(context) {
  const { env } = context;

  try {
    const { results } = await env.SONGS_DB.prepare(`
      SELECT tiktok_views, tt_likes, tt_saves, tt_shares,
             facebook_views, fb_likes, fb_saves, fb_shares,
             instagram_views, in_likes, in_saves, in_reposts,
             youtube_views, yt_likes, youtube_music,
             spotify_streams, sp_saves,
             apple_streams, amazon_streams, tidal_streams
      FROM song_stats
    `).all();

    const t = (results || []).reduce((acc, s) => {
      for (const k in acc) acc[k] += s[k] || 0;
      return acc;
    }, zeroes());

    const total_streams = t.tiktok_views + t.facebook_views + t.instagram_views + t.youtube_views + t.youtube_music + t.spotify_streams + t.apple_streams + t.amazon_streams + t.tidal_streams;
    const total_likes = t.tt_likes + t.fb_likes + t.in_likes + t.yt_likes;
    const total_shares = t.tt_shares + t.fb_shares + t.in_shares + t.in_reposts;
    const total_saves = t.tt_saves + t.fb_saves + t.in_saves + t.sp_saves;

    return json({ success: true, total_streams, total_likes, total_shares, total_saves });
  } catch (err) {
    return json({ success: false, message: err.message }, 500);
  }
}

function zeroes() {
  return {
    tiktok_views:0, tt_likes:0, tt_saves:0, tt_shares:0,
    facebook_views:0, fb_likes:0, fb_saves:0, fb_shares:0,
    instagram_views:0, in_likes:0, in_saves:0, in_reposts:0,
    youtube_views:0, yt_likes:0, youtube_music:0,
    spotify_streams:0, sp_saves:0,
    apple_streams:0, amazon_streams:0, tidal_streams:0
  };
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
  });
}
