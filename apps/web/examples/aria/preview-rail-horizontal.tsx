import { PreviewRail } from "@/styles/aria-fabricator/ui/preview-rail"

const MONTHS = [
  {
    value: "jan",
    label: "January",
    description: "Planning and the new roadmap.",
  },
  { value: "feb", label: "February", description: "Design system audit." },
  { value: "mar", label: "March", description: "React Native beta." },
  { value: "apr", label: "April", description: "Icons expansion." },
  { value: "may", label: "May", description: "Density and motion speeds." },
  { value: "jun", label: "June", description: "Desktop windows." },
  { value: "jul", label: "July", description: "Chat components." },
  { value: "aug", label: "August", description: "Editor preview." },
  { value: "sep", label: "September", description: "Accessibility pass." },
  { value: "oct", label: "October", description: "Version 1.0 candidate." },
  { value: "nov", label: "November", description: "Launch week." },
  { value: "dec", label: "December", description: "Retrospective." },
]

export function PreviewRailHorizontal() {
  return (
    <div className="flex w-full justify-center pt-24">
      <PreviewRail
        items={MONTHS}
        orientation="horizontal"
        defaultValue="nov"
        aria-label="Months"
      />
    </div>
  )
}
