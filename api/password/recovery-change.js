// /api/recovery-change.js
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'
import nodemailer from 'nodemailer'

const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

function cors(res){res.setHeader('Access-Control-Allow-Origin','*');res.setHeader('Access-Control-Allow-Methods','POST,OPTIONS');res.setHeader('Access-Control-Allow-Headers','Content-Type, Authorization')}

const verify = (token) => {
  const [body, sig] = token.split('.')
  const expect = crypto.createHmac('sha256', process.env.RECOVERY_SECRET).update(body).digest('base64url')
  if (sig !== expect) return null
  const payload = JSON.parse(Buffer.from(body, 'base64url').toString())
  if (Date.now() > payload.exp) return null
  return payload
}

const tx = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 465),
  secure: String(process.env.SMTP_SECURE || 'true') === 'true',
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
})

export default async function handler(req,res){
  cors(res)
  if (req.method==='OPTIONS') return res.status(204).end()
  if (req.method!=='POST')    return res.status(405).json({error:'Method not allowed'})

  const { nonce, new_password } = typeof req.body === 'string' ? JSON.parse(req.body||'{}') : (req.body||{})
  if (!nonce || !new_password) return res.status(400).json({ error:'nonce_and_password_required' })

  const payload = verify(nonce)
  if (!payload?.email) return res.status(400).json({ error:'invalid_or_expired_nonce' })

  // Найди user по email и обнови пароль
  const { data: users, error } = await supabaseAdmin.auth.admin.listUsers({ email: payload.email })
  if (error || !users?.users?.length) return res.status(400).json({ error:'user_not_found' })
  const user = users.users[0]

  const upd = await supabaseAdmin.auth.admin.updateUserById(user.id, { password: new_password })
  if (upd.error) return res.status(500).json({ error:'change_failed' })

  // очистим код
  await supabaseAdmin.from('recovery_codes').delete().eq('email', payload.email)

  // письмо «пароль изменён»
  try {
    await tx.sendMail({
      from: process.env.MAIL_FROM || 'notify@deepreply.ru',
      to: payload.email,
      subject: 'Пароль изменён',
      html: `<p>Ваш пароль в DeepReply успешно изменён.</p>`
    })
  } catch {}

  return res.status(200).json({ ok: true })
}
