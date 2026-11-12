"use client"

import * as React from "react"

import { Button } from "@/styles/radix-fabricator/ui/button"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/styles/radix-fabricator/ui/field"
import { Rating } from "@/styles/radix-fabricator/ui/rating"

export function RatingField() {
  const [value, setValue] = React.useState(0)
  const [isInvalid, setIsInvalid] = React.useState(false)
  return (
    <form
      className="flex w-full max-w-xs flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault()
        setIsInvalid(value === 0)
      }}
    >
      <Field data-invalid={isInvalid}>
        <FieldLabel id="rating-field-label">Rate your stay</FieldLabel>
        <Rating
          name="stay"
          value={value}
          onValueChange={(next) => {
            setValue(next)
            setIsInvalid(false)
          }}
          step={0.5}
          aria-labelledby="rating-field-label"
          aria-describedby={
            isInvalid ? "rating-field-error" : "rating-field-description"
          }
          aria-invalid={isInvalid || undefined}
        />
        {isInvalid ? (
          <FieldError id="rating-field-error">
            Pick at least half a star to post.
          </FieldError>
        ) : (
          <FieldDescription id="rating-field-description">
            Half stars count. Your review shows your name.
          </FieldDescription>
        )}
      </Field>
      <Button type="submit" className="self-start">
        Post review
      </Button>
    </form>
  )
}
