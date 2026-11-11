/**
 * A small npm registry for the end-to-end tests: the icon packages and
 * editor-native come from tarballs of the workspace packages, everything else
 * from npm. So the tests install the packages this checkout builds, published
 * or not.
 *
 *   bun ./src/local-npm.ts <port> <tarball> <package.json> [<tarball> <package.json>…]
 */
import { createHash } from "node:crypto"
import fs from "node:fs"

const [port, ...packageArgs] = process.argv.slice(2)
if (!port || packageArgs.length === 0 || packageArgs.length % 2 !== 0) {
  throw new Error(
    "Usage: local-npm.ts <port> <tarball> <package.json> [<tarball> <package.json>…]"
  )
}

const NPM = "https://registry.npmjs.org"

const packages = new Map<string, { packument: string; tarball: Buffer }>()
const tarballs = new Map<string, Buffer>()

for (let index = 0; index < packageArgs.length; index += 2) {
  const tarball = fs.readFileSync(packageArgs[index]!)
  const { devDependencies: _devDependencies, ...manifest } = JSON.parse(
    fs.readFileSync(packageArgs[index + 1]!, "utf8")
  )
  const route = `/-/${manifest.name.replace(/[@/]/g, "-")}.tgz`
  tarballs.set(route, tarball)
  packages.set(manifest.name, {
    tarball,
    packument: JSON.stringify({
      name: manifest.name,
      "dist-tags": { latest: manifest.version },
      versions: {
        [manifest.version]: {
          ...manifest,
          dist: {
            tarball: `http://localhost:${port}${route}`,
            shasum: createHash("sha1").update(tarball).digest("hex"),
            integrity: `sha512-${createHash("sha512").update(tarball).digest("base64")}`,
          },
        },
      },
    }),
  })
}

Bun.serve({
  port: Number(port),
  async fetch(request) {
    const { pathname, search } = new URL(request.url)
    const local = packages.get(decodeURIComponent(pathname).slice(1))
    if (local) {
      return new Response(local.packument, {
        headers: { "content-type": "application/json" },
      })
    }
    const tarball = tarballs.get(pathname)
    if (tarball) return new Response(tarball)
    const accept = request.headers.get("accept")
    const response = await fetch(`${NPM}${pathname}${search}`, {
      headers: accept ? { accept } : {},
    })
    return new Response(response.body, {
      status: response.status,
      headers: {
        "content-type":
          response.headers.get("content-type") ?? "application/octet-stream",
      },
    })
  },
})
