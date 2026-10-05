"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { cn } from "cn"
import { useTheme } from "next-themes"

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/styles/base-fabricator/ui/select"

/** A floating card in the docs side panel. */
export function DocsPanelCard({
  className,
  ...props
}: React.ComponentProps<"section">) {
  return (
    <section
      className={cn("flex flex-col rounded-xl bg-muted p-4", className)}
      {...props}
    />
  )
}

type Option = { value: string; label: string }

function PanelSelect({
  label,
  value,
  options,
  onValueChange,
}: {
  label: string
  value: string
  options: Option[]
  onValueChange: (value: string) => void
}) {
  const id = React.useId()

  return (
    <div className="flex h-9 items-center justify-between gap-3">
      <span id={id} className="text-[13px] text-muted-foreground">
        {label}
      </span>
      <Select
        items={options}
        value={value}
        onValueChange={(next) => {
          if (typeof next === "string") onValueChange(next)
        }}
      >
        <SelectTrigger
          aria-labelledby={id}
          size="sm"
          className="-me-2 text-[13px] ring-0 hover:bg-hover"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent align="end">
          <SelectGroup>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  )
}

function subscribeNothing() {
  return () => {}
}

const THEMES: Option[] = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
]

export function DocsPanelTheme() {
  const { theme, setTheme } = useTheme()
  // The theme is only known on the client; render "System" until hydrated.
  const mounted = React.useSyncExternalStore(
    subscribeNothing,
    () => true,
    () => false
  )

  return (
    <PanelSelect
      label="Theme"
      value={mounted ? (theme ?? "system") : "system"}
      options={THEMES}
      onValueChange={setTheme}
    />
  )
}

/** Switches the current component page to another base. */
export function DocsPanelPrimitive({
  base,
  component,
  bases,
}: {
  base: string
  component: string
  bases: Option[]
}) {
  const router = useRouter()

  return (
    <PanelSelect
      label="Primitive"
      value={base}
      options={bases}
      onValueChange={(next) =>
        router.push(`/docs/components/${next}/${component}`)
      }
    />
  )
}
