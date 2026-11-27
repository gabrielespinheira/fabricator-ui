"use client"

import * as React from "react"

import {
  PasswordStrength,
  PasswordToggle,
} from "@/styles/base-fabricator/ui/password-strength"
import { Field, FieldLabel } from "@/styles/base-nova/ui/field"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/styles/base-nova/ui/input-group"

export function PasswordStrengthDemo() {
  const [password, setPassword] = React.useState("")
  const [isVisible, setIsVisible] = React.useState(false)
  return (
    <Field className="w-full max-w-xs">
      <FieldLabel htmlFor="new-password">New password</FieldLabel>
      <InputGroup>
        <InputGroupInput
          id="new-password"
          type={isVisible ? "text" : "password"}
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        <InputGroupAddon align="inline-end">
          <PasswordToggle visible={isVisible} onVisibleChange={setIsVisible} />
        </InputGroupAddon>
      </InputGroup>
      <PasswordStrength value={password} />
    </Field>
  )
}
