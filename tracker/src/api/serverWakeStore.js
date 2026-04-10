let serverWaking = false
const listeners = new Set()

export function setServerWaking(value) {
  if (serverWaking === value) return
  serverWaking = value
  for (const fn of listeners) fn()
}

export function getServerWaking() {
  return serverWaking
}

export function subscribeServerWake(onStoreChange) {
  listeners.add(onStoreChange)
  return () => listeners.delete(onStoreChange)
}
