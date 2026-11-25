"use client"

import * as React from "react"

const COPIED_MS = 2000

/** Copies text, and remembers that it did for as long as the check shows. */
export function useAssistantCopy() {
  const [isCopied, setCopied] = React.useState(false)

  React.useEffect(() => {
    if (!isCopied) return
    const timer = setTimeout(() => setCopied(false), COPIED_MS)
    return () => clearTimeout(timer)
  }, [isCopied])

  const copy = (text: string) => {
    void navigator.clipboard.writeText(text).then(() => setCopied(true))
  }

  return { isCopied, copy }
}
