"use client"

import { BotIcon, BoxIcon, SparklesIcon } from "@/lib/site-icons"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/styles/base-fabricator/ui/field"
import { RadioGroup } from "@/styles/base-fabricator/ui/radio-group"
import { Switch } from "@/styles/base-fabricator/ui/switch"
import {
  ASSISTANTS,
  type Assistant,
  type SetupChoices,
} from "@/app/(app)/(create)/lib/setup"

import { ChoiceCard, StepFooter, StepSection } from "./step-parts"

type StepProps = {
  choices: SetupChoices
  onChange: (patch: Partial<SetupChoices>) => void
  onBack: () => void
  onNext: () => void
}

const ASSISTANT_VALUES: Assistant[] = [
  ...ASSISTANTS.map(({ value }) => value),
  "none",
]

function SwitchRow({
  id,
  title,
  description,
  checked,
  onCheckedChange,
}: {
  id: string
  title: string
  description: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}) {
  return (
    <FieldLabel htmlFor={id}>
      <Field orientation="horizontal">
        <FieldContent>
          <span className="text-[13px] font-medium">{title}</span>
          <FieldDescription>{description}</FieldDescription>
        </FieldContent>
        <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
      </Field>
    </FieldLabel>
  )
}

export function ExtrasStep({ choices, onChange, onBack, onNext }: StepProps) {
  const assistant = ASSISTANTS.find(({ value }) => value === choices.assistant)

  return (
    <FieldGroup className="w-full max-w-2xl gap-10">
      <StepSection title="Components">
        <RadioGroup
          value={choices.components}
          onValueChange={(value) => {
            if (value === "starter" || value === "all") {
              onChange({ components: value })
            }
          }}
          className="grid gap-3 sm:grid-cols-2"
        >
          <ChoiceCard
            value="starter"
            title="Start small"
            description="Add components as you need them, one command each."
            icon={<BoxIcon />}
          />
          <ChoiceCard
            value="all"
            title="Everything"
            description="Copy every component in now, ready to use."
            icon={<SparklesIcon />}
          />
        </RadioGroup>
      </StepSection>

      <StepSection title="Sound">
        <SwitchRow
          id="sound"
          title="Interface sounds"
          description="Soft clicks and ticks on buttons, switches and menus, like the ones on this site. Synthesised in the browser, no audio files."
          checked={choices.sound}
          onCheckedChange={(sound) => onChange({ sound })}
        />
      </StepSection>

      <StepSection
        title="AI assistant"
        description="Building with an AI assistant? It can learn Fabricator UI and install components for you."
      >
        <RadioGroup
          value={choices.assistant}
          onValueChange={(value) => {
            const next = ASSISTANT_VALUES.find((item) => item === value)
            if (next) onChange({ assistant: next })
          }}
          className="grid gap-3 sm:grid-cols-3"
        >
          {ASSISTANTS.map((item) => (
            <ChoiceCard
              key={item.value}
              value={item.value}
              title={item.label}
              icon={<BotIcon />}
            />
          ))}
          <ChoiceCard value="none" title="None" />
        </RadioGroup>
        {assistant ? (
          <div className="flex flex-col gap-3">
            <SwitchRow
              id="skill"
              title="Agent skill"
              description={`Teaches ${assistant.label} the components, their composition rules and the CLI.`}
              checked={choices.skill}
              onCheckedChange={(skill) => onChange({ skill })}
            />
            <SwitchRow
              id="mcp"
              title="MCP server"
              description={`Lets ${assistant.label} search the registry and install components.`}
              checked={choices.mcp}
              onCheckedChange={(mcp) => onChange({ mcp })}
            />
          </div>
        ) : null}
      </StepSection>

      <StepFooter onBack={onBack} onNext={onNext} nextLabel="Get my command" />
    </FieldGroup>
  )
}
