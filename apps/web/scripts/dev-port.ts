import net from "node:net"

export function isPortInUse(port: number) {
  return new Promise<boolean>((resolve) => {
    const socket = net.connect({ port, host: "localhost" })
    socket.once("connect", () => {
      socket.destroy()
      resolve(true)
    })
    socket.once("error", () => resolve(false))
  })
}

export function getPortInUseMessage(port: number) {
  return [
    `Port ${port} is already in use, so the dev server was not started.`,
    `If it's the website, it is already running at http://localhost:${port}.`,
    `To stop whatever holds the port: kill $(lsof -ti tcp:${port} -sTCP:LISTEN)`,
  ].join("\n")
}
