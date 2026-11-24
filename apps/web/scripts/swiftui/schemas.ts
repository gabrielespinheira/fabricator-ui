import { z } from "zod"

export const fileIconCatalogSchema = z.object({
  names: z.array(z.string().min(1)),
  fileNames: z.record(z.string(), z.string()),
  fileExtensions: z.record(z.string(), z.string()),
  folderNames: z.record(z.string(), z.string()),
})

export const platformCatalogSchema = z.object({
  items: z.array(
    z.object({ name: z.string().min(1), group: z.string(), type: z.string() })
  ),
})
