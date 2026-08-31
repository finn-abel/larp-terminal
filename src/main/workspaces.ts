import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { app, ipcMain } from 'electron'
import {
  WorkspaceChannel,
  type WorkspaceFile,
  type WorkspaceLayout,
  type WorkspaceSnapshot
} from '../shared/ipc'

const VERSION = 1
export const DEFAULT_WORKSPACE = 'default'

let cache: WorkspaceFile | null = null

function filePath(): string {
  return join(app.getPath('userData'), 'workspaces.json')
}

function empty(): WorkspaceFile {
  return { version: VERSION, active: DEFAULT_WORKSPACE, workspaces: {} }
}

/** Reads the store, tolerating a missing, unreadable or stale file. */
async function load(): Promise<WorkspaceFile> {
  if (cache) return cache

  try {
    const raw = await readFile(filePath(), 'utf8')
    const parsed = JSON.parse(raw) as WorkspaceFile
    cache =
      parsed.version === VERSION && typeof parsed.workspaces === 'object' && parsed.workspaces
        ? parsed
        : empty()
  } catch {
    // No file yet, or one we cannot use. Either way, start clean rather than fail launch.
    cache = empty()
  }

  return cache
}

async function persist(next: WorkspaceFile): Promise<WorkspaceFile> {
  cache = next
  const path = filePath()
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, `${JSON.stringify(next, null, 2)}\n`, 'utf8')
  return next
}

function snapshot(file: WorkspaceFile): WorkspaceSnapshot {
  return {
    active: file.active,
    names: Object.keys(file.workspaces).sort(),
    layout: file.workspaces[file.active] ?? null
  }
}

export function registerWorkspaceStore(): void {
  ipcMain.handle(WorkspaceChannel.read, async () => snapshot(await load()))

  ipcMain.handle(
    WorkspaceChannel.write,
    async (_event, name: string, layout: WorkspaceLayout): Promise<WorkspaceSnapshot> => {
      const file = await load()
      const key = normalise(name)
      return snapshot(
        await persist({
          version: VERSION,
          active: key,
          workspaces: { ...file.workspaces, [key]: layout }
        })
      )
    }
  )

  ipcMain.handle(
    WorkspaceChannel.switch,
    async (_event, name: string): Promise<WorkspaceSnapshot> => {
      const file = await load()
      const key = normalise(name)
      if (!(key in file.workspaces)) return snapshot(file)
      return snapshot(await persist({ ...file, active: key }))
    }
  )

  ipcMain.handle(
    WorkspaceChannel.remove,
    async (_event, name: string): Promise<WorkspaceSnapshot> => {
      const file = await load()
      const key = normalise(name)
      const { [key]: removed, ...rest } = file.workspaces
      if (!removed) return snapshot(file)

      const active = file.active === key ? DEFAULT_WORKSPACE : file.active
      return snapshot(await persist({ version: VERSION, active, workspaces: rest }))
    }
  )
}

function normalise(name: string): string {
  const trimmed = name.trim().slice(0, 48)
  return trimmed.length > 0 ? trimmed : DEFAULT_WORKSPACE
}
