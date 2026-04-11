/** Evento global para mostrar un mensaje de éxito (toast en AppShell). */
export const SUCCESS_NOTIFY_EVENT = 'tracker:success-notify'

/**
 * @param {string} [message] Mensaje breve; por defecto confirma guardado.
 */
export function notifySuccess(message = 'Se ha guardado correctamente.') {
  if (typeof window === 'undefined') return
  window.dispatchEvent(
    new CustomEvent(SUCCESS_NOTIFY_EVENT, {
      detail: { message: String(message) },
    })
  )
}
