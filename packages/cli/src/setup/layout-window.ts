// `apps add desktop` meets a layout the person may have edited.

const HOOK_IMPORT = (from: string) =>
  `import { useDesktopWindow } from "${from}"`

/**
 * Adds the runtime window to an App Shell layout written for the web. Null when
 * it isn't the shape this file writes; the caller prints what to do.
 */
export function addDesktopWindowToLayout(source: string, hooksAlias: string) {
  if (source.includes("useDesktopWindow")) return source
  const opening = /^(\s*)<AppShell( |$|>)/m.exec(source)
  const body = /^export function AppShellLayout\([\s\S]*?\n\}\) \{\n/m.exec(
    source
  )
  if (!opening || !body) return null
  const lastImport = [...source.matchAll(/^.*from "[^"]+"\n/gm)].at(-1)
  if (!lastImport) return null
  const afterImports = lastImport.index + lastImport[0].length
  const withImport = `${source.slice(0, afterImports)}${HOOK_IMPORT(`${hooksAlias}/use-desktop-window`)}\n${source.slice(afterImports)}`
  const withHook = withImport.replace(
    body[0],
    `${body[0]}  const { shellWindow } = useDesktopWindow({ hasTitlebar: ${source.includes("titlebar={")} })\n`
  )
  return withHook.replace(
    /^(\s*)<AppShell( |$|>)/m,
    (match, indent: string, next: string) =>
      next === ">"
        ? `${indent}<AppShell window={shellWindow}>`
        : `${indent}<AppShell window={shellWindow}${next}`
  )
}
