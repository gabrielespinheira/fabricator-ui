// The Electron shell of the desktop example: one window over the website's
// /desktop route. macOS gets the traffic lights inset beside the sidebar
// toggle and the sidebar material behind a transparent page; Windows and
// Linux get their window buttons drawn over the page (titleBarOverlay).
// Keep the light position in step with apps/web/app/(view)/desktop/_lib/desktop.ts.
import path from "node:path"
import { fileURLToPath } from "node:url"
import { app, BrowserWindow, ipcMain, nativeTheme, shell } from "electron"

const PAGE_URL =
  process.env.FABRICATOR_DESKTOP_URL ?? "http://localhost:4000/desktop"
const isMac = process.platform === "darwin"
const directory = path.dirname(fileURLToPath(import.meta.url))

app.setName("Fabricator UI")

function createWindow() {
  const window = new BrowserWindow({
    title: "Fabricator UI",
    width: 1280,
    height: 820,
    minWidth: 900,
    minHeight: 600,
    titleBarStyle: isMac ? "hiddenInset" : "hidden",
    ...(isMac
      ? {
          trafficLightPosition: { x: 16, y: 23 },
          vibrancy: "sidebar",
          visualEffectState: "followWindow",
          backgroundColor: "#00000000",
        }
      : { titleBarOverlay: true }),
    webPreferences: {
      preload: path.join(directory, "preload.cjs"),
      contextIsolation: true,
      sandbox: true,
    },
  })

  // Links that leave the example (the docs) open in the default browser.
  window.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http:") || url.startsWith("https:")) {
      void shell.openExternal(url)
    }
    return { action: "deny" }
  })

  void window.loadURL(PAGE_URL)
}

// The page reports its theme, so the native material matches it.
ipcMain.on("fabricator:appearance", (_event, appearance) => {
  if (appearance === "light" || appearance === "dark") {
    nativeTheme.themeSource = appearance
  }
})

app.whenReady().then(() => {
  createWindow()
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on("window-all-closed", () => {
  app.quit()
})
