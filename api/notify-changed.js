import nodemailer from 'nodemailer';

const MAIL_FROM   = process.env.MAIL_FROM || 'platform@deepreply.ru';
const SMTP_HOST   = process.env.SMTP_HOST;
const SMTP_PORT   = Number(process.env.SMTP_PORT || 465);
const SMTP_USER   = process.env.SMTP_USER;
const SMTP_PASS   = process.env.SMTP_PASS;
const SMTP_SECURE = String(process.env.SMTP_SECURE || 'true') === 'true';

const tx = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_SECURE,
  auth: { user: SMTP_USER, pass: SMTP_PASS }
});

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'content-type');
}

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' });

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const { email } = body;
    if (!email) return res.status(400).json({ error: 'email required' });

    await tx.sendMail({
      from: MAIL_FROM,
      to: email,
      subject: 'Пароль изменён',
      html: `<p>Ваш пароль в DeepReply был успешно изменён.</p>
             <p>Если это были не вы — восстановите доступ и свяжитесь с поддержкой.</p>`
    });

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error(e);
    return res.status(200).json({ ok: true });
  }
}
