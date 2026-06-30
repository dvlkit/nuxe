import { existsSync } from 'node:fs'
import { isAbsolute, join, sep } from 'node:path'
import { pagePathToRoute, scanPages, type ScannedPage } from './scanner'

export interface PagesContext {
  emit(): ScannedPage[]
  addFile(filePath: string): void
  removeFile(filePath: string): boolean
  readonly trackedFiles: Set<string>
}

export interface PagesContextOptions {
  cwd: string
  pagesDir?: string
}

export function createPagesContext(options: PagesContextOptions): PagesContext {
  const pagesDir = options.pagesDir ?? 'app/pages'
  const pagesRoot = join(options.cwd, pagesDir)
  const files = new Map<string, ScannedPage>()

  for (const page of scanPages(options.cwd, pagesDir)) {
    files.set(page.filePath, page)
  }

  function resolveAbsolute(filePath: string): string {
    return isAbsolute(filePath) ? filePath : join(options.cwd, filePath)
  }

  function isUnderPagesRoot(absolutePath: string): boolean {
    return absolutePath === pagesRoot || absolutePath.startsWith(pagesRoot + sep)
  }

  return {
    emit() {
      return Array.from(files.values()).sort((a, b) =>
        a.path.localeCompare(b.path) || a.name.localeCompare(b.name),
      )
    },

    addFile(filePath) {
      const absolute = resolveAbsolute(filePath)
      if (!isUnderPagesRoot(absolute)) return
      if (!existsSync(absolute)) return
      const page = pagePathToRoute(absolute, pagesRoot)
      if (page) files.set(absolute, page)
    },

    removeFile(filePath) {
      const absolute = resolveAbsolute(filePath)
      return files.delete(absolute)
    },

    get trackedFiles() {
      return new Set(files.keys())
    },
  }
}