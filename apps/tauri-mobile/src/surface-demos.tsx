import { useState } from "react"
import { toast } from "sonner"
import { z } from "zod"

import { playSound } from "@/styles/base-fabricator/lib/sounds"
import { Button } from "@/styles/base-fabricator/ui/button"
import { DensityProvider } from "@/styles/base-fabricator/ui/density"
import { DirectionProvider } from "@/styles/base-fabricator/ui/direction"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/styles/base-fabricator/ui/field"
import { Input } from "@/styles/base-fabricator/ui/input"
import { TimeWheel } from "@/styles/base-fabricator/ui/time-wheel"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/styles/base-fabricator/ui/toggle-group"

function DensityDemo() {
  return (
    <div className="flex flex-col gap-6">
      {(["compact", "default", "spacious"] as const).map((density) => (
        <DensityProvider
          key={density}
          density={density}
          className="flex flex-wrap items-center gap-3"
        >
          <Button>{density}</Button>
          <Input
            aria-label={`${density} density`}
            placeholder="Try typing here"
            className="max-w-56"
          />
        </DensityProvider>
      ))}
    </div>
  )
}

function DirectionDemo() {
  return (
    <DirectionProvider direction="ltr">
      <div dir="ltr" className="flex flex-col gap-4">
        <p>
          DirectionProvider supplies left-to-right direction to every Fabricator
          primitive.
        </p>
        <Button>Continue</Button>
      </div>
    </DirectionProvider>
  )
}

function RootDemo() {
  return (
    <div className="flex flex-col gap-4">
      <p>
        The web renderer uses ThemeProvider and DensityProvider at the app root.
        Every component on this screen inherits them, including portalled
        overlays.
      </p>
      <DensityDemo />
    </div>
  )
}

const nameSchema = z.string().trim().min(2, "Enter at least two characters.")

function FormDemo() {
  const [name, setName] = useState("")
  const [error, setError] = useState<string>()
  const [submitted, setSubmitted] = useState(false)
  return (
    <form
      className="w-full max-w-sm"
      onSubmit={(event) => {
        event.preventDefault()
        const result = nameSchema.safeParse(name)
        setError(result.success ? undefined : result.error.issues[0]?.message)
        setSubmitted(result.success)
      }}
      noValidate
    >
      <FieldGroup>
        <Field data-invalid={Boolean(error)}>
          <FieldLabel htmlFor="profile-name">Display name</FieldLabel>
          <Input
            id="profile-name"
            value={name}
            onChange={(event) => {
              setName(event.target.value)
              setSubmitted(false)
            }}
            aria-invalid={Boolean(error)}
            aria-describedby={
              error ? "profile-name-error" : "profile-name-description"
            }
            autoComplete="name"
          />
          <FieldDescription id="profile-name-description">
            Used on your profile and workspace.
          </FieldDescription>
          {error && <FieldError id="profile-name-error">{error}</FieldError>}
        </Field>
        <Button type="submit">Save profile</Button>
        {submitted && <p role="status">Profile saved for {name.trim()}.</p>}
      </FieldGroup>
    </form>
  )
}

function SonnerDemo() {
  return (
    <div className="flex flex-wrap gap-3">
      <Button
        onClick={() =>
          toast.success("Changes saved", {
            description: "Your workspace is up to date.",
          })
        }
      >
        Show toast
      </Button>
      <Button
        variant="outline"
        onClick={() =>
          toast.error("Upload failed", {
            description: "Choose a file and try again.",
          })
        }
      >
        Error toast
      </Button>
    </div>
  )
}

function SoundsDemo() {
  return (
    <div className="flex flex-wrap gap-3">
      <Button onClick={() => playSound("press")}>Button sound</Button>
      <Button variant="outline" onClick={() => playSound("success")}>
        Success sound
      </Button>
      <p className="w-full text-muted-foreground">
        Synthesized locally with Fabricator’s shared sound recipes. Audio
        follows a user gesture.
      </p>
    </div>
  )
}

function TextDemo() {
  return (
    <article className="flex max-w-prose flex-col gap-4">
      <h2 className="text-2xl font-semibold tracking-tight">
        Text that belongs everywhere.
      </h2>
      <p>
        Native Text maps to semantic HTML in the web renderer. Paragraphs,
        headings, links and selections keep browser accessibility and platform
        text input.
      </p>
      <p className="text-muted-foreground">
        Select this text, change the app’s density, or increase your device’s
        text size.
      </p>
      <Button render={<a href="#/components/typography" />}>
        Explore typography
      </Button>
    </article>
  )
}

function TimeWheelDemo() {
  const [value, setValue] = useState("09:30")
  const [cycle, setCycle] = useState("24")
  return (
    <div className="flex flex-col items-start gap-4">
      <ToggleGroup
        value={[cycle]}
        onValueChange={(values) => {
          const next = values[0]
          if (next) setCycle(next)
        }}
      >
        <ToggleGroupItem value="12">12 hour</ToggleGroupItem>
        <ToggleGroupItem value="24">24 hour</ToggleGroupItem>
      </ToggleGroup>
      <TimeWheel
        value={value}
        onValueChange={setValue}
        hourCycle={cycle === "12" ? 12 : 24}
        step={5}
      />
      <output aria-live="polite">Selected time: {value}</output>
    </div>
  )
}

export const surfaceDemos = {
  density: DensityDemo,
  direction: DirectionDemo,
  "fabricator-root": RootDemo,
  form: FormDemo,
  sonner: SonnerDemo,
  sounds: SoundsDemo,
  text: TextDemo,
  "time-wheel": TimeWheelDemo,
}
