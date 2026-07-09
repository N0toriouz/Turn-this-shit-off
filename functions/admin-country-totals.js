export async function onRequestGet(context) {
  const { request, env } = context;
  const token = request.headers.get('X-Admin-Token');
  if (!token || token !== env.ADMIN_TOKEN) {
    return json({ success: false, message: 'Unauthorized' }, 401);
  }

  try {
    const { results } = await env.SONGS_DB.prepare(`
      SELECT co1, cl1, co2, cl2, co3, cl3, co4, cl4, co5, cl5,
             co6, cl6, co7, cl7, co8, cl8, co9, cl9, co10, cl10
      FROM song_stats
    `).all();

    // Group by normalized (trim + lowercase) country name so free-text entry
    // drift (e.g. "USA" vs "usa") doesn't split one country into two rows.
    // Display name keeps the casing as first entered.
    const totals = {};
    for (const row of results || []) {
      for (let i = 1; i <= 10; i++) {
        const raw = row['co' + i];
        const streams = parseInt(row['cl' + i]) || 0;
        if (!raw || !streams) continue;
        const key = raw.trim().toLowerCase();
        if (!key) continue;
        if (!totals[key]) totals[key] = { country: raw.trim(), streams: 0 };
        totals[key].streams += streams;
      }
    }

    const ranked = Object.values(totals)
      .sort((a, b) => b.streams - a.streams)
      .slice(0, 20);

    return json({ success: true, results: ranked });
  } catch (err) {
    return json({ success: false, message: err.message }, 500);
  }
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
  });
}
