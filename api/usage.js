// /api/usage — серверная запись usage в Supabase через service-role
export default async function handler(req, res) {
  // CORS (можно ужесточить доменом твоего расширения)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST')    return res.status(405).json({ error: 'Method not allowed' });

  try {
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE; // хранится ТОЛЬКО на сервере

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
      return res.status(500).json({ error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE env vars' });
    }

    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const payload = {
      user_id: body.user_id || null,
      model: body.model || null,
      feature: body.feature || null,
      prompt_key: body.prompt_key || null,
      prompt_preview: body.prompt_preview || null,
      input_tokens:  body.input_tokens  || 0,
      output_tokens: body.output_tokens || 0,
      input_cost_usd:  body.input_cost_usd  || 0,
      output_cost_usd: body.output_cost_usd || 0,
      total_cost_usd:  body.total_cost_usd  || 0,
      created_at: new Date(body.ts || Date.now()).toISOString()
    };

    const r = await fetch(`${SUPABASE_URL}/rest/v1/usage_events`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_SERVICE_ROLE,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal'
      },
      body: JSON.stringify(payload)
    });

    if (!r.ok) {
      const text = await r.text().catch(()=> '');
      return res.status(r.status).json({ error: 'Supabase insert failed', details: text });
    }

    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: String(e?.message || e) });
  }
}
