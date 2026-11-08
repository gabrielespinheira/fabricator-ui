import { ArrowUpIcon, SearchIcon } from "lucide-react"

import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
} from "@/styles/aria-nova/ui/input-group"
import { Kbd } from "@/styles/aria-nova/ui/kbd"

const densities = [
  { name: "compact", className: "density-compact" },
  { name: "default", className: undefined },
  { name: "spacious", className: "density-spacious" },
] as const

export function InputGroupSizes() {
  return (
    <div className="flex w-full max-w-sm flex-col gap-6">
      {densities.map((density) => (
        <div key={density.name} className={density.className}>
          <div className="flex flex-col gap-2">
            <InputGroup>
              <InputGroupInput
                placeholder="Search..."
                aria-label={`Search (${density.name})`}
              />
              <InputGroupAddon>
                <SearchIcon />
              </InputGroupAddon>
              <InputGroupAddon align="inline-end">
                <Kbd>⌘K</Kbd>
              </InputGroupAddon>
            </InputGroup>
            <InputGroup>
              <InputGroupInput
                placeholder="fabricator"
                aria-label={`Workspace URL (${density.name})`}
              />
              <InputGroupAddon>
                <InputGroupText>app.fabricator.dev/</InputGroupText>
              </InputGroupAddon>
              <InputGroupAddon align="inline-end">
                <InputGroupButton
                  size="icon-xs"
                  variant="default"
                  aria-label="Submit"
                >
                  <ArrowUpIcon />
                </InputGroupButton>
              </InputGroupAddon>
            </InputGroup>
          </div>
        </div>
      ))}
    </div>
  )
}
