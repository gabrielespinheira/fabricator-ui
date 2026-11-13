"use client"

import * as React from "react"

import { Checkbox } from "@/styles/base-nova/ui/checkbox"
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldSet,
} from "@/styles/base-nova/ui/field"

const notifications = [
  { id: "mentions", label: "Mentions" },
  { id: "comments", label: "Comments" },
  { id: "invites", label: "Invites" },
]

export function CheckboxIndeterminate() {
  const [selected, setSelected] = React.useState<Set<string>>(
    new Set(["mentions"])
  )
  const isAllSelected = selected.size === notifications.length
  const isSomeSelected = selected.size > 0 && !isAllSelected

  const selectAll = (checked: boolean) =>
    setSelected(
      new Set(
        checked ? notifications.map((notification) => notification.id) : []
      )
    )

  const selectOne = (id: string, checked: boolean) => {
    const next = new Set(selected)
    if (checked) next.add(id)
    else next.delete(id)
    setSelected(next)
  }

  return (
    <FieldSet className="mx-auto w-56">
      <Field orientation="horizontal">
        <Checkbox
          id="notifications-all-checkbox"
          checked={isAllSelected}
          indeterminate={isSomeSelected}
          onCheckedChange={selectAll}
        />
        <FieldLabel htmlFor="notifications-all-checkbox">
          All notifications
        </FieldLabel>
      </Field>
      <FieldGroup className="gap-3 ps-6">
        {notifications.map((notification) => (
          <Field key={notification.id} orientation="horizontal">
            <Checkbox
              id={`notifications-${notification.id}-checkbox`}
              checked={selected.has(notification.id)}
              onCheckedChange={(checked) => selectOne(notification.id, checked)}
            />
            <FieldLabel
              htmlFor={`notifications-${notification.id}-checkbox`}
              className="font-normal"
            >
              {notification.label}
            </FieldLabel>
          </Field>
        ))}
      </FieldGroup>
    </FieldSet>
  )
}
