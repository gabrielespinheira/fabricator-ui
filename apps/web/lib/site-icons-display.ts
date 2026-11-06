import { FABRICATOR_ICONS_PACKAGE } from "@/registry/fabricator"

// The site's Fabricator preview copies import icons from "@/lib/site-icons" so
// they follow the icon pack picked in the site settings (scripts/build-icons.ts).
// Readers get "@fabricator-ui/icons", what a project installs by default: apply
// this wherever source is shown, copied or exported.
export function restoreIconImports(code: string) {
  return code.replace(
    /(\bfrom\s*)(["'])(?:@\/lib\/site-icons|lucide-react)\2/g,
    `$1$2${FABRICATOR_ICONS_PACKAGE}$2`
  )
}
