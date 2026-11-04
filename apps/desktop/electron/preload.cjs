// What the page knows about its Electron window (read by
// apps/web/app/(view)/desktop/_lib/desktop.ts). A sandboxed preload, so
// CommonJS.
const { contextBridge, ipcRenderer } = require("electron")

contextBridge.exposeInMainWorld("fabricatorDesktop", {
  runtime: "electron",
  platform: process.platform,
  setAppearance: (appearance) =>
    ipcRenderer.send("fabricator:appearance", appearance),
})
