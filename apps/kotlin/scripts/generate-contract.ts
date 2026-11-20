import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises"
import { resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { z } from "zod"

const numberMap = z.record(z.string(), z.number())
const theme = z.object({
  colors: z.record(z.string(), z.string()),
  radius: numberMap,
  variables: z.record(z.string(), z.union([z.string(), z.number()])),
})
const iconNode = z.tuple([z.string(), z.record(z.string(), z.string())])
const spinnerDot = z.object({
  x: z.number(),
  y: z.number(),
  phase: z.number(),
  opacity: z.number(),
  width: z.number(),
  height: z.number(),
  shape: z.enum(["circle", "square", "triangle", "hexagon"]),
  travelX: z.number(),
  travelY: z.number(),
})
const spinnerFrame = z.object({
  at: z.number(),
  opacity: z.number(),
  scaleX: z.number(),
  scaleY: z.number(),
  translateX: z.number(),
  translateY: z.number(),
  rotation: z.number(),
})
const calendarWash = z.object({
  rest: z.number(),
  hover: z.number(),
  past: z.number(),
})
const contractSchema = z.object({
  schemaVersion: z.literal(1),
  themes: z.object({ light: theme, dark: theme }),
  densities: z.record(
    z.string(),
    z.object({ space: numberMap, text: numberMap, icon: numberMap })
  ),
  motion: z.record(
    z.string(),
    z
      .object({
        easings: z.record(z.string(), z.string()),
        scales: z.object({ press: z.number() }).passthrough(),
        durations: z.record(
          z.string(),
          z.object({ enter: z.number(), exit: z.number() })
        ),
      })
      .passthrough()
  ),
  items: z.array(
    z.object({
      name: z.string(),
      title: z.string(),
      group: z.string(),
      type: z.string(),
    })
  ),
  icons: z.array(z.object({ name: z.string(), node: z.array(iconNode) })),
  soundMasterLevel: z.number(),
  calendar: z.object({
    colors: z.array(z.string()),
    chipWash: z.object({ light: calendarWash, dark: calendarWash }),
  }),
  gooey: z.object({
    resting: z.array(z.number()).length(50),
    effects: z.record(z.string(), z.array(z.number()).length(50)),
    subtle: z.number(),
    expressive: z.number(),
    waviness: z.number(),
  }),
  spinners: z.object({
    durationMs: z.number(),
    variants: z.array(
      z.object({
        value: z.string(),
        label: z.string(),
        description: z.string(),
        dots: z.array(spinnerDot),
        motion: z.array(spinnerFrame),
      })
    ),
  }),
  sounds: z.array(
    z.object({
      name: z.string(),
      description: z.string(),
      partials: z.array(
        z.object({
          wave: z.string(),
          freq: z.number(),
          length: z.number(),
          gain: z.number(),
          to: z.number().optional(),
          at: z.number().optional(),
          attack: z.number().optional(),
          lowpass: z.number().optional(),
          q: z.number().optional(),
        })
      ),
    })
  ),
})

const quote = (value: string) => JSON.stringify(value).replaceAll("$", "\\$")
const stringMap = (values: Record<string, string>) =>
  `mapOf(${Object.entries(values)
    .map(([key, value]) => `${quote(key)} to ${quote(value)}`)
    .join(",")})`
const numberMapSource = (values: Record<string, number>) =>
  `mapOf(${Object.entries(values)
    .map(([key, value]) => `${quote(key)} to ${value}f`)
    .join(",")})`

function easingSource(value: string): string {
  const match = /^cubic-bezier\(([^)]+)\)$/.exec(value)
  if (!match?.[1]) throw new Error(`Unsupported native motion curve: ${value}`)
  const values = z
    .tuple([z.number(), z.number(), z.number(), z.number()])
    .parse(match[1].split(",").map(Number))
  return `FabricatorEasingValues(${values.map((value) => `${value}f`).join(",")})`
}

const projectRoot = resolve(fileURLToPath(new URL("..", import.meta.url)))
const source = resolve(projectRoot, "../web/generated/platforms/contract.json")
const output = resolve(
  projectRoot,
  "ui/build/generated/fabricator/fabricator-generated.kt"
)
const contract = contractSchema.parse(
  JSON.parse(await readFile(source, "utf8"))
)
const chunks = Array.from(
  { length: Math.ceil(contract.icons.length / 24) },
  (_, index) => contract.icons.slice(index * 24, (index + 1) * 24)
)
const lines = [
  "// Generated from Fabricator's canonical platform contract. Do not edit.",
  "package dev.fabricator.ui.generated",
  "import dev.fabricator.ui.FabricatorIconNode",
  "import dev.fabricator.ui.FabricatorDensityValues",
  "import dev.fabricator.ui.FabricatorSoundRecipe",
  "import dev.fabricator.ui.FabricatorSoundPartial",
  "import dev.fabricator.ui.FabricatorSpinnerDot",
  "import dev.fabricator.ui.FabricatorSpinnerFrame",
  "import dev.fabricator.ui.FabricatorSpinnerDefinition",
  "import dev.fabricator.ui.FabricatorEasingValues",
  `enum class FabricatorSpinnerVariant(val key:String) { ${contract.spinners.variants
    .map(
      (variant) =>
        `${variant.value
          .split("-")
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join("")}(${quote(variant.value)})`
    )
    .join(",")} }`,
  "data class FabricatorCatalogItem(val name:String,val title:String,val group:String,val type:String)",
  "object FabricatorGenerated {",
  `const val soundMasterLevel:Float = ${contract.soundMasterLevel}f`,
  `const val spinnerDurationMilliseconds:Float = ${contract.spinners.durationMs}f`,
  `const val gooeySubtle:Float = ${contract.gooey.subtle}f`,
  `const val gooeyExpressive:Float = ${contract.gooey.expressive}f`,
  `const val gooeyWaviness:Float = ${contract.gooey.waviness}f`,
  `val gooeyResting:FloatArray = floatArrayOf(${contract.gooey.resting.map((value) => `${value}f`).join(",")})`,
  `val gooeyEffects:Map<String,FloatArray> = mapOf(${Object.entries(
    contract.gooey.effects
  )
    .map(
      ([effect, points]) =>
        `${quote(effect)} to floatArrayOf(${points.map((value) => `${value}f`).join(",")})`
    )
    .join(",")})`,
  `val calendarColors:List<String> = listOf(${contract.calendar.colors.map(quote).join(",")})`,
  `val calendarChipWash:Map<String,Map<String,Float>> = mapOf(${Object.entries(
    contract.calendar.chipWash
  )
    .map(([mode, wash]) => `${quote(mode)} to ${numberMapSource(wash)}`)
    .join(",")})`,
  `val pressScales:Map<String,Float> = mapOf(${Object.entries(contract.motion)
    .map(([name, motion]) => `${quote(name)} to ${motion.scales["press"]}f`)
    .join(",")})`,
  `val easings:Map<String,Map<String,FabricatorEasingValues>> = mapOf(${Object.entries(
    contract.motion
  )
    .map(
      ([name, motion]) =>
        `${quote(name)} to mapOf(${Object.entries(motion.easings)
          .map(([role, value]) => `${quote(role)} to ${easingSource(value)}`)
          .join(",")})`
    )
    .join(",")})`,
  `val spinners:List<FabricatorSpinnerDefinition> by lazy { listOf(${contract.spinners.variants.map((_, index) => `spinnerVariant${index}()`).join(",")}) }`,
  `val lightColors:Map<String,String> by lazy { ${stringMap(contract.themes.light.colors)} }`,
  `val darkColors:Map<String,String> by lazy { ${stringMap(contract.themes.dark.colors)} }`,
  `val radius:Map<String,Float> = ${numberMapSource(contract.themes.light.radius)}`,
  `val densities:Map<String,FabricatorDensityValues> = mapOf(${Object.entries(
    contract.densities
  )
    .map(
      ([name, values]) =>
        `${quote(name)} to FabricatorDensityValues(${numberMapSource(values.space)},${numberMapSource(values.text)},${numberMapSource(values.icon)})`
    )
    .join(",")})`,
  `val durations:Map<String,Map<String,Int>> = mapOf(${Object.entries(
    contract.motion
  )
    .map(
      ([name, values]) =>
        `${quote(name)} to mapOf(${Object.entries(values.durations)
          .map(
            ([role, duration]) =>
              `${quote(role)} to ${Math.round(duration.enter)}`
          )
          .join(",")})`
    )
    .join(",")})`,
  `val catalog:List<FabricatorCatalogItem> = listOf(${contract.items.map((item) => `FabricatorCatalogItem(${quote(item.name)},${quote(item.title)},${quote(item.group)},${quote(item.type)})`).join(",")})`,
  `fun icon(name:String):List<FabricatorIconNode>? = ${chunks.map((_, index) => `iconChunk${index}(name)`).join(" ?: ")}`,
  `val sounds:List<FabricatorSoundRecipe> = listOf(${contract.sounds.map((sound) => `FabricatorSoundRecipe(${quote(sound.name)},${quote(sound.description)},listOf(${sound.partials.map((partial) => `FabricatorSoundPartial(${quote(partial.wave)},${partial.freq}f,${partial.length}f,${partial.gain}f,${partial.to ?? partial.freq}f,${partial.at ?? 0}f,${partial.attack ?? 1}f,${partial.lowpass ?? 20000}f)`).join(",")}))`).join(",")})`,
  "}",
  ...contract.spinners.variants.map(
    (variant, index) =>
      `private fun spinnerVariant${index}():FabricatorSpinnerDefinition = FabricatorSpinnerDefinition(${quote(variant.value)},${quote(variant.label)},${quote(variant.description)},listOf(${variant.dots.map((dot) => `FabricatorSpinnerDot(${dot.x}f,${dot.y}f,${dot.phase}f,${dot.opacity}f,${dot.width}f,${dot.height}f,${quote(dot.shape)},${dot.travelX}f,${dot.travelY}f)`).join(",")}),listOf(${variant.motion.map((frame) => `FabricatorSpinnerFrame(${frame.at}f,${frame.opacity}f,${frame.scaleX}f,${frame.scaleY}f,${frame.translateX}f,${frame.translateY}f,${frame.rotation}f)`).join(",")}))`
  ),
  ...chunks.map(
    (icons, index) =>
      `private fun iconChunk${index}(name:String):List<FabricatorIconNode>? = when(name) {\n${icons.map((icon) => `${quote(icon.name)} -> listOf(${icon.node.map(([tag, attributes]) => `FabricatorIconNode(${quote(tag)},${stringMap(attributes)})`).join(",")})`).join("\n")}\nelse -> null\n}`
  ),
]
await mkdir(resolve(output, ".."), { recursive: true })
await writeFile(output, lines.join("\n") + "\n")
const registryOutput = resolve(
  projectRoot,
  "../web/generated/platforms/compose/fabricator-generated.kt"
)
await mkdir(resolve(registryOutput, ".."), { recursive: true })
await writeFile(registryOutput, lines.join("\n") + "\n")
const resourceDirectory = resolve(
  projectRoot,
  "ui/src/commonMain/composeResources/font"
)
await mkdir(resourceDirectory, { recursive: true })
for (const font of [
  { source: "InterVariable.ttf", target: "inter_variable.ttf" },
  { source: "InterVariable-Italic.ttf", target: "inter_variable_italic.ttf" },
]) {
  await copyFile(
    resolve(
      projectRoot,
      "../web/registry/fabricator/assets/fonts",
      font.source
    ),
    resolve(resourceDirectory, font.target)
  )
}
await mkdir(resolve(resourceDirectory, "../files"), { recursive: true })
await copyFile(
  resolve(projectRoot, "../web/registry/fabricator/assets/fonts/LICENSE.txt"),
  resolve(resourceDirectory, "../files/inter-license.txt")
)

const frameSchema = z.object({
  left: z.array(z.array(z.number())),
  right: z.array(z.array(z.number())),
  tilt: z.number(),
  pitch: z.number(),
  yaw: z.number(),
  gazeX: z.number(),
  gazeY: z.number(),
})
const botFace = z
  .object({
    framesPerSecond: z.number(),
    shapes: z.record(z.string(), z.string()),
    frames: z.record(z.string(), z.record(z.string(), z.array(frameSchema))),
  })
  .parse(
    JSON.parse(
      await readFile(
        resolve(projectRoot, "../web/generated/platforms/bot-face.json"),
        "utf8"
      )
    )
  )
const binaryChunks: Buffer[] = []
let binaryBuffer = Buffer.alloc(65536)
let binaryOffset = 0
function reserveBinary(bytes: number) {
  if (binaryOffset + bytes <= binaryBuffer.length) return
  binaryChunks.push(binaryBuffer.subarray(0, binaryOffset))
  binaryBuffer = Buffer.alloc(Math.max(65536, bytes))
  binaryOffset = 0
}
function writeInteger(value: number) {
  reserveBinary(4)
  binaryBuffer.writeInt32LE(value, binaryOffset)
  binaryOffset += 4
}
function writeFloat(value: number) {
  reserveBinary(4)
  binaryBuffer.writeFloatLE(value, binaryOffset)
  binaryOffset += 4
}
function writeString(value: string) {
  const bytes = Buffer.from(value)
  writeInteger(bytes.length)
  reserveBinary(bytes.length)
  bytes.copy(binaryBuffer, binaryOffset)
  binaryOffset += bytes.length
}
writeFloat(botFace.framesPerSecond)
writeInteger(Object.keys(botFace.shapes).length)
for (const [name, path] of Object.entries(botFace.shapes)) {
  writeString(name)
  writeString(path)
}
writeInteger(Object.keys(botFace.frames).length)
for (const [name, eyes] of Object.entries(botFace.frames)) {
  writeString(name)
  writeInteger(Object.keys(eyes).length)
  for (const [style, frames] of Object.entries(eyes)) {
    writeString(style)
    writeInteger(frames.length)
    for (const frame of frames) {
      for (const value of [
        frame.tilt,
        frame.pitch,
        frame.yaw,
        frame.gazeX,
        frame.gazeY,
      ])
        writeFloat(value)
      for (const contours of [frame.left, frame.right]) {
        writeInteger(contours.length)
        for (const contour of contours) {
          writeInteger(contour.length)
          for (const value of contour) writeFloat(value)
        }
      }
    }
  }
}
binaryChunks.push(binaryBuffer.subarray(0, binaryOffset))
const botFaceBytes = Buffer.concat(binaryChunks)
await writeFile(
  resolve(registryOutput, "../fabricator-bot-face.bin"),
  botFaceBytes
)
await writeFile(
  resolve(resourceDirectory, "../files/fabricator-bot-face.bin"),
  botFaceBytes
)
const registryManifest = z
  .object({
    items: z.array(
      z.object({
        files: z.array(z.object({ path: z.string(), target: z.string() })),
      })
    ),
  })
  .parse(
    JSON.parse(
      await readFile(
        resolve(projectRoot, "../web/registry/compose/manifest.json"),
        "utf8"
      )
    )
  )
const sourceFiles = new Map(
  registryManifest.items.flatMap((item) =>
    item.files
      .filter((file) => file.target.endsWith(".kt"))
      .map((file) => [file.target, file.path])
  )
)
for (const [target, path] of sourceFiles) {
  const targetPath = resolve(
    projectRoot,
    "ui/build/generated/registry",
    target.replace(/^src\//, "")
  )
  await mkdir(resolve(targetPath, ".."), { recursive: true })
  await copyFile(
    resolve(projectRoot, "../web/registry/compose", path),
    targetPath
  )
}
process.stdout.write(
  `Generated Compose theme, ${contract.items.length} catalog items and ${contract.icons.length} icons.\n`
)
