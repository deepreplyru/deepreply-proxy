// ВЕРСИЯ ДЛЯ VercEL, Node.js, без зависимостей
export default async function handler(req, res) {
  // CORS (на всякий, чтобы не упереться)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST')    return res.status(405).json({ error: 'Method not allowed' });

  try {
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // ключ хранится в переменных окружения на Vercel
        'Authorization': `Bearer ${process.env.OPENAI_KEY}`
      },
      body: JSON.stringify(req.body)
    });

    const data = await r.json();
    return res.status(r.status).json(data);
  } catch (e) {
    return res.status(500).json({ error: String(e?.message || e) });
  }
}
