// Vercel Edge/Node: Удаление учётки текущего пользователя
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res){
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'No token' });

  const url = 'https://cgwdvsgsilrmuofeehao.supabase.co';
  const service = process.env.SUPABASE_SERVICE_ROLE; // положи SRK в переменные окружения
  const admin = createClient(url, service, { auth: { autoRefreshToken:false, persistSession:false } });

  // Получаем user_id из access_token (через клиент с anon не выйдет)
  const { data: { user }, error: e1 } = await admin.auth.getUser(token);
  if (e1 || !user) return res.status(401).json({ error: 'Bad token' });

  // Удаляем пользователя (с каскадом сработают FK/ON DELETE CASCADE)
  const { error: e2 } = await admin.auth.admin.deleteUser(user.id);
  if (e2) return res.status(500).json({ error: e2.message });

  return res.status(200).json({ ok: true });
}
