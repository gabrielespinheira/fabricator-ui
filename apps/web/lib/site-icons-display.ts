// The site's Fabricator preview copies import icons from "@/lib/site-icons" so
// they follow the icon pack picked in the site settings (scripts/build-icons.ts).
// Readers and the CLI get "lucide-react": apply this wherever source is shown,
// copied or exported.
export function restoreLucideImports(code: string) {
  return code.replace(
    /(\bfrom\s*)(["'])@\/lib\/site-icons\2/g,
    "$1$2lucide-react$2"
  )
}
