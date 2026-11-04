/**
 * A small npm registry for the end-to-end tests: `@fabricator-ui/icons` comes
 * from a tarball of the workspace package, everything else from npm. So the
 * tests install the icons this checkout builds, published or not.
 *
 *   bun ./src/local-npm.ts <port> <tarball> <package.json>
 */
import { createHash } from "node:crypto"
import fs from "node:fs"

const [port, tarballPath, packageJsonPath] = process.argv.slice(2)
if (!port || !tarballPath || !packageJsonPath) {
  throw new Error("Usage: local-npm.ts <port> <tarball> <package.json>")
}

const NPM = "https://registry.npmjs.org"
const NAME = "@fabricator-ui/icons"
const TARBALL_ROUTE = "/-/fabricator-ui-icons.tgz"

const tarball = fs.readFileSync(tarballPath)
const { devDependencies: _devDependencies, ...manifest } = JSON.parse(
  fs.readFileSync(packageJsonPath, "utf8")
)
const packument = JSON.stringify({
  name: NAME,
  "dist-tags": { latest: manifest.version },
  versions: {
    [manifest.version]: {
      ...manifest,
      dist: {
        tarball: `http://localhost:${port}${TARBALL_ROUTE}`,
        shasum: createHash("sha1").update(tarball).digest("hex"),
        integrity: `sha512-${createHash("sha512").update(tarball).digest("base64")}`,
      },
    },
  },
})

Bun.serve({
  port: Number(port),
  async fetch(request) {
    const { pathname, search } = new URL(request.url)
    if (decodeURIComponent(pathname) === `/${NAME}`) {
      return new Response(packument, {
        headers: { "content-type": "application/json" },
      })
    }
    if (pathname === TARBALL_ROUTE) return new Response(tarball)
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
