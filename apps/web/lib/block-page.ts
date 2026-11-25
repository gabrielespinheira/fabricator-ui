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

export type BlockLayout = "app" | "auth" | "onboarding"

/** The shape a block's loading skeleton takes. */
export function getBlockLayout(categories: readonly string[]): BlockLayout {
  if (categories.includes("authentication")) return "auth"
  if (categories.includes("onboarding")) return "onboarding"
  return "app"
}
