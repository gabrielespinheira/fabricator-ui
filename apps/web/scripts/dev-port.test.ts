import net from "node:net"
import { describe, expect, it } from "vitest"

import { getPortInUseMessage, isPortInUse } from "./dev-port"

function listen() {
  return new Promise<net.Server>((resolve) => {
    const server = net.createServer()
    server.listen(0, () => resolve(server))
  })
}

function close(server: net.Server) {
  return new Promise((resolve) => server.close(resolve))
}

function getPort(server: net.Server) {
  const address = server.address()
  if (address === null || typeof address === "string") {
    throw new Error("The test server has no port.")
  }
  return address.port
}

describe("isPortInUse", () => {
  it("is true while something listens on the port", async () => {
    const server = await listen()

    await expect(isPortInUse(getPort(server))).resolves.toBe(true)

    await close(server)
  })

  it("is false once nothing listens on the port", async () => {
    const server = await listen()
    const port = getPort(server)
    await close(server)

    await expect(isPortInUse(port)).resolves.toBe(false)
  })
})

describe("getPortInUseMessage", () => {
  it("names the URL and a command that only stops the listener", () => {
    const message = getPortInUseMessage(4000)

    expect(message).toContain("http://localhost:4000")
    expect(message).toContain("lsof -ti tcp:4000 -sTCP:LISTEN")
  })
})
