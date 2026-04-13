/**
 * Recuperación de contraseña vía OTP por correo.
 * Por defecto desactivado. Para reactivar: VITE_PASSWORD_RESET_OTP_ENABLED=true en .env
 */
export const passwordResetOtpEnabled =
  import.meta.env.VITE_PASSWORD_RESET_OTP_ENABLED === 'true'
