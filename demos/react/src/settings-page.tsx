import { useTheme } from "next-themes"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/styles/base-fabricator/ui/card"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/styles/base-fabricator/ui/field"
import { Switch } from "@/styles/base-fabricator/ui/switch"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/styles/base-fabricator/ui/toggle-group"

import { settingsSchema, type Settings } from "./settings"

function SettingsPage({
  settings,
  onChange,
}: {
  settings: Settings
  onChange: (settings: Settings) => void
}) {
  const { theme, setTheme } = useTheme()
  return (
    <Card>
      <CardHeader>
        <CardTitle>Make it yours</CardTitle>
        <CardDescription>
          The same Fabricator tokens, motion and density as the website.
          Settings persist across launches.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <FieldGroup>
          <Field>
            <FieldLabel>Appearance</FieldLabel>
            <ToggleGroup
              aria-label="Appearance"
              value={[theme ?? "system"]}
              onValueChange={(values) => {
                const next = values[0]
                if (next) setTheme(next)
              }}
            >
              <ToggleGroupItem value="light">Light</ToggleGroupItem>
              <ToggleGroupItem value="dark">Dark</ToggleGroupItem>
              <ToggleGroupItem value="system">System</ToggleGroupItem>
            </ToggleGroup>
          </Field>
          <Field>
            <FieldLabel>Density</FieldLabel>
            <ToggleGroup
              aria-label="Density"
              value={[settings.density]}
              onValueChange={(values) => {
                const next = settingsSchema.shape.density.safeParse(values[0])
                if (next.success) onChange({ ...settings, density: next.data })
              }}
            >
              <ToggleGroupItem value="auto">Auto</ToggleGroupItem>
              <ToggleGroupItem value="compact">Compact</ToggleGroupItem>
              <ToggleGroupItem value="default">Default</ToggleGroupItem>
              <ToggleGroupItem value="spacious">Spacious</ToggleGroupItem>
            </ToggleGroup>
            <FieldDescription>
              Spacious uses 44px primary controls for touch.
            </FieldDescription>
          </Field>
          <Field>
            <FieldLabel>Motion</FieldLabel>
            <ToggleGroup
              aria-label="Motion"
              className="flex-wrap"
              value={[settings.motion]}
              onValueChange={(values) => {
                const next = settingsSchema.shape.motion.safeParse(values[0])
                if (next.success) onChange({ ...settings, motion: next.data })
              }}
            >
              {settingsSchema.shape.motion.options.map((motion) => (
                <ToggleGroupItem value={motion} key={motion}>
                  {motion.charAt(0).toUpperCase() + motion.slice(1)}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
            <FieldDescription>
              System reduced motion is always respected.
            </FieldDescription>
          </Field>
          <Field>
            <FieldLabel>Shape</FieldLabel>
            <ToggleGroup
              aria-label="Shape"
              value={[settings.radius]}
              onValueChange={(values) => {
                const next = settingsSchema.shape.radius.safeParse(values[0])
                if (next.success) onChange({ ...settings, radius: next.data })
              }}
            >
              <ToggleGroupItem value="rounded">Rounded</ToggleGroupItem>
              <ToggleGroupItem value="squircle">Squircle</ToggleGroupItem>
              <ToggleGroupItem value="pill">Pill</ToggleGroupItem>
            </ToggleGroup>
          </Field>
          <Field>
            <FieldLabel>Surface</FieldLabel>
            <ToggleGroup
              aria-label="Surface"
              value={[settings.surface]}
              onValueChange={(values) => {
                const next = settingsSchema.shape.surface.safeParse(values[0])
                if (next.success) onChange({ ...settings, surface: next.data })
              }}
            >
              <ToggleGroupItem value="neutral">Neutral</ToggleGroupItem>
              <ToggleGroupItem value="slate">Slate</ToggleGroupItem>
              <ToggleGroupItem value="stone">Stone</ToggleGroupItem>
            </ToggleGroup>
          </Field>
          <Field orientation="horizontal">
            <Switch
              id="interface-sounds"
              checked={settings.sounds}
              onCheckedChange={(sounds) => onChange({ ...settings, sounds })}
            />
            <FieldLabel htmlFor="interface-sounds">Interface sounds</FieldLabel>
          </Field>
        </FieldGroup>
      </CardContent>
    </Card>
  )
}

export { SettingsPage }
