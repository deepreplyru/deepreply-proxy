// ВЕРСИЯ ДЛЯ Vercel, Node.js, без зависимостей
export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST')    return res.status(405).json({ error: 'Method not allowed' });

  try {
    // 1) Тело запроса
    const raw = typeof req.body === 'string' ? (req.body || '{}') : JSON.stringify(req.body || {});
    const body = JSON.parse(raw);

    // 2) Определяем, куда слать (chat vs responses) и ГРАМОТНО ГОТОВИМ ТЕЛО
    const { via, ...forwardBody } = body || {};
    const isResponses = via === 'responses';

    if (isResponses) {
      // Responses API: max_output_tokens вместо max_tokens
      if (forwardBody.max_tokens && !forwardBody.max_output_tokens) {
        forwardBody.max_output_tokens = forwardBody.max_tokens;
        delete forwardBody.max_tokens;
      }
      // Если по ошибке прислали messages — конвертим в input
      if (forwardBody.messages && !forwardBody.input) {
        forwardBody.input = forwardBody.messages;
        delete forwardBody.messages;
      }
    }

    const url = isResponses
      ? 'https://api.openai.com/v1/responses'
      : 'https://api.openai.com/v1/chat/completions';

    // 3) Ключ: сначала OPENAI_API_KEY, иначе OPENAI_KEY
    const API_KEY = process.env.OPENAI_API_KEY || process.env.OPENAI_KEY;
    if (!API_KEY) {
      return res.status(500).json({ error: 'Missing OPENAI_API_KEY (or OPENAI_KEY) env var on the server' });
    }

    // 4) Запрос в OpenAI
    const r = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      // ВАЖНО: не отправляем служебное поле via
      body: JSON.stringify(forwardBody)
    });

    const data = await r.json();

    // 5) Прозрачнее объясняем самые частые ошибки
    if (!r.ok) {
      // Подсказка по правам для Responses API
      if (r.status === 401 && data?.error?.message?.includes?.('api.responses.write')) {
        data.hint = 'Этот ключ не имеет scope "api.responses.write". Создай новый Project API key с включённым Responses → Write, положи в OPENAI_API_KEY и redeploy.';
      }
      if (r.status === 404 && isResponses) {
        data.hint = 'Проверь endpoint: для GPT-5 Vision нужен /v1/responses (мы его используем), а не /v1/chat/completions.';
      }
    }

    return res.status(r.status).json(data);
  } catch (e) {
    return res.status(500).json({ error: String(e?.message || e) });
  }
}
