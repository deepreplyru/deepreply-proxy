// /api/recovery-request.js
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'
import nodemailer from 'nodemailer'

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

const tx = nodemailer.createTransport({
  host: process.env.SMTP_HOST,               // smtp.yandex.ru
  port: Number(process.env.SMTP_PORT || 465),
  secure: String(process.env.SMTP_SECURE || 'true') === 'true',
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } // notify@ / app‑password
})

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
}

export default async function handler(req, res) {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST')    return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { email } = typeof req.body === 'string' ? JSON.parse(req.body||'{}') : (req.body||{})
    if (!email) return res.status(400).json({ error: 'email required' })

    // (опц.) проверь, что пользователь существует в auth.users/profiles
    // rate limit: запрет чаще, чем раз в 60 сек
    const now = new Date()
    const { data: existing } = await supabase.from('recovery_codes').select('*').eq('email', email).maybeSingle()
    if (existing && existing.expires_at && (now - new Date(existing.created_at)) < 30*1000) {
      return res.status(429).json({ error: 'too frequent' })
    }

    const code = Math.floor(100000 + Math.random()*900000).toString()
    const code_hash = crypto.createHash('sha256').update(code).digest('hex')
    const expires_at = new Date(Date.now() + 10*60*1000).toISOString() // 10 мин

    await supabase.from('recovery_codes').upsert({ email, code_hash, expires_at, attempts: 0 })

    await tx.sendMail({
      from: process.env.MAIL_FROM || 'notify@deepreply.ru',
      to: email,
      subject: 'Код подтверждения DeepReply',
      html: `<p>Ваш код подтверждения: <b>${code}</b></p>
             <p>Он действует 10 минут.</p>`
    })

    return res.status(200).json({ ok: true, retryAfter: 60 })
  } catch (e) {
    console.error(e)
    return res.status(500).json({ error: 'send_failed' })
  }
}
