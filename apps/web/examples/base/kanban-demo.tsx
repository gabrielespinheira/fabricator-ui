"use client"

import * as React from "react"
import { MessageSquareIcon, PlusIcon, RocketIcon } from "@fabricator-ui/icons"

import { Button } from "@/styles/base-fabricator/ui/button"
import { Checkbox } from "@/styles/base-fabricator/ui/checkbox"
import {
  Kanban,
  KanbanBoard,
  KanbanToolbar,
  type KanbanColumnDefinition,
} from "@/styles/base-fabricator/ui/kanban"
import {
  getPropertyCover,
  getPropertyDefaults,
  PropertyAdd,
  PropertyIconProvider,
  PropertyList,
  PropertyMark,
  type PropertyDefinition,
  type PropertyFile,
} from "@/styles/base-fabricator/ui/properties"
import {
  RecordView,
  RecordViewCover,
  RecordViewSection,
  type RecordViewMode,
} from "@/styles/base-fabricator/ui/record-view"
import { Textarea } from "@/styles/base-fabricator/ui/textarea"

type Task = { title: string; isDone: boolean }
type Issue = {
  id: string
  title: string
  notes?: string
  tasks?: Task[]
  values: Record<string, unknown>
}

const icons = { comments: <MessageSquareIcon /> }

const initialColumns: KanbanColumnDefinition[] = [
  { id: "backlog", name: "Backlog", icon: "status-backlog", color: "gray" },
  { id: "planned", name: "Planned", icon: "status-todo", color: "gray" },
  {
    id: "progress",
    name: "In progress",
    icon: "status-progress",
    color: "yellow",
    limit: 4,
  },
  {
    id: "review",
    name: "In review",
    icon: "status-review",
    color: "blue",
    limit: 3,
    limitMode: "block",
  },
  { id: "done", name: "Done", icon: "status-done", color: "green" },
  { id: "canceled", name: "Canceled", icon: "status-canceled", color: "gray" },
]

const initialProperties: PropertyDefinition[] = [
  {
    id: "key",
    name: "ID",
    type: "key",
    isSystem: true,
    isReadOnly: true,
    visibility: "hide",
  },
  {
    id: "priority",
    name: "Priority",
    type: "select",
    options: [
      {
        value: "urgent",
        label: "Urgent",
        icon: "priority-urgent",
        color: "destructive",
      },
      { value: "high", label: "High", icon: "priority-high" },
      { value: "medium", label: "Medium", icon: "priority-medium" },
      { value: "low", label: "Low", icon: "priority-low" },
    ],
  },
  {
    id: "assignee",
    name: "Assignee",
    type: "person",
    options: [
      { value: "maya", label: "Maya Chen" },
      { value: "daniel", label: "Daniel Okafor" },
      { value: "nora", label: "Nora Ahmed" },
      { value: "lucas", label: "Lucas Ferreira" },
      { value: "hana", label: "Hana Sato" },
    ],
  },
  {
    id: "labels",
    name: "Labels",
    type: "multi-select",
    options: [
      { value: "storefront", label: "Storefront", color: "blue" },
      { value: "design", label: "Design", color: "purple" },
      { value: "api", label: "API", color: "teal" },
      { value: "bug", label: "Bug", color: "red" },
      { value: "growth", label: "Growth", color: "green" },
      { value: "docs", label: "Docs", color: "orange" },
    ],
  },
  { id: "tasks", name: "Sub-tasks", type: "progress", isReadOnly: true },
  {
    id: "comments",
    name: "Comments",
    type: "number",
    icon: "comments",
    isReadOnly: true,
    visibility: "hide",
  },
  { id: "due", name: "Due date", type: "date" },
  {
    id: "estimate",
    name: "Estimate",
    type: "number",
    settings: { unit: "points", minimum: 0, maximum: 13 },
  },
  {
    id: "media",
    name: "Images",
    type: "files",
    settings: { accept: "images" },
  },
]

const getPhoto = (id: string, name: string): PropertyFile => ({
  id,
  name,
  type: "image/jpeg",
  url: `https://images.unsplash.com/photo-${id}?w=1200&auto=format&fit=crop&q=80`,
  thumbnail: `https://images.unsplash.com/photo-${id}?w=600&auto=format&fit=crop&q=70`,
})

const toTasks = (done: number, titles: string[]): Task[] =>
  titles.map((title, index) => ({ title, isDone: index < done }))

const initialIssues: Issue[] = [
  {
    id: "SHOP-148",
    title: "Remember the last delivery address",
    values: {
      status: "backlog",
      priority: "low",
      assignee: "hana",
      labels: ["storefront"],
      estimate: 2,
    },
  },
  {
    id: "SHOP-151",
    title: "Translate the returns flow into Portuguese and German",
    values: {
      status: "backlog",
      priority: "medium",
      assignee: "lucas",
      labels: ["docs"],
      comments: 2,
      estimate: 5,
    },
  },
  {
    id: "SHOP-155",
    title: "Gift notes on multi-address orders",
    values: {
      status: "backlog",
      priority: "low",
      labels: ["storefront", "design"],
      estimate: 3,
      media: [getPhoto("1549465220-1a8b9238cd48", "Gift box.jpg")],
    },
  },
  {
    id: "SHOP-132",
    title: "Let shoppers split one order across two cards",
    notes:
      "Support asks for this every week around the holidays. Start with two cards and equal or custom amounts.",
    tasks: toTasks(0, [
      "Amount editor in the payment step",
      "Refund each card in proportion",
      "Receipt with both cards",
    ]),
    values: {
      status: "planned",
      priority: "high",
      assignee: "maya",
      labels: ["storefront", "api"],
      comments: 6,
      due: "2026-12-04",
      estimate: 8,
    },
  },
  {
    id: "SHOP-137",
    title: "Stock counts drift after a partial refund",
    values: {
      status: "planned",
      priority: "urgent",
      assignee: "daniel",
      labels: ["api", "bug"],
      comments: 11,
      due: "2026-11-24",
      estimate: 3,
    },
  },
  {
    id: "SHOP-140",
    title: "Empty states for saved lists",
    values: {
      status: "planned",
      priority: "medium",
      assignee: "nora",
      labels: ["design"],
      due: "2026-12-09",
      estimate: 2,
    },
  },
  {
    id: "SHOP-118",
    title: "New size guide with measurements per region",
    notes: "One table per region, with the shopper’s own region first.",
    tasks: toTasks(3, [
      "Collect regional charts",
      "Unit switch",
      "Table on phones",
      "Link from the size picker",
      "Copy review",
    ]),
    values: {
      status: "progress",
      priority: "high",
      assignee: "nora",
      labels: ["design", "storefront"],
      comments: 4,
      due: "2026-11-27",
      estimate: 5,
      media: [
        getPhoto("1556905055-8f358a7a47b2", "Flat lay.jpg"),
        getPhoto("1441986300917-64674bd600d8", "Shop floor.jpg"),
      ],
    },
  },
  {
    id: "SHOP-124",
    title: "Faster product search with typo tolerance",
    tasks: toTasks(1, ["Index product names", "Rank by stock"]),
    values: {
      status: "progress",
      priority: "medium",
      assignee: "maya",
      labels: ["api"],
      due: "2026-12-01",
      estimate: 8,
    },
  },
  {
    id: "SHOP-129",
    title: "Referral banner after the second order",
    values: {
      status: "progress",
      priority: "low",
      assignee: "lucas",
      labels: ["growth"],
      comments: 1,
      estimate: 3,
    },
  },
  {
    id: "SHOP-109",
    title: "Wallet buttons on the product page",
    tasks: toTasks(4, ["Apple Pay", "Google Pay", "Fallback", "Analytics"]),
    values: {
      status: "review",
      priority: "high",
      assignee: "daniel",
      labels: ["storefront"],
      comments: 9,
      due: "2026-11-26",
      estimate: 5,
      media: [getPhoto("1556742049-0cfed4f6a45d", "Checkout.jpg")],
    },
  },
  {
    id: "SHOP-113",
    title: "Webhook signatures for order events",
    values: {
      status: "review",
      priority: "medium",
      assignee: "hana",
      labels: ["api", "docs"],
      comments: 3,
      estimate: 3,
    },
  },
  {
    id: "SHOP-096",
    title: "Order status page without signing in",
    values: {
      status: "done",
      priority: "medium",
      assignee: "nora",
      labels: ["storefront"],
      estimate: 5,
    },
  },
  {
    id: "SHOP-101",
    title: "Weekly sales digest for store managers",
    values: {
      status: "done",
      priority: "low",
      assignee: "lucas",
      labels: ["growth"],
      estimate: 2,
    },
  },
  {
    id: "SHOP-088",
    title: "Loyalty points in a separate app",
    values: { status: "canceled", priority: "low", labels: ["growth"] },
  },
]

function getTitle(issue: Issue) {
  return issue.title
}

function getValue(issue: Issue, propertyId: string): unknown {
  if (propertyId === "key") return issue.id
  if (propertyId === "tasks")
    return (
      issue.tasks && {
        done: issue.tasks.filter(({ isDone }) => isDone).length,
        total: issue.tasks.length,
      }
    )
  return issue.values[propertyId]
}

function setValue(issue: Issue, propertyId: string, value: unknown): Issue {
  return { ...issue, values: { ...issue.values, [propertyId]: value } }
}

/** A real app uploads here and returns the stored address. */
async function storeFiles(files: File[]): Promise<PropertyFile[]> {
  await new Promise((resolve) => setTimeout(resolve, 900))
  return files.map((file) => ({
    id: crypto.randomUUID(),
    name: file.name,
    type: file.type,
    size: file.size,
    url: URL.createObjectURL(file),
  }))
}

function KanbanDemo() {
  const [issues, setIssues] = React.useState(initialIssues)
  const [columns, setColumns] = React.useState(initialColumns)
  const [properties, setProperties] = React.useState(initialProperties)
  const [statusRow, setStatusRow] = React.useState<
    Pick<PropertyDefinition, "name" | "description" | "icon" | "visibility">
  >({ name: "Status" })
  const [openId, setOpenId] = React.useState<string | null>(null)
  const [mode, setMode] = React.useState<RecordViewMode>("side")
  const nextId = React.useRef(160)

  const status: PropertyDefinition = {
    ...statusRow,
    id: "status",
    type: "status",
    required: true,
    options: columns.map(({ id, name, icon, color }) => ({
      value: id,
      label: name,
      icon,
      color,
    })),
  }
  const issue = issues.find(({ id }) => id === openId)
  const cover =
    issue &&
    properties
      .map((property) =>
        getPropertyCover(property, getValue(issue, property.id))
      )
      .find(Boolean)
  // The status's options are the board's columns, so editing one edits both.
  function changeProperties(next: PropertyDefinition[]) {
    const edited = next.find(({ id }) => id === "status")
    if (edited) {
      const { name, description, icon, visibility, options = [] } = edited
      setStatusRow({ name, description, icon, visibility })
      setColumns(
        options.map(({ value, label, color, icon }) => ({
          ...columns.find(({ id }) => id === value),
          id: value,
          name: label,
          color,
          icon,
        }))
      )
    }
    setProperties(next.filter(({ id }) => id !== "status"))
  }
  const update = (id: string, change: (issue: Issue) => Issue) =>
    setIssues((list) =>
      list.map((entry) => (entry.id === id ? change(entry) : entry))
    )

  return (
    <PropertyIconProvider icons={icons}>
      <main className="flex h-[46rem] min-w-0 flex-col">
        <Kanban
          label="Storefront board"
          fit="fill"
          className="flex-1"
          items={issues}
          columns={columns}
          properties={[status, ...properties]}
          groupBy="status"
          defaultView={{
            hiddenColumns: ["canceled"],
            visibleProperties: [
              "key",
              "priority",
              "assignee",
              "labels",
              "tasks",
              "comments",
              "due",
              "media",
            ],
          }}
          getTitle={getTitle}
          getValue={getValue}
          setValue={setValue}
          createItem={({ title, value }) => ({
            id: `SHOP-${nextId.current++}`,
            title,
            values: { ...getPropertyDefaults(properties), status: value },
          })}
          onCardsChange={(change) => setIssues(change.apply)}
          onColumnsChange={setColumns}
        >
          {(board) => (
            <>
              <div className="flex items-center gap-3">
                <h1 className="min-w-0 flex-1 truncate text-base font-semibold">
                  Storefront
                  <span className="ms-2 text-sm font-normal text-muted-foreground">
                    {issues.length} cards
                  </span>
                </h1>
                <Button
                  onClick={() =>
                    setOpenId(
                      board.create("Untitled card", "planned", null, "start") ??
                        null
                    )
                  }
                >
                  <PlusIcon data-icon="inline-start" />
                  New card
                </Button>
              </div>
              <KanbanToolbar board={board} />
              <KanbanBoard
                board={board}
                openId={openId}
                onOpenCard={({ id }) => setOpenId(id)}
              />
              <RecordView
                open={openId !== null}
                onOpenChange={(open) => {
                  if (!open) setOpenId(null)
                }}
                mode={mode}
                onModeChange={setMode}
                title={issue?.title ?? "Card"}
                onTitleChange={(title) => {
                  if (issue) update(issue.id, (entry) => ({ ...entry, title }))
                }}
                state={issue ? "ready" : "missing"}
                context={
                  <>
                    <RocketIcon />
                    <span className="truncate">Storefront</span>
                    <span aria-hidden="true">/</span>
                    <span className="text-foreground tabular-nums">
                      {issue?.id}
                    </span>
                  </>
                }
                cover={
                  cover && <RecordViewCover src={cover.url} alt={cover.name} />
                }
                onCopyLink={() => navigator.clipboard.writeText(location.href)}
                aside={
                  issue && (
                    <>
                      <PropertyList
                        key={issue.id}
                        properties={[status, ...properties]}
                        onPropertiesChange={changeProperties}
                        getValue={(id) => getValue(issue, id)}
                        isOnCard={board.isOnCard}
                        onCardChange={board.setOnCard}
                        onValueChange={(id, value) =>
                          update(issue.id, (entry) =>
                            setValue(entry, id, value)
                          )
                        }
                        onFilesAdd={(_, files) => storeFiles(files)}
                        onOptionCreate={(property, label) => {
                          const value = crypto.randomUUID()
                          changeProperties(
                            [status, ...properties].map((entry) =>
                              entry.id === property.id
                                ? {
                                    ...entry,
                                    options: [
                                      ...(entry.options ?? []),
                                      { value, label, color: "gray" },
                                    ],
                                  }
                                : entry
                            )
                          )
                          return value
                        }}
                        conversion={{
                          getValues: (id) =>
                            issues.map((entry) => ({
                              recordId: entry.id,
                              value: getValue(entry, id),
                            })),
                          onConvert: ({ property, values }) => {
                            setProperties((list) =>
                              list.map((entry) =>
                                entry.id === property.id ? property : entry
                              )
                            )
                            const converted = new Map(
                              values.map(({ recordId, value }) => [
                                recordId,
                                value,
                              ])
                            )
                            setIssues((list) =>
                              list.map((entry) =>
                                setValue(
                                  entry,
                                  property.id,
                                  converted.get(entry.id) ?? null
                                )
                              )
                            )
                          },
                        }}
                      />
                      <PropertyAdd
                        onPropertyAdd={(property) =>
                          setProperties((list) => [...list, property])
                        }
                      />
                    </>
                  )
                }
              >
                {issue && (
                  <IssueContent
                    key={issue.id}
                    issue={issue}
                    onChange={(change) => update(issue.id, change)}
                  />
                )}
              </RecordView>
            </>
          )}
        </Kanban>
      </main>
    </PropertyIconProvider>
  )
}

function IssueContent({
  issue,
  onChange,
}: {
  issue: Issue
  onChange: (change: (issue: Issue) => Issue) => void
}) {
  const tasks = issue.tasks ?? []
  const done = tasks.filter(({ isDone }) => isDone).length
  return (
    <>
      <RecordViewSection title="Description">
        <Textarea
          aria-label="Description"
          placeholder="Add a description"
          className="field-sizing-content resize-none"
          defaultValue={issue.notes}
          onBlur={(event) => {
            const notes = event.target.value
            onChange((entry) => ({ ...entry, notes }))
          }}
        />
      </RecordViewSection>
      {tasks.length > 0 && (
        <RecordViewSection title={`Sub-tasks ${done}/${tasks.length}`}>
          <ul className="flex flex-col gap-2">
            {tasks.map((task, index) => (
              <li key={task.title} className="flex items-center gap-3">
                <Checkbox
                  aria-label={task.title}
                  checked={task.isDone}
                  onCheckedChange={(isDone) =>
                    onChange((entry) => ({
                      ...entry,
                      tasks: tasks.map((other, place) =>
                        place === index
                          ? { ...other, isDone: isDone === true }
                          : other
                      ),
                    }))
                  }
                />
                <span
                  className={
                    task.isDone ? "text-muted-foreground line-through" : ""
                  }
                >
                  {task.title}
                </span>
              </li>
            ))}
          </ul>
        </RecordViewSection>
      )}
      <RecordViewSection title="Activity">
        <p className="flex items-center gap-2 text-muted-foreground">
          <PropertyMark mark={{ icon: "status-done", color: "green" }} />
          Maya Chen linked a pull request, 2 hours ago
        </p>
        <p className="flex items-center gap-2 text-muted-foreground">
          <PropertyMark mark={{ icon: "status-todo", color: "gray" }} />
          Daniel Okafor created this issue, Nov 18
        </p>
      </RecordViewSection>
    </>
  )
}

export default KanbanDemo
