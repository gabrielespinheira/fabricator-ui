"use client"

import * as React from "react"

import { boardIcons } from "@/registry/bases/__base__/blocks/board-01/components/board-icons"
import { BOARD_PEOPLE } from "@/registry/bases/__base__/blocks/board-01/lib/board-data"
import {
  describeChange,
  formatTicketTime,
  type BoardActivity,
} from "@/registry/bases/__base__/blocks/board-01/lib/board-model"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from "@/registry/bases/__base__/ui/input-group"
import {
  PropertyAvatar,
  type PropertyDefinition,
} from "@/registry/bases/__base__/ui/properties"
import { RecordViewSection } from "@/registry/bases/__base__/ui/record-view"

function getPerson(id: string) {
  return (
    BOARD_PEOPLE.find(({ value }) => value === id) ?? {
      value: id,
      label: "Someone",
    }
  )
}

function describe(
  entry: Exclude<BoardActivity, { kind: "comment" }>,
  properties: readonly PropertyDefinition[]
) {
  return entry.kind === "created"
    ? "created this ticket"
    : describeChange(entry, properties)
}

/** What was said and what changed, oldest first. */
export function BoardActivityList({
  activity,
  properties,
  now,
}: {
  activity: readonly BoardActivity[]
  properties: readonly PropertyDefinition[]
  now: number
}) {
  return (
    <RecordViewSection title="Activity">
      <ol className="flex flex-col gap-(--density-16)">
        {activity.map((entry) => {
          const person = getPerson(entry.personId)
          const time = (
            <time
              dateTime={new Date(entry.at).toISOString()}
              className="text-(length:--density-text-12) whitespace-nowrap text-muted-foreground"
            >
              {formatTicketTime(entry.at, now)}
            </time>
          )
          return (
            <li key={entry.id} className="flex gap-(--density-10)">
              <PropertyAvatar
                person={person}
                className="size-(--density-24) shrink-0"
              />
              {entry.kind === "comment" ? (
                <div className="flex min-w-0 flex-1 flex-col gap-(--density-4) pt-0.5">
                  <p className="flex items-baseline gap-(--density-8)">
                    <span className="truncate font-medium">{person.label}</span>
                    {time}
                  </p>
                  <p className="leading-normal wrap-break-word whitespace-pre-wrap">
                    {entry.text}
                  </p>
                </div>
              ) : (
                <p className="min-w-0 flex-1 pt-0.5 leading-normal text-muted-foreground">
                  <span className="text-foreground">{person.label}</span>{" "}
                  {describe(entry, properties)} {time}
                </p>
              )}
            </li>
          )
        })}
      </ol>
    </RecordViewSection>
  )
}

/** A comment, sent with Enter. */
export function BoardCommentForm({
  onComment,
}: {
  onComment: (text: string) => void
}) {
  const [text, setText] = React.useState("")
  function send() {
    if (!text.trim()) return
    onComment(text.trim())
    setText("")
  }
  return (
    <form
      className="flex-1"
      onSubmit={(event) => {
        event.preventDefault()
        send()
      }}
    >
      <InputGroup>
        <InputGroupTextarea
          aria-label="Comment"
          placeholder="Leave a comment"
          rows={1}
          className="field-sizing-content max-h-40 min-h-0"
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (
              event.key !== "Enter" ||
              event.shiftKey ||
              event.nativeEvent.isComposing
            )
              return
            event.preventDefault()
            send()
          }}
        />
        <InputGroupAddon align="inline-end" className="self-end">
          <InputGroupButton
            type="submit"
            size="icon-xs"
            variant={text.trim() ? "default" : "ghost"}
            aria-label="Send comment"
          >
            {boardIcons.send}
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
    </form>
  )
}
