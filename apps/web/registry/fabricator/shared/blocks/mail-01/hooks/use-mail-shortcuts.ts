"use client"

import { useShellShortcut } from "@/registry/bases/__base__/ui/app-shell"

export type MailShortcuts = {
  onNext: () => void
  onPrevious: () => void
  onArchive: () => void
  onDelete: () => void
  onToggleUnread: () => void
  onToggleStar: () => void
  onToggleSelected: () => void
  onReply: () => void
  onReplyAll: () => void
  onForward: () => void
  onSearch: () => void
  onCompose: () => void
}

/** Single keys belong to a menu, a list or a dialog that has the focus. */
function isInPopup(event: KeyboardEvent) {
  return (
    event.target instanceof Element &&
    event.target.closest(
      '[role="menu"], [role="listbox"], [role="dialog"], [role="alertdialog"]'
    ) !== null
  )
}

function useMailShortcut(
  id: string,
  keys: string,
  label: string,
  isEnabled: boolean,
  run: () => void
) {
  useShellShortcut(
    { id: `mail.${id}`, keys, label, enabled: isEnabled },
    (event) => {
      if (!isInPopup(event)) run()
    }
  )
}

/**
 * Working the list without the mouse, with the keys most mail apps share. The
 * shell ignores them while someone types, and lists them for a palette.
 */
export function useMailShortcuts(
  handlers: MailShortcuts,
  {
    isEnabled,
    hasThread,
    hasSelection,
  }: {
    /** false while a message is being composed. */
    isEnabled: boolean
    hasThread: boolean
    hasSelection: boolean
  }
) {
  const canAct = isEnabled && (hasThread || hasSelection)
  const canAnswer = isEnabled && hasThread
  useMailShortcut("next", "j", "Next conversation", isEnabled, handlers.onNext)
  useMailShortcut(
    "previous",
    "k",
    "Previous conversation",
    isEnabled,
    handlers.onPrevious
  )
  useMailShortcut("archive", "e", "Archive", canAct, handlers.onArchive)
  useMailShortcut("delete", "shift+3", "Delete", canAct, handlers.onDelete)
  useMailShortcut("delete-key", "Delete", "Delete", canAct, handlers.onDelete)
  useMailShortcut(
    "unread",
    "u",
    "Mark read or unread",
    canAct,
    handlers.onToggleUnread
  )
  useMailShortcut("star", "s", "Star", canAnswer, handlers.onToggleStar)
  useMailShortcut(
    "select",
    "x",
    "Select conversation",
    canAnswer,
    handlers.onToggleSelected
  )
  useMailShortcut("reply", "r", "Reply", canAnswer, handlers.onReply)
  useMailShortcut("reply-all", "a", "Reply all", canAnswer, handlers.onReplyAll)
  useMailShortcut("forward", "f", "Forward", canAnswer, handlers.onForward)
  useMailShortcut("search", "/", "Search mail", isEnabled, handlers.onSearch)
  useMailShortcut("compose", "c", "Compose", isEnabled, handlers.onCompose)
}
