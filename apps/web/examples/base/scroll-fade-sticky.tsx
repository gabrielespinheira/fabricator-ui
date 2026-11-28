const messages = [
  "Inbox triage",
  "Design review",
  "API contract",
  "QA pass",
  "Launch notes",
  "Metrics follow-up",
  "Pricing page",
  "Release checklist",
  "Support handoff",
  "Retro notes",
]

export function ScrollFadeSticky() {
  return (
    <div className="mx-auto flex max-w-xs min-w-0 flex-col gap-6">
      <div className="flex flex-col gap-3">
        <div className="overflow-hidden rounded-2xl border bg-background has-[>:focus-visible]:ring-2 has-[>:focus-visible]:ring-ring">
          <div
            tabIndex={0}
            aria-label="Today, faded with insets"
            className="h-56 scroll-fade scrollbar-none overflow-y-auto outline-none scroll-fade-inset-b-12 scroll-fade-inset-t-10"
          >
            <div className="sticky top-0 z-10 flex h-10 items-center bg-background px-3 text-sm font-medium">
              Today
            </div>
            <ScrollFadeStickyItems />
            <div className="sticky bottom-0 z-10 flex h-12 items-center bg-background px-1.5">
              <div className="flex h-9 w-full items-center rounded-lg border px-3 text-sm text-muted-foreground">
                Reply…
              </div>
            </div>
          </div>
        </div>
        <p className="text-center font-mono text-xs text-muted-foreground">
          {"scroll-fade-inset-{t,b}-*"}
        </p>
      </div>
      <div className="flex flex-col gap-3">
        <div className="overflow-hidden rounded-2xl border bg-background has-[>:focus-visible]:ring-2 has-[>:focus-visible]:ring-ring">
          <div
            tabIndex={0}
            aria-label="Today, faded by its sticky parts"
            className="h-56 scrollbar-none overflow-y-auto outline-none"
          >
            <div className="sticky-fade-b sticky top-0 z-10 flex h-10 items-center bg-background px-3 text-sm font-medium">
              Today
            </div>
            <ScrollFadeStickyItems />
            <div className="sticky-fade-t sticky bottom-0 z-10 flex h-12 items-center bg-background px-1.5">
              <div className="flex h-9 w-full items-center rounded-lg border px-3 text-sm text-muted-foreground">
                Reply…
              </div>
            </div>
          </div>
        </div>
        <p className="text-center font-mono text-xs text-muted-foreground">
          sticky-fade-b · sticky-fade-t
        </p>
      </div>
    </div>
  )
}

function ScrollFadeStickyItems() {
  return (
    <div className="flex flex-col gap-1.5 px-1.5">
      {messages.map((message) => (
        <div key={message} className="rounded-lg bg-muted px-3 py-2.5 text-sm">
          {message}
        </div>
      ))}
    </div>
  )
}
