"use client"

import * as React from "react"

import { Button } from "@/registry/bases/__base__/ui/button"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/registry/bases/__base__/ui/field"
import { Textarea } from "@/registry/bases/__base__/ui/textarea"

/** A reply under the thread: who it goes to, the message, Send and Discard. */
export function MailReplyBox({
  label,
  recipients,
  onSend,
  onDiscard,
}: {
  /** "Reply" or "Reply all". */
  label: string
  recipients: string
  onSend: (body: string) => void
  onDiscard: () => void
}) {
  const [body, setBody] = React.useState("")
  const [error, setError] = React.useState<string>()
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)

  // The box opens from Reply, so the cursor goes where the writing starts.
  React.useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  return (
    <form
      noValidate
      className="flex flex-col gap-(--density-12)"
      onSubmit={(event) => {
        event.preventDefault()
        if (!body.trim()) {
          setError("Write a message before sending.")
          textareaRef.current?.focus()
          return
        }
        onSend(body.trim())
      }}
    >
      <Field data-invalid={error ? true : undefined}>
        <FieldLabel htmlFor="mail-reply">{label}</FieldLabel>
        <FieldDescription id="mail-reply-recipients">
          To {recipients}
        </FieldDescription>
        <Textarea
          ref={textareaRef}
          id="mail-reply"
          rows={6}
          value={body}
          aria-invalid={error ? true : undefined}
          aria-describedby={
            error
              ? "mail-reply-recipients mail-reply-error"
              : "mail-reply-recipients"
          }
          onChange={(event) => {
            setBody(event.target.value)
            if (error) setError(undefined)
          }}
          onKeyDown={(event) => {
            // ⌘↵ or Ctrl+↵ sends, as in most mail apps.
            if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
              event.preventDefault()
              event.currentTarget.form?.requestSubmit()
            }
          }}
          className="min-h-32"
        />
        <FieldError id="mail-reply-error">{error}</FieldError>
      </Field>
      <div className="flex items-center justify-end gap-(--density-8)">
        <Button type="button" variant="ghost" size="sm" onClick={onDiscard}>
          Discard
        </Button>
        <Button type="submit" size="sm">
          Send
        </Button>
      </div>
    </form>
  )
}
