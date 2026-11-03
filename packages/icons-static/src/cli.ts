#!/usr/bin/env node
import { parseArgs } from "node:util"

import {
  exportPngs,
  isIconSet,
  MissingRendererError,
  UnknownIconError,
} from "./png.js"

const USAGE = `Usage: fabricator-icons png <names...> [options]

Renders icons to PNG for tray icons, menus and notifications.

Options:
  --set <outline|brands>  Which set the names come from (default: outline)
  --size <points>         Width and height at 1x (default: 16)
  --scale <list>          Pixel densities, comma-separated (default: 1,2)
  --color <color>         Any CSS colour; "brand" for brand colours (default: #000000)
  --stroke <width>        Stroke width for outline icons (default: 2)
  --template              macOS template images: black, named <name>Template.png
  --out <directory>       Where to write the files (default: .)
`

async function main(argv: string[]) {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      set: { type: "string", default: "outline" },
      size: { type: "string", default: "16" },
      scale: { type: "string", default: "1,2" },
      color: { type: "string", default: "#000000" },
      stroke: { type: "string", default: "2" },
      template: { type: "boolean", default: false },
      out: { type: "string", default: "." },
      help: { type: "boolean", short: "h", default: false },
    },
  })
  const [command, ...names] = positionals
  if (values.help || command !== "png" || names.length === 0) {
    console.log(USAGE)
    return values.help ? 0 : 1
  }
  const set = values.set
  if (!isIconSet(set)) {
    console.error(`--set must be outline or brands, not ${set}`)
    return 1
  }
  const written = await exportPngs(names, {
    set,
    size: Number(values.size),
    scales: values.scale.split(",").map(Number),
    color: values.color,
    strokeWidth: Number(values.stroke),
    template: values.template,
    outDir: values.out,
  })
  for (const file of written) console.log(file)
  return 0
}

main(process.argv.slice(2)).then(
  (code) => process.exit(code),
  (error: unknown) => {
    if (
      error instanceof UnknownIconError ||
      error instanceof MissingRendererError
    ) {
      console.error(error.message)
      process.exit(1)
    }
    throw error
  }
)
