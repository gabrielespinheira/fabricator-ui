# Component Composition

## Contents

- Items always inside their Group component
- Callouts use Alert
- Empty states use Empty component
- Toast notifications follow the project base
- Choosing between overlay components
- Dialog, Sheet, and Drawer always need a Title
- Card structure
- Button has no isPending or isLoading prop
- Tabs and short single choices
- Avatar always needs AvatarFallback
- Separate with space or a surface, not lines
- Use Skeleton for loading placeholders
- Use Badge instead of custom styled spans

---

## Items always inside their Group component

Never render items directly inside the content container.

**Incorrect:**

```tsx
<SelectContent>
  <SelectItem value="apple">Apple</SelectItem>
  <SelectItem value="banana">Banana</SelectItem>
</SelectContent>
```

**Correct:**

```tsx
<SelectContent>
  <SelectGroup>
    <SelectItem value="apple">Apple</SelectItem>
    <SelectItem value="banana">Banana</SelectItem>
  </SelectGroup>
</SelectContent>
```

This applies to all group-based components:

| Item                                                       | Group                    |
| ---------------------------------------------------------- | ------------------------ |
| `SelectItem`, `SelectLabel`                                | `SelectGroup`            |
| `DropdownMenuItem`, `DropdownMenuLabel`, `DropdownMenuSub` | `DropdownMenuGroup`      |
| `MenubarItem`                                              | `MenubarGroup`           |
| `ContextMenuItem`                                          | `ContextMenuGroup`       |
| `CommandItem`                                              | `CommandGroup`           |
| `MessageScrollerItem`                                      | `MessageScrollerContent` |
| `Message` (consecutive, same sender)                       | `MessageGroup`           |
| `Bubble` (stacked)                                         | `BubbleGroup`            |
| `Attachment` (in a row)                                    | `AttachmentGroup`        |

Chat components nest in a fixed order (`MessageScrollerProvider` → `MessageScroller` → `MessageScrollerViewport` → `MessageScrollerContent` → `MessageScrollerItem`). See [chat.md](./chat.md).

---

## Callouts use Alert

```tsx
<Alert>
  <AlertTitle>Warning</AlertTitle>
  <AlertDescription>Something needs attention.</AlertDescription>
</Alert>
```

---

## Empty states use Empty component

```tsx
<Empty>
  <EmptyHeader>
    <EmptyMedia variant="icon">
      <FolderIcon />
    </EmptyMedia>
    <EmptyTitle>No projects yet</EmptyTitle>
    <EmptyDescription>Get started by creating a new project.</EmptyDescription>
  </EmptyHeader>
  <EmptyContent>
    <Button>Create Project</Button>
  </EmptyContent>
</Empty>
```

---

## Toast notifications follow the project base

For Base UI projects, use the `toast` component:

```tsx
import { toast } from "@/components/ui/toast"

toast.add({
  title: "Changes saved.",
})
```

For Radix and React Aria projects, use Sonner:

```tsx
import { toast } from "sonner"

toast.success("Changes saved.")
toast.error("Something went wrong.")
toast("File deleted.", {
  action: { label: "Undo", onClick: () => undoDelete() },
})
```

---

## Choosing between overlay components

| Use case                           | Component     |
| ---------------------------------- | ------------- |
| Focused task that requires input   | `Dialog`      |
| Destructive action confirmation    | `AlertDialog` |
| Side panel with details or filters | `Sheet`       |
| Mobile-first bottom panel          | `Drawer`      |
| Quick info on hover                | `HoverCard`   |
| Small contextual content on click  | `Popover`     |

---

## Dialog, Sheet, and Drawer always need a Title

`DialogTitle`, `SheetTitle`, `DrawerTitle` are required for accessibility. Use `className="sr-only"` if visually hidden.

```tsx
<DialogContent>
  <DialogHeader>
    <DialogTitle>Edit Profile</DialogTitle>
    <DialogDescription>Update your profile.</DialogDescription>
  </DialogHeader>
  ...
</DialogContent>
```

---

## Card structure

Use the parts that match the content: headings in `CardHeader`, body in `CardContent`, actions in `CardFooter`. Omit parts with no content.

```tsx
<Card>
  <CardHeader>
    <CardTitle>Team Members</CardTitle>
    <CardDescription>Manage your team.</CardDescription>
  </CardHeader>
  <CardContent>...</CardContent>
  <CardFooter>
    <Button>Invite</Button>
  </CardFooter>
</Card>
```

---

## Button has no isPending or isLoading prop

Compose with `Spinner` + `data-icon` + `disabled`:

```tsx
<Button disabled>
  <Spinner data-icon="inline-start" />
  Saving...
</Button>
```

---

## Tabs and short single choices

Place each `TabsTrigger` inside `TabsList`. Use the default list for the shared track and visible labels by omitting the `variant` prop. Use `TabsContent` when each option opens a distinct panel.

```tsx
<Tabs defaultValue="account">
  <TabsList aria-label="Account settings">
    <TabsTrigger value="account">Account</TabsTrigger>
    <TabsTrigger value="password">Password</TabsTrigger>
  </TabsList>
  <TabsContent value="account">...</TabsContent>
  <TabsContent value="password">...</TabsContent>
</Tabs>
```

A short setting or filter can use the same list on its own. Set the value through the root's selection callback. Base UI and Radix use `value` and `onValueChange`. React Aria uses `selectedKey` and `onSelectionChange` on the root and `id` on each trigger.

```tsx
<Tabs value={layout} onValueChange={setLayout}>
  <TabsList aria-label="Layout">
    <TabsTrigger value="inset">Inset</TabsTrigger>
    <TabsTrigger value="flush">Flush</TabsTrigger>
    <TabsTrigger value="floating">Floating</TabsTrigger>
  </TabsList>
</Tabs>
```

Use `Select` for five or more options or where the full labels would wrap, clip or crowd nearby controls. If the control changes with available width, keep the same selected value.

---

## Avatar always needs AvatarFallback

Always include `AvatarFallback` for when the image fails to load:

```tsx
<Avatar>
  <AvatarImage src="/avatar.png" alt="User" />
  <AvatarFallback>JD</AvatarFallback>
</Avatar>
```

---

## Use existing components instead of custom markup

| Instead of                                                               | Use                                                                         |
| ------------------------------------------------------------------------ | --------------------------------------------------------------------------- |
| `<hr>`, `<div className="border-t">` or `<Separator />` between sections | More space (`gap`), a heading, or a `Card`; a menu keeps its own separators |
| `<div className="animate-pulse">` with styled divs                       | `<Skeleton className="h-40" />` filling the card's content area             |
| `<span className="rounded-full bg-green-100 ...">`                       | `<Badge variant="secondary">`                                               |
