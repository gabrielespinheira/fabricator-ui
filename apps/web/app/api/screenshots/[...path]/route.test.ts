import { afterEach, describe, expect, it, vi } from "vitest"

import { GET } from "./route"

const request = new Request(
  "http://localhost/api/screenshots/images/native/button.jpg"
)
const context = {
  params: Promise.resolve({ path: ["images", "native", "button.jpg"] }),
}

afterEach(() => vi.unstubAllGlobals())

describe("screenshot delivery", () => {
  it("streams hosted bytes at the original URL for Next Image optimization", async () => {
    const fetch = vi.fn().mockResolvedValue(
      new Response(new Uint8Array([1, 2, 3]), {
        headers: { "Content-Type": "image/jpeg" },
      })
    )
    vi.stubGlobal("fetch", fetch)

    const response = await GET(request, context)

    expect(response.status).toBe(200)
    expect(response.headers.get("Content-Type")).toBe("image/jpeg")
    expect(response.headers.get("Cache-Control")).toContain("public")
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(
      new Uint8Array([1, 2, 3])
    )
    expect(fetch).toHaveBeenCalledWith(
      expect.stringMatching(
        /^https:\/\/github.com\/user-attachments\/assets\//
      ),
      expect.objectContaining({ redirect: "follow" })
    )
  })

  it("rejects unknown paths without an upstream request", async () => {
    const fetch = vi.fn()
    vi.stubGlobal("fetch", fetch)

    const response = await GET(request, {
      params: Promise.resolve({ path: ["unknown.jpg"] }),
    })

    expect(response.status).toBe(404)
    expect(fetch).not.toHaveBeenCalled()
  })

  it("rejects traversal segments", async () => {
    const fetch = vi.fn()
    vi.stubGlobal("fetch", fetch)

    const response = await GET(request, {
      params: Promise.resolve({ path: ["..", "README.md"] }),
    })

    expect(response.status).toBe(400)
    expect(fetch).not.toHaveBeenCalled()
  })

  it("reports an upstream failure instead of caching an error as an image", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(null, { status: 404 }))
    )

    expect((await GET(request, context)).status).toBe(502)
  })

  it("rejects upstream HTML", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response("error", {
          headers: { "Content-Type": "text/html" },
        })
      )
    )

    expect((await GET(request, context)).status).toBe(502)
  })
})
