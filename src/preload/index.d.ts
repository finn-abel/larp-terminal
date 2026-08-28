import type { LarpApi } from '../shared/ipc'

declare global {
  interface Window {
    larp: LarpApi
  }
}

export {}
