"use client"

import { useSiteSetting } from "@/lib/site-settings"
import { DemoFrame } from "@/components/foundations/demo-frame"
import { SoundEffects } from "@/styles/base-fabricator/components/sound-effects"
import { playSound, SOUNDS } from "@/styles/base-fabricator/lib/sounds"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/styles/base-fabricator/ui/accordion"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/styles/base-fabricator/ui/alert-dialog"
import { Button } from "@/styles/base-fabricator/ui/button"
import { Checkbox } from "@/styles/base-fabricator/ui/checkbox"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/styles/base-fabricator/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/styles/base-fabricator/ui/dropdown-menu"
import { Label } from "@/styles/base-fabricator/ui/label"
import {
  RadioGroup,
  RadioGroupItem,
} from "@/styles/base-fabricator/ui/radio-group"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/styles/base-fabricator/ui/sheet"
import { Slider } from "@/styles/base-fabricator/ui/slider"
import { Switch } from "@/styles/base-fabricator/ui/switch"
import { Tabs, TabsList, TabsTrigger } from "@/styles/base-fabricator/ui/tabs"
import { toast } from "@/styles/base-fabricator/ui/toast"
import { Toggle } from "@/styles/base-fabricator/ui/toggle"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/styles/base-fabricator/ui/toggle-group"

const CATEGORIES = [...new Set(SOUNDS.map((sound) => sound.category))]

// Every sound in the catalogue, by family. Pressing one previews it even when
// sounds are off: it is an explicit request to hear it.
export function SoundCatalog() {
  return (
    <DemoFrame
      className="flex-col items-stretch gap-5 p-3 sm:p-4"
      data-sound="none"
    >
      {CATEGORIES.map((category) => (
        <section key={category} className="flex flex-col gap-1">
          <h3 className="px-3 text-[12px] font-medium text-muted-foreground">
            {category}
          </h3>
          <div className="grid grid-cols-1 gap-1 sm:grid-cols-2 lg:grid-cols-3">
            {SOUNDS.filter((sound) => sound.category === category).map(
              (sound) => (
                <button
                  key={sound.name}
                  type="button"
                  onClick={() => playSound(sound.name, { force: true })}
                  className="flex flex-col items-start gap-0.5 rounded-lg px-3 py-2.5 text-start transition-colors duration-fast ease-spring outline-none hover:bg-hover focus-visible:ring-1 focus-visible:ring-focus-ring active:bg-active"
                >
                  <span className="flex w-full items-center justify-between gap-2 text-[13px] font-medium text-foreground">
                    {sound.name}
                    <span className="text-[11px] font-normal text-muted-foreground tabular-nums">
                      {sound.length}ms · {sound.pitch}Hz
                    </span>
                  </span>
                  <span className="text-[12px] text-muted-foreground">
                    {sound.usedBy}
                  </span>
                </button>
              )
            )}
          </div>
        </section>
      ))}
    </DemoFrame>
  )
}

function Row({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
      <span className="w-28 shrink-0 text-[12px] text-muted-foreground">
        {label}
      </span>
      <div className="flex flex-1 flex-wrap items-center gap-3">{children}</div>
    </div>
  )
}

// Real components with <SoundEffects /> listening: nothing in them knows about
// sound. The toggle is the site's own Sound setting.
export function SoundPlayground() {
  const [sound, setSound] = useSiteSetting("sound")

  return (
    <DemoFrame
      className="flex-col items-stretch gap-5"
      caption={
        <span className="flex items-center justify-between gap-4">
          <span>
            Sounds are {sound ? "on" : "off"}. Every component here plays
            through <code>&lt;SoundEffects /&gt;</code>.
          </span>
          <span className="flex items-center gap-2">
            <Label htmlFor="sound-playground-toggle">Sound</Label>
            <Switch
              id="sound-playground-toggle"
              checked={sound}
              onCheckedChange={(checked) => setSound(checked)}
            />
          </span>
        </span>
      }
    >
      <SoundEffects enabled={sound} />
      <Row label="Buttons">
        <Button>Save</Button>
        <Button variant="outline">Preview</Button>
        <Button variant="destructive">Delete</Button>
        <Button variant="link">Learn more</Button>
        <Button variant="outline" disabled focusableWhenDisabled>
          Disabled
        </Button>
        <Button variant="secondary" data-sound="copy">
          Copy link
        </Button>
      </Row>
      <Row label="Selection">
        <div className="flex items-center gap-2">
          <Checkbox id="sound-playground-checkbox" />
          <Label htmlFor="sound-playground-checkbox">Remember me</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch id="sound-playground-switch" defaultChecked />
          <Label htmlFor="sound-playground-switch">Notifications</Label>
        </div>
        <RadioGroup defaultValue="daily" className="flex gap-3">
          {["daily", "weekly"].map((value) => (
            <div key={value} className="flex items-center gap-2">
              <RadioGroupItem value={value} id={`sound-playground-${value}`} />
              <Label
                htmlFor={`sound-playground-${value}`}
                className="capitalize"
              >
                {value}
              </Label>
            </div>
          ))}
        </RadioGroup>
        <Toggle variant="outline">Bold</Toggle>
        <ToggleGroup defaultValue={["left"]} variant="outline">
          <ToggleGroupItem value="left">Left</ToggleGroupItem>
          <ToggleGroupItem value="center">Center</ToggleGroupItem>
          <ToggleGroupItem value="right">Right</ToggleGroupItem>
        </ToggleGroup>
      </Row>
      <Row label="Navigation">
        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
            <TabsTrigger value="billing">Billing</TabsTrigger>
          </TabsList>
        </Tabs>
        <Slider defaultValue={[40]} max={100} step={5} className="w-40" />
      </Row>
      <Row label="Surfaces">
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="outline" />}>
            Menu
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-40">
            <DropdownMenuGroup>
              <DropdownMenuItem>Profile</DropdownMenuItem>
              <DropdownMenuItem>Settings</DropdownMenuItem>
              <DropdownMenuItem>Sign out</DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
        <Dialog>
          <DialogTrigger render={<Button variant="outline" />}>
            Dialog
          </DialogTrigger>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Sounds</DialogTitle>
              <DialogDescription>
                A dialog blooms in on a fifth and steps back down as it closes.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose render={<Button variant="outline" />}>
                Close
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <AlertDialog>
          <AlertDialogTrigger render={<Button variant="outline" />}>
            Alert dialog
          </AlertDialogTrigger>
          <AlertDialogContent size="sm">
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this file?</AlertDialogTitle>
              <AlertDialogDescription>
                An alert dialog opens on a minor third: it needs an answer.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction variant="destructive">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <Sheet>
          <SheetTrigger render={<Button variant="outline" />}>
            Sheet
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Sounds</SheetTitle>
              <SheetDescription>
                Sheets and drawers move air as they slide in and out.
              </SheetDescription>
            </SheetHeader>
          </SheetContent>
        </Sheet>
      </Row>
      <Row label="Disclosure">
        <Accordion className="w-full max-w-sm">
          <AccordionItem value="what">
            <AccordionTrigger>What plays here?</AccordionTrigger>
            <AccordionContent>
              Accordions unfold upward as they open and fold back as they close.
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </Row>
      <Row label="Toasts">
        <Button
          variant="outline"
          onClick={() => toast.add({ description: "Your export is ready." })}
        >
          Info
        </Button>
        <Button
          variant="outline"
          onClick={() =>
            toast.add({ type: "success", description: "Changes saved." })
          }
        >
          Success
        </Button>
        <Button
          variant="outline"
          onClick={() =>
            toast.add({ type: "warning", description: "Storage is 90% full." })
          }
        >
          Warning
        </Button>
        <Button
          variant="outline"
          onClick={() =>
            toast.add({ type: "error", description: "Upload failed." })
          }
        >
          Error
        </Button>
      </Row>
    </DemoFrame>
  )
}
