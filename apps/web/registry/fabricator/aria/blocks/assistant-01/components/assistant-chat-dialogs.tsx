"use client"

import * as React from "react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/registry/bases/aria/ui/alert-dialog"
import { Button } from "@/registry/bases/aria/ui/button"
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/registry/bases/aria/ui/dialog"
import { Field, FieldError, FieldLabel } from "@/registry/bases/aria/ui/field"
import { Input } from "@/registry/bases/aria/ui/input"
import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

// Renaming and deleting a chat. React Aria opens dialogs with isOpen and
// closes them from slot="close" buttons; the other bases have their own.

type DialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
}

function AssistantRenameDialog({
  open,
  onOpenChange,
  title,
  onRename,
}: DialogProps & { onRename: (title: string) => void }) {
  const [error, setError] = React.useState<string>()

  return (
    <Dialog
      isOpen={open}
      onOpenChange={(next) => {
        setError(undefined)
        onOpenChange(next)
      }}
      className="sm:max-w-96"
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
            onPress={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="submit">Rename</Button>
        </DialogFooter>
      </form>
    </Dialog>
  )
}

function AssistantDeleteDialog({
  open,
  onOpenChange,
  title,
  onDelete,
}: DialogProps & { onDelete: () => void }) {
  return (
    <AlertDialog isOpen={open} onOpenChange={onOpenChange} size="sm">
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
        <AlertDialogAction variant="destructive" onPress={onDelete}>
          Delete
        </AlertDialogAction>
      </AlertDialogFooter>
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
  const close = (open: boolean) => {
    if (!open) onClose()
  }
  return (
    <>
      <AssistantRenameDialog
        open={dialog.open && dialog.kind === "rename"}
        onOpenChange={close}
        title={dialog.title}
        onRename={onRename}
      />
      <AssistantDeleteDialog
        open={dialog.open && dialog.kind === "delete"}
        onOpenChange={close}
        title={dialog.title}
        onDelete={onDelete}
      />
    </>
  )
}
