type Callback = (...args: any) => void

let isFulshingSyncQueue = false
let syncQueue: Callback[] | null = null

export const scheduleSyncCallback = (callback: Callback) => {
  if (syncQueue === null) {
    syncQueue = [callback]
  } else {
    syncQueue.push(callback)
  }
}

export const flushSyncCallbacks = () => {
  if (!isFulshingSyncQueue && syncQueue) {
    isFulshingSyncQueue = true
    try {
      syncQueue.forEach(callback => {
        callback()
      })
    } catch (err) {
      if (__DEV__) {
        console.error('flushSyncQueue 报错', err)
      }
    } finally {
      isFulshingSyncQueue = false
    }
  }
}
