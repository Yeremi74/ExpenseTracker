const nodemailer = require("nodemailer");

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
  });
}

/**
 * Envía el OTP por correo. Si no hay SMTP, en desarrollo puede usarse PASSWORD_RESET_DEV_OTP=true
 * para registrar el código en consola.
 */
async function sendPasswordResetOtp(email, code) {
  const devLog = process.env.PASSWORD_RESET_DEV_OTP === "true";
  const transport = createTransport();
  if (!transport) {
    if (devLog) {
      console.log(`[password-reset] OTP para ${email}: ${code}`);
      return;
    }
    throw new Error(
      "Correo no configurado: define SMTP_HOST (y credenciales) o PASSWORD_RESET_DEV_OTP=true en desarrollo"
    );
  }
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  await transport.sendMail({
    from,
    to: email,
    subject: "Código para restablecer tu contraseña",
    text: `Tu código de verificación es: ${code}\n\nVálido por 15 minutos. Si no solicitaste este cambio, ignora este mensaje.`,
    html: `<p>Tu código de verificación es:</p><p style="font-size:24px;font-weight:bold;letter-spacing:4px;">${code}</p><p>Válido por 15 minutos. Si no solicitaste este cambio, ignora este mensaje.</p>`,
  });
}

module.exports = { sendPasswordResetOtp };
