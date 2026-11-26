import { type StaticImageData } from "next/image"
import assistant01Dark from "@/public/blocks/assistant-01-dark.webp"
import assistant01Light from "@/public/blocks/assistant-01-light.webp"
import billing01Dark from "@/public/blocks/billing-01-dark.webp"
import billing01Light from "@/public/blocks/billing-01-light.webp"
import board01Dark from "@/public/blocks/board-01-dark.webp"
import board01Light from "@/public/blocks/board-01-light.webp"
import calendarApp01Dark from "@/public/blocks/calendar-app-01-dark.webp"
import calendarApp01Light from "@/public/blocks/calendar-app-01-light.webp"
import finance01Dark from "@/public/blocks/finance-01-dark.webp"
import finance01Light from "@/public/blocks/finance-01-light.webp"
import forgotPassword01Dark from "@/public/blocks/forgot-password-01-dark.webp"
import forgotPassword01Light from "@/public/blocks/forgot-password-01-light.webp"
import mail01Dark from "@/public/blocks/mail-01-dark.webp"
import mail01Light from "@/public/blocks/mail-01-light.webp"
import members01Dark from "@/public/blocks/members-01-dark.webp"
import members01Light from "@/public/blocks/members-01-light.webp"
import messenger01Dark from "@/public/blocks/messenger-01-dark.webp"
import messenger01Light from "@/public/blocks/messenger-01-light.webp"
import onboarding01Dark from "@/public/blocks/onboarding-01-dark.webp"
import onboarding01Light from "@/public/blocks/onboarding-01-light.webp"
import settings01Dark from "@/public/blocks/settings-01-dark.webp"
import settings01Light from "@/public/blocks/settings-01-light.webp"
import signIn01Dark from "@/public/blocks/sign-in-01-dark.webp"
import signIn01Light from "@/public/blocks/sign-in-01-light.webp"
import signUp01Dark from "@/public/blocks/sign-up-01-dark.webp"
import signUp01Light from "@/public/blocks/sign-up-01-light.webp"

import { type BlockSummary } from "./blocks"

type BlockPreviews = Record<"light" | "dark", StaticImageData>

export type GalleryBlock = BlockSummary & {
  previews: Record<keyof BlockPreviews, string>
}

// Static imports give recaptured previews a new URL for the image cache.
export const blockPreviews: Partial<Record<string, BlockPreviews>> = {
  "assistant-01": { light: assistant01Light, dark: assistant01Dark },
  "billing-01": { light: billing01Light, dark: billing01Dark },
  "board-01": { light: board01Light, dark: board01Dark },
  "calendar-app-01": { light: calendarApp01Light, dark: calendarApp01Dark },
  "finance-01": { light: finance01Light, dark: finance01Dark },
  "forgot-password-01": {
    light: forgotPassword01Light,
    dark: forgotPassword01Dark,
  },
  "mail-01": { light: mail01Light, dark: mail01Dark },
  "members-01": { light: members01Light, dark: members01Dark },
  "messenger-01": { light: messenger01Light, dark: messenger01Dark },
  "onboarding-01": { light: onboarding01Light, dark: onboarding01Dark },
  "settings-01": { light: settings01Light, dark: settings01Dark },
  "sign-in-01": { light: signIn01Light, dark: signIn01Dark },
  "sign-up-01": { light: signUp01Light, dark: signUp01Dark },
}
