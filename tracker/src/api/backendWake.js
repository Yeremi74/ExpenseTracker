import { resolveApiUrl } from './apiUrl.js'

const HEALTH_PATH = '/api/health'
const RETRY_DELAY_MS = 2000
const HEALTH_TIMEOUT_MS = 10000
const STARTING_UP_STATUSES = new Set([502, 503, 504])

let status = 'checking'
let wakePromise = null
let processingQueue = false
const queue = []
const listeners = new Set()

export class BackendUnavailableError extends Error {
  constructor(message = 'Backend unavailable') {
    super(message)
    this.name = 'BackendUnavailableError'
  }
}

function setStatus(next) {
  if (status === next) return
  status = next
  listeners.forEach((listener) => listener(status))
}

export function subscribeToBackendStatus(listener) {
  listeners.add(listener)
  listener(status)
  return () => listeners.delete(listener)
}

export function getBackendStatus() {
  return status
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function isNetworkFailure(error) {
  return error instanceof TypeError || error?.name === 'AbortError'
}

function isStartingUpResponse(res) {
  return STARTING_UP_STATUSES.has(res.status)
}

async function pingHealth() {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), HEALTH_TIMEOUT_MS)
    const res = await fetch(resolveApiUrl(HEALTH_PATH), {
      signal: controller.signal,
    })
    clearTimeout(timeoutId)
    if (!res.ok) return false
    const data = await res.json().catch(() => ({}))
    return data.ok === true
  } catch {
    return false
  }
}

async function wakeBackend() {
  setStatus('waking')
  let alive = await pingHealth()
  while (!alive) {
    await sleep(RETRY_DELAY_MS)
    alive = await pingHealth()
  }
  setStatus('ready')
}

async function ensureBackendReady() {
  if (status === 'ready') return

  if (!wakePromise) {
    wakePromise = wakeBackend().finally(() => {
      wakePromise = null
    })
  }

  await wakePromise
}

async function processQueue() {
  if (processingQueue) return
  processingQueue = true

  try {
    while (queue.length > 0) {
      if (status !== 'ready') {
        await ensureBackendReady()
      }

      const item = queue.shift()
      if (!item) continue

      try {
        item.resolve(await item.execute())
      } catch (error) {
        if (error instanceof BackendUnavailableError || isNetworkFailure(error)) {
          setStatus('waking')
          queue.unshift(item)
          await ensureBackendReady()
          continue
        }
        item.reject(error)
      }
    }
  } finally {
    processingQueue = false
  }
}

function enqueueRequest(execute) {
  return new Promise((resolve, reject) => {
    queue.push({ execute, resolve, reject })
    void processQueue()
  })
}

export async function guardedFetch(execute) {
  if (status !== 'ready') {
    return enqueueRequest(execute)
  }

  try {
    const result = await execute()
    if (result?.status && isStartingUpResponse(result)) {
      setStatus('waking')
      throw new BackendUnavailableError()
    }
    return result
  } catch (error) {
    if (error instanceof BackendUnavailableError || isNetworkFailure(error)) {
      setStatus('waking')
      return enqueueRequest(execute)
    }
    throw error
  }
}

export async function initializeBackend() {
  await ensureBackendReady()
}
