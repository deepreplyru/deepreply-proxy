// api/delete-account.js
const { createClient } = require('@supabase/supabase-js');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')  return res.status(405).json({ error: 'Method not allowed' });

  const token = (req.headers.authorization || '').replace(/^Bearer\s+/,'');
  if (!token) return res.status(401).json({ error: 'No token' });

  const url = process.env.SUPABASE_URL || 'https://cgwdvsgsilrmuofeehao.supabase.co';
  const service = process.env.SUPABASE_SERVICE_ROLE;
  if (!service) return res.status(500).json({ error: 'Service role key is missing' });

  const admin = createClient(url, service, { auth:{ autoRefreshToken:false, persistSession:false } });

  const { data:{ user }, error:e1 } = await admin.auth.getUser(token);
  if (e1 || !user) return res.status(401).json({ error: 'Bad token' });

  const { error:e2 } = await admin.auth.admin.deleteUser(user.id);
  if (e2) return res.status(500).json({ error: e2.message });

  res.status(200).json({ ok:true });
};
