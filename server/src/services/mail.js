const nodemailer = require("nodemailer");

const RESEND_API = "https://api.resend.com/emails";
const EMAILJS_SEND = "https://api.emailjs.com/api/v1.0/email/send";
const EMAILJS_SECURITY_URL =
  "https://dashboard.emailjs.com/admin/account/security";

/**
 * EmailJS desde el servidor (HTTPS). La plantilla debe usar {{recipient_email}}, {{code}}, etc.
 * En el panel: Account → Security → activar acceso API desde entornos no-browser.
 */
async function sendViaEmailJs({ to, code }) {
  const serviceId = process.env.EMAILJS_SERVICE_ID;
  const templateId = process.env.EMAILJS_TEMPLATE_ID;
  const publicKey = process.env.EMAILJS_PUBLIC_KEY;
  const privateKey = String(process.env.EMAILJS_PRIVATE_KEY || "").trim();
  if (!serviceId || !templateId || !publicKey) {
    throw new Error(
      "EmailJS: define EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID y EMAILJS_PUBLIC_KEY"
    );
  }
  if (!privateKey) {
    throw new Error(
      "EmailJS: define EMAILJS_PRIVATE_KEY (Account → API keys → Private Key). Obligatoria con API desde servidor / strict mode."
    );
  }
  const payload = {
    service_id: serviceId,
    template_id: templateId,
    user_id: publicKey,
    accessToken: privateKey,
    template_params: {
      recipient_email: to,
      code,
      subject: "Código para restablecer tu contraseña",
    },
  };
  const res = await fetch(EMAILJS_SEND, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  if (!res.ok) {
    let msg = text || `EmailJS HTTP ${res.status}`;
    if (/non-browser|non browser|disabled/i.test(msg)) {
      msg += `. Activa "API access from non-browser environments" en ${EMAILJS_SECURITY_URL}`;
    }
    if (/strict mode|private key/i.test(msg)) {
      msg +=
        " Añade EMAILJS_PRIVATE_KEY en el servidor (misma pantalla de API keys que la public key).";
    }
    throw new Error(msg);
  }
}

function createTransport() {
  const host = process.env.SMTP_HOST;
  if (!host) return null;
  return nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER || "",
      pass: process.env.SMTP_PASS || "",
    },
    connectionTimeout: 20_000,
    greetingTimeout: 20_000,
    socketTimeout: 20_000,
  });
}

/**
 * Envío por HTTPS (sin puertos SMTP). En Render plan gratuito los puertos 25/465/587
 * suelen estar bloqueados; Resend u otro API evita el timeout CONN.
 */
async function sendViaResend({ from, to, subject, text, html }) {
  const apiKey = process.env.RESEND_API_KEY;
  const res = await fetch(RESEND_API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      text,
      html,
    }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      body.message ||
      body.error?.message ||
      (typeof body === "string" ? body : JSON.stringify(body));
    throw new Error(msg || `Resend HTTP ${res.status}`);
  }
}

/**
 * Envía el OTP por correo.
 * - EmailJS (EMAILJS_*): HTTPS; plantilla con {{recipient_email}} y {{code}}.
 * - RESEND_API_KEY: API HTTPS (recomendado en Render free tier).
 * - SMTP_*: Nodemailer (puede fallar en hosting que bloquee SMTP).
 * - PASSWORD_RESET_DEV_OTP=true: solo consola en desarrollo.
 */
async function sendPasswordResetOtp(email, code) {
  const devLog = process.env.PASSWORD_RESET_DEV_OTP === "true";
  const subject = "Código para restablecer tu contraseña";
  const text = `Tu código de verificación es: ${code}\n\nVálido por 15 minutos. Si no solicitaste este cambio, ignora este mensaje.`;
  const html = `<p>Tu código de verificación es:</p><p style="font-size:24px;font-weight:bold;letter-spacing:4px;">${code}</p><p>Válido por 15 minutos. Si no solicitaste este cambio, ignora este mensaje.</p>`;

  const useEmailJs =
    process.env.EMAILJS_SERVICE_ID &&
    process.env.EMAILJS_TEMPLATE_ID &&
    process.env.EMAILJS_PUBLIC_KEY;

  if (useEmailJs) {
    await sendViaEmailJs({ to: email, code });
    return;
  }

  if (process.env.RESEND_API_KEY) {
    const from =
      process.env.RESEND_FROM || process.env.SMTP_FROM || process.env.SMTP_USER;
    if (!from) {
      throw new Error(
        "Define RESEND_FROM (remitente verificado en Resend) o SMTP_FROM"
      );
    }
    await sendViaResend({ from, to: email, subject, text, html });
    return;
  }

  const transport = createTransport();
  if (!transport) {
    if (devLog) {
      console.log(`[password-reset] OTP para ${email}: ${code}`);
      return;
    }
    throw new Error(
      "Correo no configurado: define EMAILJS_* o RESEND_API_KEY o SMTP_HOST (y credenciales) o PASSWORD_RESET_DEV_OTP=true en desarrollo"
    );
  }
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  await transport.sendMail({
    from,
    to: email,
    subject,
    text,
    html,
  });
}

module.exports = { sendPasswordResetOtp };
