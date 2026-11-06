// One window around apps/web: its dev server while developing (`dev`), and its
// static build otherwise (`build:static` in apps/web, then `start`). macOS gets
// the traffic lights inset and the sidebar material behind a transparent page;
// Windows and Linux get their window buttons drawn over the page.
import { existsSync, statSync } from "node:fs"
import path from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import {
  app,
  BrowserWindow,
  ipcMain,
  nativeTheme,
  net,
  protocol,
  shell,
} from "electron"

const APP_NAME = "__APP_NAME__"
const DEV_URL = process.env.DESKTOP_DEV_URL
const IS_GLASS = __IS_GLASS__
const LIGHTS = { x: 16, y: __LIGHTS_Y__ }

const isMac = process.platform === "darwin"
const directory = path.dirname(fileURLToPath(import.meta.url))
const webRoot = path.resolve(directory, "../../web/__WEB_OUTPUT__")

// `file://` breaks a static build's absolute paths, so it gets its own origin.
protocol.registerSchemesAsPrivileged([
  {
    scheme: "app",
    privileges: { standard: true, secure: true, supportFetchAPI: true },
  },
])

function resolveFile(pathname) {
  const relative = decodeURIComponent(pathname).replace(/^\/+/, "")
  const candidates = [
    relative,
    `${relative}.html`,
    path.join(relative, "index.html"),
    "index.html",
  ]
  return candidates
    .map((candidate) => path.resolve(webRoot, candidate))
    .find(
      (file) =>
        file.startsWith(webRoot) &&
        existsSync(file) &&
        statSync(file).isFile()
    )
}

app.setName(APP_NAME)

function createWindow() {
  const window = new BrowserWindow({
    title: APP_NAME,
    width: 1280,
    height: 820,
    minWidth: 900,
    minHeight: 600,
    titleBarStyle: isMac ? "hiddenInset" : "hidden",
    ...(isMac
      ? {
          trafficLightPosition: LIGHTS,
          ...(IS_GLASS && {
            vibrancy: "sidebar",
            visualEffectState: "followWindow",
            backgroundColor: "#00000000",
          }),
        }
      : { titleBarOverlay: true }),
    webPreferences: {
      preload: path.join(directory, "preload.cjs"),
      contextIsolation: true,
      sandbox: true,
    },
  })

  // Links that leave the app open in the default browser.
  window.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http:") || url.startsWith("https:")) {
      void shell.openExternal(url)
    }
    return { action: "deny" }
  })

  void window.loadURL(DEV_URL ?? "app://local/")
}

// The page reports its theme, so the native material matches it.
ipcMain.on("fabricator:appearance", (_event, appearance) => {
  if (appearance === "light" || appearance === "dark") {
    nativeTheme.themeSource = appearance
  }
})

// The page moves the lights to fit its layout: a titlebar row is shorter.
ipcMain.on("fabricator:traffic-lights", (event, position) => {
  if (!isMac) return
  if (!Number.isFinite(position?.x) || !Number.isFinite(position?.y)) return
  BrowserWindow.fromWebContents(event.sender)?.setWindowButtonPosition({
    x: position.x,
    y: position.y,
  })
})

app.whenReady().then(() => {
  protocol.handle("app", (request) => {
    const file = resolveFile(new URL(request.url).pathname)
    return file
      ? net.fetch(pathToFileURL(file).toString())
      : new Response("Not found", { status: 404 })
  })
  createWindow()
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on("window-all-closed", () => {
  app.quit()
})
