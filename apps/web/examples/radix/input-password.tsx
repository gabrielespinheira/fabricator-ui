"use client"

import * as React from "react"
import { EyeIcon, EyeOffIcon } from "lucide-react"

import { Field, FieldLabel } from "@/styles/radix-nova/ui/field"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/styles/radix-nova/ui/input-group"

export function InputPassword() {
  const [isVisible, setIsVisible] = React.useState(false)

  return (
    <Field>
      <FieldLabel htmlFor="input-password">Password</FieldLabel>
      <InputGroup>
        <InputGroupInput
          id="input-password"
          type={isVisible ? "text" : "password"}
          autoComplete="current-password"
          placeholder="Enter your password"
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
