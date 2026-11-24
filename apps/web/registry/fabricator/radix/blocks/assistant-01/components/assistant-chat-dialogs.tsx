"use client"

import * as React from "react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/registry/bases/radix/ui/alert-dialog"
import { Button } from "@/registry/bases/radix/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/registry/bases/radix/ui/dialog"
import { Field, FieldError, FieldLabel } from "@/registry/bases/radix/ui/field"
import { Input } from "@/registry/bases/radix/ui/input"
import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

// Renaming and deleting a chat. Radix hands focus back to a dialog's own
// trigger only, and these open from a menu, so this base's copy hands it back
// to what opened the menu. Base UI uses the shared copy.

/** The menu's trigger when a menu item has the focus, or what has it. */
function findOrigin() {
  const active = document.activeElement
  const triggerId = active
    ?.closest("[role=menu]")
    ?.getAttribute("aria-labelledby")
  return (triggerId && document.getElementById(triggerId)) || active
}

/** Where the focus goes once the dialog has closed. */
function useFocusOrigin(isOpen: boolean) {
  const origin = React.useRef<Element | null>(null)
  // Before the dialog takes the focus, in its own effect.
  React.useLayoutEffect(() => {
    if (isOpen) origin.current = findOrigin()
  }, [isOpen])

  return (event: Event) => {
    event.preventDefault()
    if (origin.current instanceof HTMLElement) origin.current.focus()
  }
}

type DialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCloseAutoFocus: (event: Event) => void
  title: string
}

function AssistantRenameDialog({
  open,
  onOpenChange,
  onCloseAutoFocus,
  title,
  onRename,
}: DialogProps & { onRename: (title: string) => void }) {
  const [error, setError] = React.useState<string>()

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setError(undefined)
        onOpenChange(next)
      }}
    >
      <DialogContent
        className="sm:max-w-96"
        onCloseAutoFocus={onCloseAutoFocus}
      >
        <form
          className="contents"
          onSubmit={(event) => {
            event.preventDefault()
            const name = String(
              new FormData(event.currentTarget).get("title") ?? ""
            ).trim()
            if (!name) {
              setError("Enter a name for the chat.")
              return
            }
            onRename(name)
            onOpenChange(false)
          }}
        >
          <DialogHeader>
            <DialogTitle>Rename chat</DialogTitle>
            <DialogDescription>
              The name shows in your chat history.
            </DialogDescription>
          </DialogHeader>
          <Field data-invalid={error ? true : undefined}>
            <FieldLabel htmlFor="assistant-chat-title" className="sr-only">
              Name
            </FieldLabel>
            <Input
              id="assistant-chat-title"
              name="title"
              defaultValue={title}
              autoComplete="off"
              autoFocus
              aria-invalid={error ? true : undefined}
            />
            <FieldError>{error}</FieldError>
          </Field>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit">Rename</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function AssistantDeleteDialog({
  open,
  onOpenChange,
  onCloseAutoFocus,
  title,
  onDelete,
}: DialogProps & { onDelete: () => void }) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent size="sm" onCloseAutoFocus={onCloseAutoFocus}>
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-destructive/10 text-destructive-text">
            <IconPlaceholder
              lucide="Trash2Icon"
              tabler="IconTrash"
              hugeicons="Delete02Icon"
              phosphor="TrashIcon"
              remixicon="RiDeleteBinLine"
            />
          </AlertDialogMedia>
          <AlertDialogTitle>Delete “{title}”?</AlertDialogTitle>
          <AlertDialogDescription>
            The chat and the files in it are deleted for good.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={() => {
              onDelete()
              onOpenChange(false)
            }}
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export type AssistantChatDialog = {
  kind: "rename" | "delete"
  chatId: string
  title: string
  open: boolean
}

export function AssistantChatDialogs({
  dialog,
  onClose,
  onRename,
  onDelete,
}: {
  dialog: AssistantChatDialog
  onClose: () => void
  onRename: (title: string) => void
  onDelete: () => void
}) {
  const returnFocus = useFocusOrigin(dialog.open)
  const close = (open: boolean) => {
    if (!open) onClose()
  }
  return (
    <>
      <AssistantRenameDialog
        open={dialog.open && dialog.kind === "rename"}
        onOpenChange={close}
        onCloseAutoFocus={returnFocus}
        title={dialog.title}
        onRename={onRename}
      />
      <AssistantDeleteDialog
        open={dialog.open && dialog.kind === "delete"}
        onOpenChange={close}
        onCloseAutoFocus={returnFocus}
        title={dialog.title}
        onDelete={onDelete}
      />
    </>
  )
}
