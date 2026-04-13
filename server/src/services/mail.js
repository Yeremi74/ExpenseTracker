const nodemailer = require("nodemailer");

const RESEND_API = "https://api.resend.com/emails";

/**
 * Envío por HTTPS (puerto 443). En Render plan gratuito los puertos SMTP suelen estar
 * bloqueados; Nodemailer+Gmail no puede conectar. Usa esto en producción.
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
      JSON.stringify(body);
    throw new Error(msg || `Resend HTTP ${res.status}`);
  }
}

function createMailTransport() {
  const user = process.env.SMTP_USER || "";
  const pass = process.env.SMTP_PASS || "";
  const host = process.env.SMTP_HOST || "";
  const service = (process.env.SMTP_SERVICE || "").toLowerCase();

  if (service === "gmail" && user && pass) {
    return nodemailer.createTransport({
      service: "gmail",
      auth: { user, pass },
    });
  }

  if (host && user && pass) {
    return nodemailer.createTransport({
      host,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === "true",
      auth: { user, pass },
      connectionTimeout: 20_000,
      greetingTimeout: 20_000,
      socketTimeout: 20_000,
    });
  }

  return null;
}

/**
 * OTP por correo.
 * - Producción (p. ej. Render free): RESEND_API_KEY + RESEND_FROM (HTTPS, sin SMTP).
 * - Local: Nodemailer + Gmail (SMTP_SERVICE=gmail + SMTP_USER + SMTP_PASS) u otro SMTP.
 * - PASSWORD_RESET_DEV_OTP=true: solo consola.
 */
async function sendPasswordResetOtp(email, code) {
  const devLog = process.env.PASSWORD_RESET_DEV_OTP === "true";
  const subject = "Código para restablecer tu contraseña";
  const text = `Tu código de verificación es: ${code}\n\nVálido por 15 minutos. Si no solicitaste este cambio, ignora este mensaje.`;
  const html = `<p>Tu código de verificación es:</p><p style="font-size:24px;font-weight:bold;letter-spacing:4px;">${code}</p><p>Válido por 15 minutos. Si no solicitaste este cambio, ignora este mensaje.</p>`;

  if (process.env.RESEND_API_KEY) {
    const from =
      process.env.RESEND_FROM || process.env.SMTP_FROM || process.env.SMTP_USER;
    if (!from) {
      throw new Error(
        "Define RESEND_FROM (dominio verificado en Resend) como remitente"
      );
    }
    await sendViaResend({ from, to: email, subject, text, html });
    return;
  }

  const transport = createMailTransport();
  if (!transport) {
    if (devLog) {
      console.log(`[password-reset] OTP para ${email}: ${code}`);
      return;
    }
    throw new Error(
      "Correo no configurado: en producción (Render free) usa RESEND_API_KEY + RESEND_FROM; en local Gmail (SMTP_SERVICE=gmail + credenciales) o PASSWORD_RESET_DEV_OTP=true"
    );
  }

  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  if (!from) {
    throw new Error("Define SMTP_FROM o SMTP_USER como remitente");
  }

  await transport.sendMail({
    from,
    to: email,
    subject,
    text,
    html,
  });
}

module.exports = { sendPasswordResetOtp };
