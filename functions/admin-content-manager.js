export async function onRequestPost(context) {
  const { request, env } = context;

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ success: false, message: 'Invalid JSON' }, 400);
  }

  const { action } = body;

  try {
    if (action === 'add') {
      const { song_name, table_name, spotify_url, spotify_embed_url,
              stream_count, release_date, art_number } = body;
      if (!song_name || !table_name || !spotify_url || !spotify_embed_url) {
        return json({ success: false, message: 'song_name, table_name, spotify_url, and spotify_embed_url are required' }, 400);
      }
      const result = await env.CONTENT_DB.prepare(
        `INSERT INTO songs (song_name, table_name, spotify_url, spotify_embed_url,
                            stream_count, release_date, art_number)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        song_name.trim(),
        table_name.trim(),
        spotify_url.trim(),
        spotify_embed_url.trim(),
        Number(stream_count) || 0,
        (release_date || '').trim(),
        (art_number || '').trim()
      ).run();
      return json({ success: true, message: 'Song added', meta: result.meta });
    }

    if (action === 'edit') {
      const { id, song_name, table_name, spotify_url, spotify_embed_url,
              stream_count, release_date, art_number } = body;
      if (!id) return json({ success: false, message: 'id required' }, 400);
      if (!song_name || !table_name || !spotify_url || !spotify_embed_url) {
        return json({ success: false, message: 'song_name, table_name, spotify_url, and spotify_embed_url are required' }, 400);
      }
      const result = await env.CONTENT_DB.prepare(
        `UPDATE songs SET song_name=?, table_name=?, spotify_url=?, spotify_embed_url=?,
                          stream_count=?, release_date=?, art_number=?
         WHERE id=?`
      ).bind(
        song_name.trim(),
        table_name.trim(),
        spotify_url.trim(),
        spotify_embed_url.trim(),
        Number(stream_count) || 0,
        (release_date || '').trim(),
        (art_number || '').trim(),
        id
      ).run();
      if (result.meta.changes === 0) return json({ success: false, message: 'No row updated — id not found' }, 404);
      return json({ success: true, message: 'Song updated' });
    }

    if (action === 'remove') {
      const { id } = body;
      if (!id) return json({ success: false, message: 'id required' }, 400);
      const result = await env.CONTENT_DB.prepare(
        `DELETE FROM songs WHERE id = ?`
      ).bind(id).run();
      if (result.meta.changes === 0) return json({ success: false, message: 'No row deleted — id not found' }, 404);
      return json({ success: true, message: 'Song removed' });
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