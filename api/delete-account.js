// Удаление текущего пользователя Supabase по его access_token
const { createClient } = require('@supabase/supabase-js');

module.exports = async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')  return res.status(405).json({ error: 'Method not allowed' });

  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'No token' });

  const SUPABASE_URL = process.env.SUPABASE_URL || 'https://cgwdvsgsilrmuofeehao.supabase.co';
  const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE; // В Vercel → Settings → Environment Variables
  if (!SERVICE_ROLE) return res.status(500).json({ error: 'Service role key is missing' });

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  // Достаём user_id из присланного access_token
  const { data: { user }, error: e1 } = await admin.auth.getUser(token);
  if (e1 || !user) return res.status(401).json({ error: 'Bad token' });

  // Удаляем учётку (каскадом удалит связанные строки при ON DELETE CASCADE)
  const { error: e2 } = await admin.auth.admin.deleteUser(user.id);
  if (e2) return res.status(500).json({ error: e2.message });

  return res.status(200).json({ ok: true });
};
