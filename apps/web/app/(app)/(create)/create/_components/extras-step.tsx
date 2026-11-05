"use client"

import { ModelContextProtocolIcon } from "@fabricator-ui/icons/brands"

import { BookOpenIcon, BoxIcon, SparklesIcon } from "@/lib/site-icons"
import {
  Field,
  FieldContent,
  FieldGroup,
  FieldLabel,
} from "@/styles/base-fabricator/ui/field"
import { RadioGroup } from "@/styles/base-fabricator/ui/radio-group"
import { Switch } from "@/styles/base-fabricator/ui/switch"
import {
  ASSISTANTS,
  isNativeFramework,
  type SetupChoices,
} from "@/app/(app)/(create)/lib/setup"

import { ASSISTANT_ICONS } from "./assistant-icons"
import {
  CardHint,
  CheckCard,
  ChoiceCard,
  StepFooter,
  StepSection,
} from "./step-parts"

type StepProps = {
  choices: SetupChoices
  onChange: (patch: Partial<SetupChoices>) => void
  onBack: () => void
  onNext: () => void
}

function SwitchRow({
  id,
  title,
  description,
  icon,
  checked,
  onCheckedChange,
}: {
  id: string
  title: string
  description: string
  icon?: React.ReactNode
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}) {
  return (
    <FieldLabel htmlFor={id}>
      <Field orientation="horizontal">
        {icon ? (
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted [&_svg]:size-4.5">
            {icon}
          </span>
        ) : null}
        <FieldContent>
          <span className="text-[13px] font-medium">{title}</span>
          <CardHint>{description}</CardHint>
        </FieldContent>
        <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
      </Field>
    </FieldLabel>
  )
}

export function ExtrasControls({
  choices,
  onChange,
  onBack,
  onNext,
}: StepProps) {
  const isNativeOnly =
    choices.project === "new" && isNativeFramework(choices.framework)
  const hasAssistants = choices.assistants.length > 0

  return (
    <FieldGroup className="gap-8">
      <StepSection title="Components">
        <RadioGroup
          value={choices.components}
          onValueChange={(value) => {
            if (value === "starter" || value === "all") {
              onChange({ components: value })
            }
          }}
          className="grid gap-3"
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
          description={
            isNativeOnly
              ? "Soft clicks and ticks on buttons, switches and menus, each with a light tap on a real device."
              : `Soft clicks and ticks on buttons, switches and menus, like the ones on this site. Synthesised in the browser, no audio files.${choices.mobile ? " The mobile app plays them too, with a light tap for each." : ""}`
          }
          checked={choices.sound}
          onCheckedChange={(sound) => onChange({ sound })}
        />
      </StepSection>

      <StepSection
        title="AI assistants"
        description="Pick every assistant you use. Each learns Fabricator UI and can install components for you."
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
          {ASSISTANTS.map((assistant) => {
            const Icon = ASSISTANT_ICONS[assistant.value]
            return (
              <CheckCard
                key={assistant.value}
                title={assistant.label}
                icon={<Icon />}
                checked={choices.assistants.includes(assistant.value)}
                onCheckedChange={(checked) =>
                  onChange({
                    assistants: checked
                      ? [...choices.assistants, assistant.value]
                      : choices.assistants.filter(
                          (value) => value !== assistant.value
                        ),
                  })
                }
              />
            )
          })}
        </div>
        {hasAssistants ? (
          <div className="flex flex-col gap-3">
            <SwitchRow
              id="skill"
              title="Agent skill"
              description="Teaches them the components, their composition rules and the CLI."
              icon={<BookOpenIcon />}
              checked={choices.skill}
              onCheckedChange={(skill) => onChange({ skill })}
            />
            <SwitchRow
              id="mcp"
              title="MCP server"
              description="Lets them search the registry and install components."
              icon={<ModelContextProtocolIcon />}
              checked={choices.mcp}
              onCheckedChange={(mcp) => onChange({ mcp })}
            />
          </div>
        ) : null}
      </StepSection>

      <StepFooter
        onBack={onBack}
        onNext={onNext}
        nextLabel="Review and install"
      />
    </FieldGroup>
  )
}
