"use client"

import * as React from "react"

import {
  ASSISTANT_EFFORTS,
  ASSISTANT_PROVIDERS,
  findAssistantModel,
} from "@/registry/bases/__base__/blocks/assistant-01/lib/assistant-models"
import { Button } from "@/registry/bases/__base__/ui/button"
import { ChatInputButton } from "@/registry/bases/__base__/ui/chat-input"
import {
  ModelPicker,
  ModelPickerEffort,
  ModelPickerGroup,
  ModelPickerGroupLabel,
  ModelPickerHeader,
  ModelPickerItem,
  ModelPickerItemMeta,
  ModelPickerItemName,
} from "@/registry/bases/__base__/ui/model-picker"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/registry/bases/__base__/ui/popover"
import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

// The model beside send: its effort first, then every model by provider.
// Popovers open from their trigger differently in each base, so this file
// has a copy per base.

export function AssistantModelPicker({
  modelId,
  onModelChange,
  effort,
  onEffortChange,
}: {
  modelId: string
  onModelChange: (modelId: string) => void
  effort: string | null
  onEffortChange: (effort: string) => void
}) {
  const [isOpen, setOpen] = React.useState(false)
  const [view, setView] = React.useState<"effort" | "models">("effort")
  const { provider, model } = findAssistantModel(modelId)
  const ProviderIcon = provider.icon

  return (
    <Popover
      open={isOpen}
      onOpenChange={(open) => {
        setOpen(open)
        if (open) setView("effort")
      }}
    >
      <PopoverTrigger
        render={
          <ChatInputButton
            aria-label={`Model: ${model.label}${effort ? `, ${effort} effort` : ""}`}
          />
        }
      >
        <ProviderIcon color="brand" />
        <span className="text-foreground @max-md/chat-input:hidden">
          {model.short}
        </span>
        {effort && (
          <span className="text-(length:--density-text-12) text-muted-foreground @max-md/chat-input:hidden">
            {effort}
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="end"
        sideOffset={10}
        className="w-80 gap-0 bg-surface-5 p-1 shadow-surface-5"
      >
        {view === "effort" ? (
          <ModelPickerEffort
            levels={ASSISTANT_EFFORTS}
            value={effort}
            onValueChange={onEffortChange}
          >
            <Button
              variant="ghost"
              size="sm"
              className="-ms-1.5 text-foreground"
              onClick={() => setView("models")}
            >
              <ProviderIcon color="brand" />
              {model.label}
              <IconPlaceholder
                lucide="ChevronRightIcon"
                tabler="IconChevronRight"
                hugeicons="ArrowRight01Icon"
                phosphor="CaretRightIcon"
                remixicon="RiArrowRightSLine"
              />
            </Button>
          </ModelPickerEffort>
        ) : (
          <ModelPicker className="max-h-80">
            <ModelPickerHeader>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Back to effort"
                onClick={() => setView("effort")}
              >
                <IconPlaceholder
                  lucide="ChevronLeftIcon"
                  tabler="IconChevronLeft"
                  hugeicons="ArrowLeft01Icon"
                  phosphor="CaretLeftIcon"
                  remixicon="RiArrowLeftSLine"
                />
              </Button>
              Select model
            </ModelPickerHeader>
            {ASSISTANT_PROVIDERS.map((entry) => (
              <ModelPickerGroup key={entry.id}>
                <ModelPickerGroupLabel>
                  <entry.icon color="brand" />
                  {entry.label}
                </ModelPickerGroupLabel>
                {entry.models.map((option) => (
                  <ModelPickerItem
                    key={option.id}
                    selected={option.id === modelId}
                    onClick={() => {
                      onModelChange(option.id)
                      setView("effort")
                    }}
                  >
                    <ModelPickerItemName>{option.label}</ModelPickerItemName>
                    <ModelPickerItemMeta>
                      <span title="Context window">{option.context}</span>
                      {option.isFast && (
                        <IconPlaceholder
                          lucide="ZapIcon"
                          tabler="IconBolt"
                          hugeicons="FlashIcon"
                          phosphor="LightningIcon"
                          remixicon="RiFlashlightLine"
                          role="img"
                          aria-label="Fast"
                        />
                      )}
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
