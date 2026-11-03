/** bun run icons:check: the spec checks for originals, brands and duotone. */
import { checkSources } from "../src/check"

const errors = checkSources()
if (errors.length > 0) {
  for (const error of errors) console.error(`✗ ${error}`)
  process.exit(1)
}
console.log("✓ Icon sources pass the checks")
