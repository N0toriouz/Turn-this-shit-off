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
      const { name, art, release_date, active } = body;
      if (!name) return json({ success: false, message: 'name is required' }, 400);
      await env.CONTENT_DB.prepare(
        `INSERT INTO albums (name, art, release_date, active) VALUES (?, ?, ?, ?)`
      ).bind(name.trim(), (art || '').trim(), (release_date || '').trim(), active || 'Yes').run();
      return json({ success: true, message: 'Album created' });
    }

    if (action === 'edit') {
      const { id, name, art, release_date, active } = body;
      if (!id) return json({ success: false, message: 'id required' }, 400);
      if (!name) return json({ success: false, message: 'name is required' }, 400);
      const result = await env.CONTENT_DB.prepare(
        `UPDATE albums SET name=?, art=?, release_date=?, active=? WHERE id=?`
      ).bind(name.trim(), (art || '').trim(), (release_date || '').trim(), active || 'Yes', id).run();
      if (result.meta.changes === 0) return json({ success: false, message: 'Album not found' }, 404);
      return json({ success: true, message: 'Album updated' });
    }

    if (action === 'delete') {
      const { id } = body;
      if (!id) return json({ success: false, message: 'id required' }, 400);
      await env.CONTENT_DB.prepare(`DELETE FROM albums WHERE id=?`).bind(id).run();
      return json({ success: true, message: 'Album deleted' });
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
