// ВЕРСИЯ ДЛЯ Vercel, Node.js, без зависимостей
export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST')    return res.status(405).json({ error: 'Method not allowed' });

  try {
    // Тело запроса
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const isResponses = body && body.via === 'responses'; // <- флаг для GPT-5 (vision)

    // Совместимость полей для /v1/responses
    if (isResponses) {
      // В responses max_tokens называется max_output_tokens
      if (body.max_tokens && !body.max_output_tokens) {
        body.max_output_tokens = body.max_tokens;
        delete body.max_tokens;
      }
      // Если ошибочно прислали messages — переименуем в input
      if (body.messages && !body.input) {
        body.input = body.messages;
        delete body.messages;
      }
    }

    const url = isResponses
      ? 'https://api.openai.com/v1/responses'
      : 'https://api.openai.com/v1/chat/completions';

    const r = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(body)
    });

    const data = await r.json();
    return res.status(r.status).json(data);
  } catch (e) {
    return res.status(500).json({ error: String(e?.message || e) });
  }
}
