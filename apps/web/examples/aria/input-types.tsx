"use client"

import * as React from "react"
import { EyeIcon, EyeOffIcon, PaperclipIcon, SearchIcon } from "lucide-react"

import { ColorPickerPopover } from "@/styles/aria-fabricator/ui/color-picker"
import { DatePicker } from "@/styles/aria-fabricator/ui/date-picker"
import {
  FileUpload,
  FileUploadTrigger,
} from "@/styles/aria-fabricator/ui/file-upload"
import { MonthInput } from "@/styles/aria-fabricator/ui/month-input"
import {
  NumberField,
  NumberFieldDecrement,
  NumberFieldGroup,
  NumberFieldIncrement,
  NumberFieldInput,
} from "@/styles/aria-fabricator/ui/number-field"
import { TimeInput } from "@/styles/aria-fabricator/ui/time-input"
import { Field, FieldGroup, FieldLabel } from "@/styles/aria-nova/ui/field"
import { Input } from "@/styles/aria-nova/ui/input"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/styles/aria-nova/ui/input-group"

function PasswordField() {
  const [isVisible, setIsVisible] = React.useState(false)

  return (
    <Field>
      <FieldLabel htmlFor="input-type-password">Password</FieldLabel>
      <InputGroup>
        <InputGroupInput
          id="input-type-password"
          type={isVisible ? "text" : "password"}
          autoComplete="new-password"
          placeholder="Enter a password"
        />
        <InputGroupAddon align="inline-end">
          <InputGroupButton
            size="icon-xs"
            aria-label={isVisible ? "Hide password" : "Show password"}
            aria-pressed={isVisible}
            onClick={() => setIsVisible(!isVisible)}
          >
            {isVisible ? <EyeOffIcon /> : <EyeIcon />}
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
    </Field>
  )
}

function FileField() {
  const [files, setFiles] = React.useState<File[]>([])
  const names = files.map((file) => file.name).join(", ")

  return (
    <Field>
      <FieldLabel>File</FieldLabel>
      <FileUpload value={files} onValueChange={setFiles}>
        <div className="flex min-w-0 items-center gap-3">
          <FileUploadTrigger>
            <PaperclipIcon data-icon="inline-start" />
            Choose file
          </FileUploadTrigger>
          <span className="truncate text-sm text-muted-foreground">
            {names || "No file chosen"}
          </span>
        </div>
      </FileUpload>
    </Field>
  )
}

export function InputTypes() {
  return (
    <FieldGroup className="grid w-full max-w-xl gap-x-4 gap-y-5 sm:grid-cols-2">
      <Field>
        <FieldLabel htmlFor="input-type-text">Text</FieldLabel>
        <Input id="input-type-text" placeholder="Jordan Lee" />
      </Field>
      <Field>
        <FieldLabel htmlFor="input-type-email">Email</FieldLabel>
        <Input
          id="input-type-email"
          type="email"
          placeholder="jordan@fabricator.dev"
        />
      </Field>
      <PasswordField />
      <Field>
        <FieldLabel htmlFor="input-type-number">Number</FieldLabel>
        <NumberField id="input-type-number" defaultValue={42} minValue={0}>
          <NumberFieldGroup>
            <NumberFieldDecrement />
            <NumberFieldInput />
            <NumberFieldIncrement />
          </NumberFieldGroup>
        </NumberField>
      </Field>
      <Field>
        <FieldLabel htmlFor="input-type-tel">Phone</FieldLabel>
        <Input id="input-type-tel" type="tel" placeholder="+1 555 0100" />
      </Field>
      <Field>
        <FieldLabel htmlFor="input-type-url">URL</FieldLabel>
        <Input
          id="input-type-url"
          type="url"
          placeholder="https://fabricator.dev"
        />
      </Field>
      <Field>
        <FieldLabel htmlFor="input-type-search">Search</FieldLabel>
        <InputGroup>
          <InputGroupInput
            id="input-type-search"
            type="search"
            placeholder="Search..."
          />
          <InputGroupAddon>
            <SearchIcon />
          </InputGroupAddon>
        </InputGroup>
      </Field>
      <Field>
        <FieldLabel htmlFor="input-type-date">Date</FieldLabel>
        <DatePicker id="input-type-date" placeholder="Nov 12, 2026" />
      </Field>
      <Field>
        <FieldLabel htmlFor="input-type-time">Time</FieldLabel>
        <TimeInput id="input-type-time" placeholder="9:30 AM" />
      </Field>
      <Field>
        <FieldLabel htmlFor="input-type-date-time">Date and time</FieldLabel>
        <div className="flex gap-2">
          <DatePicker
            id="input-type-date-time"
            placeholder="Date"
            className="flex-1"
          />
          <TimeInput aria-label="Time" placeholder="Time" className="w-32" />
        </div>
      </Field>
      <Field>
        <FieldLabel htmlFor="input-type-month">Month</FieldLabel>
        <MonthInput id="input-type-month" placeholder="Nov 2026" />
      </Field>
      <Field>
        <FieldLabel>Color</FieldLabel>
        <div>
          <ColorPickerPopover defaultValue="#6b97ff" />
        </div>
      </Field>
      <FileField />
    </FieldGroup>
  )
}
