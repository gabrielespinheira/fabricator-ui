"use client"

import * as React from "react"
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  FeatherIcon,
  SparklesIcon,
  WaypointsIcon,
  ZapIcon,
  type LucideIcon,
} from "lucide-react"

import { Button } from "@/styles/base-fabricator/ui/button"
import {
  ModelPicker,
  ModelPickerEffort,
  ModelPickerGroup,
  ModelPickerGroupLabel,
  ModelPickerHeader,
  ModelPickerItem,
  ModelPickerItemMeta,
  ModelPickerItemName,
  ModelPickerRoute,
  ModelPickerRoutes,
} from "@/styles/base-fabricator/ui/model-picker"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/styles/base-fabricator/ui/popover"

type Model = { id: string; label: string; context: string; fast?: boolean }
type Provider = { id: string; label: string; icon: LucideIcon; models: Model[] }

const PROVIDERS: Provider[] = [
  {
    id: "lumen",
    label: "Lumen",
    icon: SparklesIcon,
    models: [
      { id: "lumen-3", label: "Lumen 3", context: "1M" },
      {
        id: "lumen-3-mini",
        label: "Lumen 3 Mini",
        context: "200K",
        fast: true,
      },
    ],
  },
  {
    id: "quill",
    label: "Quill",
    icon: FeatherIcon,
    models: [
      { id: "quill-pro", label: "Quill Pro", context: "400K" },
      { id: "quill-flash", label: "Quill Flash", context: "128K", fast: true },
    ],
  },
]

const EFFORTS = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "max", label: "Max" },
]

export function ModelPickerDemo() {
  const [modelId, setModelId] = React.useState("lumen-3")
  const [isAuto, setAuto] = React.useState(false)
  const [effort, setEffort] = React.useState<string | null>(null)
  const [view, setView] = React.useState<"effort" | "models">("effort")
  const [isOpen, setOpen] = React.useState(false)
  const provider = PROVIDERS.find((entry) =>
    entry.models.some((model) => model.id === modelId)
  )
  const model = provider?.models.find((entry) => entry.id === modelId)
  const ProviderIcon = provider?.icon ?? SparklesIcon

  return (
    <Popover
      open={isOpen}
      onOpenChange={(open) => {
        setOpen(open)
        if (open) setView(isAuto ? "models" : "effort")
      }}
    >
      <PopoverTrigger
        render={<Button variant="ghost" aria-label="Model and effort" />}
      >
        {isAuto ? <WaypointsIcon /> : <ProviderIcon />}
        {isAuto ? "Auto" : model?.label}
        {!isAuto && effort && (
          <span className="text-muted-foreground">{effort}</span>
        )}
        <ChevronDownIcon />
      </PopoverTrigger>
      <PopoverContent align="center" className="w-80 gap-0 p-1">
        {view === "effort" && !isAuto && model ? (
          <ModelPickerEffort
            levels={EFFORTS}
            value={effort}
            onValueChange={setEffort}
          >
            <Button
              variant="ghost"
              size="sm"
              className="-ms-1.5 text-foreground"
              onClick={() => setView("models")}
            >
              <ProviderIcon />
              {model.label}
              <ChevronRightIcon />
            </Button>
          </ModelPickerEffort>
        ) : (
          <ModelPicker>
            <ModelPickerHeader>
              {!isAuto && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Back to effort"
                  onClick={() => setView("effort")}
                >
                  <ChevronLeftIcon />
                </Button>
              )}
              <span className={isAuto ? "ps-1.5" : undefined}>
                Select model
              </span>
            </ModelPickerHeader>
            <ModelPickerRoutes>
              <ModelPickerRoute
                selected={isAuto}
                caption="Picks the model and effort for each message"
                onClick={() => {
                  setAuto(true)
                  setOpen(false)
                }}
              >
                <WaypointsIcon />
                Auto
              </ModelPickerRoute>
            </ModelPickerRoutes>
            {PROVIDERS.map((entry) => (
              <ModelPickerGroup key={entry.id}>
                <ModelPickerGroupLabel>
                  <entry.icon />
                  {entry.label}
                </ModelPickerGroupLabel>
                {entry.models.map((option) => (
                  <ModelPickerItem
                    key={option.id}
                    selected={!isAuto && option.id === modelId}
                    onClick={() => {
                      setModelId(option.id)
                      setAuto(false)
                      setView("effort")
                    }}
                  >
                    <ModelPickerItemName>{option.label}</ModelPickerItemName>
                    <ModelPickerItemMeta>
                      <span title="Context window">{option.context}</span>
                      {option.fast && <ZapIcon role="img" aria-label="Fast" />}
                    </ModelPickerItemMeta>
                  </ModelPickerItem>
                ))}
              </ModelPickerGroup>
            ))}
          </ModelPicker>
        )}
      </PopoverContent>
    </Popover>
  )
}
