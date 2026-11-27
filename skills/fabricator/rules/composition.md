# Component Composition

## Contents

- Items always inside their Group component
- Callouts use Alert
- Empty states use Empty component
- Toast notifications follow the project base
- Dialog, Sheet, and Drawer always need a Title
- Card structure
- Button has no isPending or isLoading prop
- Tabs and short single choices
- Avatar always needs AvatarFallback
- AppNav and other links
- Use existing components instead of custom markup

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

`ItemGroup` is a list, and `Item` is not a list item by itself. A static row is `<Item role="listitem">`; a row that is a link or a button goes inside `<div role="listitem">`.

This applies to all group-based components:

| Item                                                       | Group                    |
| ---------------------------------------------------------- | ------------------------ |
| `SelectItem`, `SelectLabel`                                | `SelectGroup`            |
| `DropdownMenuItem`, `DropdownMenuLabel`, `DropdownMenuSub` | `DropdownMenuGroup`      |
| `ContextMenuItem`                                          | `ContextMenuGroup`       |
| `CommandItem`                                              | `CommandGroup`           |
| `MessageScrollerItem`                                      | `MessageScrollerContent` |
| `Message` (consecutive, same sender)                       | `MessageGroup`           |
| `Bubble` (stacked)                                         | `BubbleGroup`            |
| `Attachment` (in a row)                                    | `AttachmentGroup`        |

Chat components nest in a fixed order (`MessageScrollerProvider` → `MessageScroller` → `MessageScrollerViewport` → `MessageScrollerContent` → `MessageScrollerItem`). See [chat.md](./chat.md).

---

## Callouts use Alert

The icon is a direct child; the action sits at the end. `variant` is `default`, `info`, `success`, `warning`, `error` or `destructive`; `contrast="high"` is for the one that must be dealt with.

```tsx
<Alert variant="warning">
  <TriangleAlertIcon />
  <AlertTitle>Your trial ends on Friday</AlertTitle>
  <AlertDescription>Add a card to keep sending.</AlertDescription>
  <AlertAction>
    <Button variant="outline" size="sm">Add card</Button>
  </AlertAction>
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

toast.add({ title: "Changes saved" })
toast.add({ type: "error", title: "Changes weren't saved", description: "The server didn't answer." })

const id = toast.add({
  title: "File deleted",
  actionProps: {
    children: "Undo",
    onClick() {
      undoDelete()
      toast.close(id)
    },
  },
})
```

For Radix and React Aria projects, use Sonner:

```tsx
import { toast } from "sonner"

toast.success("Changes saved")
toast.error("Changes weren't saved", { description: "The server didn't answer." })
toast("File deleted", {
  action: { label: "Undo", onClick: () => undoDelete() },
})
```

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

An overlay opened from a menu item, a toast or a header action has no trigger, so focus would fall to the page. Pass `finalFocus` on the content (Base UI) or `onCloseAutoFocus` (Radix) pointing at the button that led there, or at the neighbouring row after a delete.

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
  Saving…
</Button>
```

The button keeps the width of its longer label, and the spinner takes the icon's place.

---

## Tabs and short single choices

Use `Tabs` to switch between views. Give each `TabsTrigger` a matching `TabsContent`, and use the default `TabsList` to keep every label visible on the shared track. Use a single-select `ToggleGroup` for a setting or other value that changes in place.

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

## AppNav and other links

The rest of the frame is in [app-shell.md](../app-shell.md).

Pass `renderLink` to `AppNav`, `AppNavBottomBar` and `AppShellBreadcrumb`, returning the router's link without children. It gives client navigation, and `AppNav` rows keep their icon and badge.

```tsx
<AppNav
  groups={groups}
  pathname={pathname}
  renderLink={(item) => <Link href={item.href ?? "/"} />}
/>
```

A link that looks like a button uses `buttonVariants` on the router's link, which works in every base.

---

## Use existing components instead of custom markup

| Instead of                                                               | Use                                                                         |
| ------------------------------------------------------------------------ | --------------------------------------------------------------------------- |
| `<hr>`, `<div className="border-t">` or `<Separator />` between sections | More space (`gap`), a heading, or a `Card`; a menu keeps its own separators |
| `<div className="animate-pulse">` with styled divs                       | `<Skeleton className="h-40" />` filling the card's content area             |
| `<span className="rounded-full bg-green-100 ...">`                       | `<Badge variant="secondary">`                                               |
