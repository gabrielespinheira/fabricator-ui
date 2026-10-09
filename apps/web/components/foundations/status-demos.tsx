import { DemoFrame } from "@/components/foundations/demo-frame"

// Class names are written out in full so Tailwind generates them.
const STATUSES = [
  {
    status: "info",
    label: "Info",
    text: "text-info-text",
    solid: "bg-info text-info-foreground",
    icon: "text-info",
    border: "border-info-border",
    levels: [
      "bg-info-surface-1 shadow-surface-1",
      "bg-info-surface-2 shadow-surface-2",
      "bg-info-surface-3 shadow-surface-3",
      "bg-info-surface-4 shadow-surface-4",
      "bg-info-surface-5 shadow-surface-5",
      "bg-info-surface-6 shadow-surface-6",
      "bg-info-surface-7 shadow-surface-7",
      "bg-info-surface-8 shadow-surface-8",
    ],
  },
  {
    status: "success",
    label: "Success",
    text: "text-success-text",
    solid: "bg-success text-success-foreground",
    icon: "text-success",
    border: "border-success-border",
    levels: [
      "bg-success-surface-1 shadow-surface-1",
      "bg-success-surface-2 shadow-surface-2",
      "bg-success-surface-3 shadow-surface-3",
      "bg-success-surface-4 shadow-surface-4",
      "bg-success-surface-5 shadow-surface-5",
      "bg-success-surface-6 shadow-surface-6",
      "bg-success-surface-7 shadow-surface-7",
      "bg-success-surface-8 shadow-surface-8",
    ],
  },
  {
    status: "warning",
    label: "Warning",
    text: "text-warning-text",
    solid: "bg-warning text-warning-foreground",
    icon: "text-warning",
    border: "border-warning-border",
    levels: [
      "bg-warning-surface-1 shadow-surface-1",
      "bg-warning-surface-2 shadow-surface-2",
      "bg-warning-surface-3 shadow-surface-3",
      "bg-warning-surface-4 shadow-surface-4",
      "bg-warning-surface-5 shadow-surface-5",
      "bg-warning-surface-6 shadow-surface-6",
      "bg-warning-surface-7 shadow-surface-7",
      "bg-warning-surface-8 shadow-surface-8",
    ],
  },
  {
    status: "error",
    label: "Error",
    text: "text-error-text",
    solid: "bg-error text-error-foreground",
    icon: "text-error",
    border: "border-error-border",
    levels: [
      "bg-error-surface-1 shadow-surface-1",
      "bg-error-surface-2 shadow-surface-2",
      "bg-error-surface-3 shadow-surface-3",
      "bg-error-surface-4 shadow-surface-4",
      "bg-error-surface-5 shadow-surface-5",
      "bg-error-surface-6 shadow-surface-6",
      "bg-error-surface-7 shadow-surface-7",
      "bg-error-surface-8 shadow-surface-8",
    ],
  },
]

/** Each status's eight-level surface ladder, in the current theme. */
export function StatusLadders() {
  return (
    <DemoFrame
      className="flex-col items-stretch gap-6"
      caption="Each status has the same eight levels as the neutral surfaces, tinted, and pairs with the same shadows. Switch the theme to compare."
    >
      {STATUSES.map(({ status, label, text, levels }) => (
        <div key={status} className="flex flex-col gap-2">
          <span className="text-[13px] font-medium text-foreground">
            {label}
          </span>
          <div className="grid grid-cols-4 gap-3 sm:grid-cols-8">
            {levels.map((className, index) => (
              <div
                key={className}
                className={`flex aspect-[4/3] items-center justify-center rounded-xl text-[13px] font-medium ${text} ${className}`}
              >
                {index + 1}
              </div>
            ))}
          </div>
        </div>
      ))}
    </DemoFrame>
  )
}

/** The solid, foreground, text and border tokens of each status. */
export function StatusTokens() {
  return (
    <DemoFrame className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
      {STATUSES.map(({ status, label, text, solid, icon, border, levels }) => (
        <div
          key={status}
          className={`flex items-center gap-3 rounded-xl border p-3 ${border} ${levels[2]}`}
        >
          <span
            className={`flex size-9 shrink-0 items-center justify-center rounded-lg text-[13px] font-semibold ${solid}`}
          >
            Aa
          </span>
          <div className="flex min-w-0 flex-col">
            <span className={`text-[13px] font-medium ${text}`}>
              {label} text on its surface
            </span>
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className={`size-2 rounded-full bg-current ${icon}`} />
              solid · foreground · text · border
            </span>
          </div>
        </div>
      ))}
    </DemoFrame>
  )
}
