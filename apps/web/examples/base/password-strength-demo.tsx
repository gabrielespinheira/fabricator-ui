"use client"

import * as React from "react"

import { PasswordStrength } from "@/styles/base-fabricator/ui/password-strength"
import { Field, FieldLabel } from "@/styles/base-nova/ui/field"
import { Input } from "@/styles/base-nova/ui/input"

export function PasswordStrengthDemo() {
  const [password, setPassword] = React.useState("")
  return (
    <Field className="w-full max-w-xs">
      <FieldLabel htmlFor="new-password">New password</FieldLabel>
      <Input
        id="new-password"
        type="password"
        autoComplete="new-password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
      />
      <PasswordStrength value={password} />
    </Field>
  )
}
