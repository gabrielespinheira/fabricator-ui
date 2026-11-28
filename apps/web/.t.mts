import { compile } from "@tailwindcss/node"
import { serializeCss } from "@/registry/fabricator/foundations"
import { SCROLL_FADE_CSS } from "@/registry/fabricator/scroll-fade"
const c = await compile(['@import "tailwindcss/utilities.css" source(none);','@import "shadcn/tailwind.css";',serializeCss(SCROLL_FADE_CSS)].join("\n"), { base: process.cwd(), onDependency() {} })
console.log(c.build(process.argv.slice(2)))
