// /api/recovery-verify.js
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

function cors(res){res.setHeader('Access-Control-Allow-Origin','*');res.setHeader('Access-Control-Allow-Methods','POST,OPTIONS');res.setHeader('Access-Control-Allow-Headers','Content-Type, Authorization')}
const sign = (payload) => {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const sig  = crypto.createHmac('sha256', process.env.RECOVERY_SECRET).update(body).digest('base64url')
  return `${body}.${sig}`
}

export default async function handler(req,res){
  cors(res)
  if (req.method==='OPTIONS') return res.status(204).end()
  if (req.method!=='POST')    return res.status(405).json({error:'Method not allowed'})

  const { email, code } = typeof req.body === 'string' ? JSON.parse(req.body||'{}') : (req.body||{})
  if (!email || !code) return res.status(400).json({ error:'email_and_code_required' })

  const { data: rec } = await supabase.from('recovery_codes').select('*').eq('email', email).maybeSingle()
  if (!rec) return res.status(400).json({ error:'no_request' })
  if (new Date() > new Date(rec.expires_at)) return res.status(400).json({ error:'expired' })
  if (rec.attempts >= 5) return res.status(429).json({ error:'too_many_attempts' })

  const ok = crypto.createHash('sha256').update(code).digest('hex') === rec.code_hash
  await supabase.from('recovery_codes').update({ attempts: rec.attempts + 1 }).eq('email', email)
  if (!ok) return res.status(400).json({ error:'invalid_code' })

  // успех — выдаём nonce на 10 минут
  const nonce = sign({ email, exp: Date.now() + 10*60*1000 })
  return res.status(200).json({ ok: true, nonce })
}
