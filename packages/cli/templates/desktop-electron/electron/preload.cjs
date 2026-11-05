// What the page knows about its Electron window (read by the desktop-window
// hook). A sandboxed preload, so CommonJS.
const { contextBridge, ipcRenderer } = require("electron")

contextBridge.exposeInMainWorld("fabricatorDesktop", {
  runtime: "electron",
  platform: process.platform,
  setAppearance: (appearance) =>
    ipcRenderer.send("fabricator:appearance", appearance),
  setTrafficLights: (position) =>
    ipcRenderer.send("fabricator:traffic-lights", position),
})
