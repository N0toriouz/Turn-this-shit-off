function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

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
      const { table_name, song_name, stream_count, art_number, release_date, spotify_url, spotify_embed_url } = body;
      if (!table_name || !song_name) return json({ success: false, message: 'table_name and song_name required' }, 400);
      await env.CONTENT_DB.prepare(`
        INSERT INTO songs (table_name, song_name, stream_count, art_number, release_date, spotify_url, spotify_embed_url)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).bind(
        table_name.trim(),
        song_name.trim(),
        parseInt(stream_count) || 0,
        parseInt(art_number) || 0,
        (release_date || '').trim(),
        (spotify_url || '').trim(),
        (spotify_embed_url || '').trim()
      ).run();
      return json({ success: true, message: 'Song added' });
    }

    if (action === 'edit') {
      const { id, table_name, song_name, stream_count, art_number, release_date, spotify_url, spotify_embed_url } = body;
      if (!id) return json({ success: false, message: 'id required' }, 400);
      if (!table_name || !song_name) return json({ success: false, message: 'table_name and song_name required' }, 400);
      const result = await env.CONTENT_DB.prepare(`
        UPDATE songs SET
          table_name=?, song_name=?, stream_count=?, art_number=?,
          release_date=?, spotify_url=?, spotify_embed_url=?
        WHERE id=?
      `).bind(
        table_name.trim(),
        song_name.trim(),
        parseInt(stream_count) || 0,
        parseInt(art_number) || 0,
        (release_date || '').trim(),
        (spotify_url || '').trim(),
        (spotify_embed_url || '').trim(),
        id
      ).run();
      if (result.meta.changes === 0) return json({ success: false, message: 'Song not found' }, 404);
      return json({ success: true, message: 'Song updated' });
    }

    if (action === 'delete') {
      const { id } = body;
      if (!id) return json({ success: false, message: 'id required' }, 400);
      await env.CONTENT_DB.prepare(`DELETE FROM songs WHERE id=?`).bind(id).run();
      return json({ success: true, message: 'Song deleted' });
    }

    return json({ success: false, message: 'Unknown action' }, 400);
  } catch (err) {
    return json({ success: false, message: err.message }, 500);
  }
}
