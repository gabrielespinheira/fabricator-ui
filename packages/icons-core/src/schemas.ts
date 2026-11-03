import fs from "node:fs"
import { z } from "zod"

import { BRAND_GROUPS } from "./types"

export const iconAliasSchema = z.object({
  name: z.string(),
  deprecated: z.literal(true).optional(),
  deprecationReason: z.string().optional(),
  toBeRemovedInVersion: z.string().optional(),
})

/** Lucide's icon metadata, also used for Fabricator originals. */
export const iconMetadataSchema = z.object({
  tags: z.array(z.string()),
  categories: z.array(z.string()),
  aliases: z.array(iconAliasSchema).optional(),
})

export const brandMetadataSchema = z.object({
  title: z.string(),
  group: z.enum(BRAND_GROUPS),
  tags: z.array(z.string()),
  aliases: z.array(z.string()),
  hex: z.string().regex(/^#[0-9a-f]{6}$/i),
  scale: z.number().optional(),
  source: z.string(),
  license: z.string(),
  guidelines: z.string().optional(),
  artSource: z.string().optional(),
})

export const iconsLockSchema = z.object({
  lucide: z
    .object({ tag: z.string(), sha: z.string(), syncedAt: z.string() })
    .optional(),
  simpleIcons: z.object({ version: z.string() }).optional(),
  logos: z.object({ version: z.string() }).optional(),
})

export const categorySchema = z.object({ title: z.string() })

export const brandStopwordsSchema = z.record(z.string(), z.string())

const sourceRefSchema = z.discriminatedUnion("from", [
  z.object({ from: z.literal("simple-icons"), slug: z.string() }),
  z.object({
    from: z.literal("logos"),
    icon: z.string(),
    /** The paint for unfilled shapes, which the logos set means as black. */
    unfilled: z.string().optional(),
    /** Outdated colours (lowercase) mapped to the brand's current ones. */
    recolor: z.record(z.string(), z.string()).optional(),
  }),
  z.object({ from: z.literal("sharpos"), slug: z.string() }),
  /** Mono only: the entry's single-path art, in one colour. */
  z.object({ from: z.literal("art") }),
  /** Art only: the one-colour mark in its hex over a white shape, so cut-outs read white. */
  z.object({
    from: z.literal("underlay"),
    shape: z.enum(["circle", "square"]),
  }),
])

export type SourceRef = z.infer<typeof sourceRefSchema>

export const allowlistSchema = z.object({
  $comment: z.string(),
  brands: z.array(
    z.object({
      name: z.string(),
      title: z.string(),
      group: z.enum(BRAND_GROUPS),
      tags: z.array(z.string()),
      aliases: z.array(z.string()),
      hex: z.string().optional(),
      scale: z.number().optional(),
      mono: sourceRefSchema.optional(),
      art: sourceRefSchema.optional(),
      held: z.string().optional(),
    })
  ),
})

export type Allowlist = z.infer<typeof allowlistSchema>
export type AllowlistEntry = Allowlist["brands"][number]

export const simpleIconsDataSchema = z.array(
  z.object({
    slug: z.string(),
    hex: z.string(),
    source: z.string(),
    guidelines: z.string().optional(),
    license: z.object({ type: z.string() }).optional(),
  })
)

export const logosDataSchema = z.object({
  width: z.number().optional(),
  height: z.number().optional(),
  icons: z.record(
    z.string(),
    z.object({
      body: z.string(),
      width: z.number().optional(),
      height: z.number().optional(),
    })
  ),
})

export const sharposFixtureSchema = z.object({
  source: z.string(),
  brands: z.array(
    z.object({
      slug: z.string(),
      label: z.string(),
      group: z.string(),
      hex: z.string(),
      keywords: z.array(z.string()),
      path: z.string(),
      art: z
        .object({ width: z.number(), height: z.number(), body: z.string() })
        .optional(),
      scale: z.number().optional(),
      colors: z.object({
        inherit: z.boolean(),
        light: z.string(),
        dark: z.string(),
      }),
      viewBox: z.string(),
    })
  ),
})

export type SharposBrand = z.infer<
  typeof sharposFixtureSchema
>["brands"][number]

export const packageVersionSchema = z.object({ version: z.string() })

/** Reads a JSON file and validates it against a schema. */
export function readJson<Schema extends z.ZodType>(
  file: string,
  schema: Schema
): z.infer<Schema> {
  return schema.parse(JSON.parse(fs.readFileSync(file, "utf8")))
}
