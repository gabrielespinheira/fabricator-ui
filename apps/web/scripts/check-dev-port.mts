// Runs before everything else in `bun run dev`: the icon builds take minutes,
// and Next only finds out the port is taken after them.
import { getPortInUseMessage, isPortInUse } from "./dev-port"

const port = Number(process.argv[2])

if (await isPortInUse(port)) {
  console.error(getPortInUseMessage(port))
  process.exit(1)
}
