// /api/usage — запись usage в Supabase через service-role
export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();

  // HEALTHCHECK (можно открыть в браузере)
  if (req.method === 'GET') {
    const okEnv = Boolean(
      (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL) &&
      (
        process.env.SUPABASE_SERVICE_ROLE ||
        process.env.SUPABASE_SERVICE_ROLE_KEY ||
        process.env.SUPABASE_SERVICE_KEY ||
        process.env.SERVICE_ROLE_KEY
      )
    );
    return res.status(okEnv ? 200 : 500).json({
      ok: okEnv,
      note: okEnv
        ? 'POST сюда JSON, чтобы записать usage'
        : 'Нет SUPABASE_URL или service-role ключа (SERVICE_ROLE|SERVICE_ROLE_KEY|SERVICE_KEY) в env на Vercel'
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // === ВАЖНО: ровно ЭТИ ДВЕ СТРОКИ, вместо старых ===
    const SUPABASE_URL =
      process.env.SUPABASE_URL ||
      process.env.NEXT_PUBLIC_SUPABASE_URL ||
      '';

    const SUPABASE_SERVICE_ROLE =
      process.env.SUPABASE_SERVICE_ROLE ||
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_SERVICE_KEY ||
      process.env.SERVICE_ROLE_KEY ||
      '';

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
      return res.status(500).json({ error: 'Missing SUPABASE_URL or service-role key' });
    }

    const body =
      typeof req.body === 'string' ? JSON.parse(req.body || '{}') :
      (req.body || {});

    // Минимальный набор полей; лишние игнорируются
    const payload = {
      user_id: body.user_id ?? null,
      model: body.model ?? null,
      feature: body.feature ?? null,
      prompt_key: body.prompt_key ?? null,
      prompt_preview: body.prompt_preview ?? null,
      input_tokens: Number(body.input_tokens || 0),
      output_tokens: Number(body.output_tokens || 0),
      input_cost_usd: Number(body.input_cost_usd || 0),
      output_cost_usd: Number(body.output_cost_usd || 0),
      total_cost_usd: Number(body.total_cost_usd || 0),
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
      const text = await r.text().catch(() => '');
      return res.status(r.status).json({ error: 'Supabase insert failed', details: text });
    }
    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: String(e?.message || e) });
  }
}
