import { z } from "zod"

export const simulatorInventorySchema = z.object({
  devices: z.record(
    z.string(),
    z.array(
      z.object({
        udid: z.string(),
        name: z.string(),
        state: z.string(),
        isAvailable: z.boolean(),
      })
    )
  ),
})
