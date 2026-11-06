// Expo's template names the app after its folder ("mobile" in a monorepo) and
// leaves the store ids to a prompt on the first native build.

import { z } from "zod"

const appJsonSchema = z.looseObject({
  expo: z.looseObject({
    ios: z.looseObject({}).optional(),
    android: z.looseObject({}).optional(),
  }),
})

/** Android allows no hyphen, and no segment that starts with a digit. */
export function toMobileIdentifier(name: string) {
  const slug = name.toLowerCase().replace(/[^a-z0-9]/g, "")
  return `app.${/^[a-z]/.test(slug) ? slug : `a${slug}`}.mobile`
}

export function nameExpoApp(appJson: unknown, appName: string) {
  const { expo, ...rest } = appJsonSchema.parse(appJson)
  const identifier = toMobileIdentifier(appName)
  return {
    ...rest,
    expo: {
      ...expo,
      name: appName,
      ios: { ...expo.ios, bundleIdentifier: identifier },
      android: { ...expo.android, package: identifier },
    },
  }
}
