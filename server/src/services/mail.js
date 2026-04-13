const nodemailer = require("nodemailer");

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
 * Envía el OTP con Nodemailer (Gmail u otro SMTP vía env).
 * Gmail: SMTP_SERVICE=gmail, SMTP_USER, SMTP_PASS (contraseña de aplicación).
 * Otro: SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS.
 * PASSWORD_RESET_DEV_OTP=true: solo consola en desarrollo.
 */
async function sendPasswordResetOtp(email, code) {
  const devLog = process.env.PASSWORD_RESET_DEV_OTP === "true";
  const subject = "Código para restablecer tu contraseña";
  const text = `Tu código de verificación es: ${code}\n\nVálido por 15 minutos. Si no solicitaste este cambio, ignora este mensaje.`;
  const html = `<p>Tu código de verificación es:</p><p style="font-size:24px;font-weight:bold;letter-spacing:4px;">${code}</p><p>Válido por 15 minutos. Si no solicitaste este cambio, ignora este mensaje.</p>`;

  const transport = createMailTransport();
  if (!transport) {
    if (devLog) {
      console.log(`[password-reset] OTP para ${email}: ${code}`);
      return;
    }
    throw new Error(
      "Correo no configurado: Gmail (SMTP_SERVICE=gmail + SMTP_USER + SMTP_PASS) o SMTP_HOST + credenciales, o PASSWORD_RESET_DEV_OTP=true en desarrollo"
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
