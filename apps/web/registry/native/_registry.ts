import { type Registry } from "shadcn/schema"

import { blockItems } from "./items/blocks"
import { contentItems } from "./items/content"
import { dataItems } from "./items/data"
import { formItems } from "./items/forms"
import { foundationItems } from "./items/foundation"
import { navigationItems } from "./items/navigation"
import { overlayItems } from "./items/overlays"

// Item declarations for React Native. Names match the website's items, so
// `@fabricator/button` installs the right one for the project's registry URL.
export const nativeItems: Registry["items"] = [
  ...foundationItems,
  ...contentItems,
  ...formItems,
  ...dataItems,
  ...overlayItems,
  ...navigationItems,
  ...blockItems,
]
