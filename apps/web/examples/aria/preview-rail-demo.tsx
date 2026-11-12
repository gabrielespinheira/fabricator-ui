import { PreviewRail } from "@/styles/aria-fabricator/ui/preview-rail"

const SECTIONS = [
  {
    value: "introduction",
    label: "Introduction",
    description: "What the library is and who it's for.",
    href: "#introduction",
  },
  {
    value: "installation",
    label: "Installation",
    description: "Add the CLI and set up your first project.",
    href: "#installation",
  },
  {
    value: "theming",
    label: "Theming",
    description: "Colours, radius and fonts from one look.",
    href: "#theming",
  },
  {
    value: "density",
    label: "Density",
    description: "Compact, default and spacious sizes per region.",
    href: "#density",
  },
  {
    value: "motion",
    label: "Motion",
    description: "Four speeds that retime every animation.",
    href: "#motion",
  },
  {
    value: "components",
    label: "Components",
    description: "Every control, surface and layout piece.",
    href: "#components",
  },
  {
    value: "icons",
    label: "Icons",
    description: "Outline, duotone, brand and file icons.",
    href: "#icons",
  },
  {
    value: "react-native",
    label: "React Native",
    description: "The same components on iOS and Android.",
    href: "#react-native",
  },
  {
    value: "desktop",
    label: "Desktop",
    description: "Electron and Tauri windows around your app.",
    href: "#desktop",
  },
  {
    value: "changelog",
    label: "Changelog",
    description: "What shipped in each release.",
    href: "#changelog",
  },
]

export function PreviewRailDemo() {
  return (
    <div className="flex w-full max-w-sm">
      <PreviewRail
        items={SECTIONS}
        defaultValue="components"
        aria-label="Documentation"
      />
    </div>
  )
}
