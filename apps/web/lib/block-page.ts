/** The URL path a block's page installs to: "app/sign-in/page.tsx" → "/sign-in". */
export function getBlockRoute(target: string) {
  const segments = target
    .replace(/^app\//, "")
    .replace(/\/?page\.tsx$/, "")
    .split("/")
    .filter((segment) => segment && !/^\(.*\)$/.test(segment))
  return `/${segments.join("/")}`
}

/** The route of a block's page file, or / for a block without one. */
export function getBlockPageRoute(
  files: ReadonlyArray<{ type: string; target?: string }>
) {
  const page = files.find((file) => file.type === "registry:page")
  return getBlockRoute(page?.target ?? "app/page.tsx")
}

export type AuthShape = {
  kind: "auth"
  /** Company sign-in buttons above the form. */
  hasProviders: boolean
  fields: number
  /** A "Step 1 of 3" line over the title. */
  hasSteps: boolean
}

export type BlockLayout = { kind: "app" } | AuthShape

const SIGN_IN: AuthShape = {
  kind: "auth",
  hasProviders: true,
  fields: 2,
  hasSteps: false,
}

// Each auth block's form, so its skeleton has the page's height and the
// centred column doesn't move when the page fades in.
const AUTH_SHAPES: Record<string, AuthShape> = {
  "sign-in-01": SIGN_IN,
  "sign-up-01": { ...SIGN_IN, fields: 3 },
  "forgot-password-01": {
    kind: "auth",
    hasProviders: false,
    fields: 1,
    hasSteps: true,
  },
}

/** The shape a block's loading skeleton takes: its form, or an app. */
export function getBlockLayout(
  name: string,
  categories: readonly string[]
): BlockLayout {
  if (!categories.includes("authentication")) return { kind: "app" }
  return AUTH_SHAPES[name] ?? SIGN_IN
}
