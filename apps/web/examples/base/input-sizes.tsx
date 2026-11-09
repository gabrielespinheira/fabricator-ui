import { Button } from "@/styles/base-nova/ui/button"
import { Field, FieldLabel } from "@/styles/base-nova/ui/field"
import { Input } from "@/styles/base-nova/ui/input"

const densities = [
  { name: "compact", label: "Compact", className: "density-compact" },
  { name: "default", label: "Default", className: undefined },
  { name: "spacious", label: "Spacious", className: "density-spacious" },
] as const

export function InputSizes() {
  return (
    <div className="flex w-full max-w-sm flex-col gap-6">
      {densities.map((density) => (
        <Field key={density.name} className={density.className}>
          <FieldLabel htmlFor={`input-size-${density.name}`}>
            {density.label}
          </FieldLabel>
          <div className="flex gap-2">
            <Input
              id={`input-size-${density.name}`}
              placeholder="jordan@fabricator.dev"
            />
            <Button variant="outline">Invite</Button>
          </div>
        </Field>
      ))}
    </div>
  )
}
