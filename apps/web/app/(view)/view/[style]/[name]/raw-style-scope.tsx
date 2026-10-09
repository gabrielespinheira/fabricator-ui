"use client"

import * as React from "react"

// Resolves placeholder classes (`cn-*`) for blocks rendered from raw base
// sources. The wrapper scopes server-rendered content; the body class covers
// portalled content (dialogs, menus, popovers), which mounts after hydration.
export function RawStyleScope({
  className,
  children,
}: {
  className: string
  children: React.ReactNode
}) {
  React.useEffect(() => {
    document.body.classList.add(className)
    return () => document.body.classList.remove(className)
  }, [className])

  return <div className={`${className} contents`}>{children}</div>
}
