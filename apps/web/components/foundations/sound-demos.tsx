"use client"

import { useSiteSetting } from "@/lib/site-settings"
import { DemoFrame } from "@/components/foundations/demo-frame"
import { SoundEffects } from "@/styles/base-fabricator/components/sound-effects"
import { playSound, SOUNDS } from "@/styles/base-fabricator/lib/sounds"
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
import { Slider } from "@/styles/base-fabricator/ui/slider"
import { Switch } from "@/styles/base-fabricator/ui/switch"
import { Tabs, TabsList, TabsTrigger } from "@/styles/base-fabricator/ui/tabs"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/styles/base-fabricator/ui/toggle-group"

// Every sound in the catalogue. Pressing one previews it even when sounds are
// off: it is an explicit request to hear it.
export function SoundCatalog() {
  return (
    <DemoFrame className="block p-3 sm:p-4" data-sound="none">
      <div className="grid grid-cols-2 gap-1 sm:grid-cols-3">
        {SOUNDS.map((sound) => (
          <button
            key={sound.name}
            type="button"
            onClick={() => playSound(sound.name, { force: true })}
            className="flex flex-col items-start gap-0.5 rounded-lg px-3 py-2.5 text-start transition-colors duration-80 ease-spring outline-none hover:bg-hover focus-visible:ring-1 focus-visible:ring-focus-ring active:bg-active"
          >
            <span className="flex w-full items-center justify-between gap-2 text-[13px] font-medium text-foreground">
              {sound.name}
              <span className="text-[11px] font-normal text-muted-foreground tabular-nums">
                {sound.length}ms · {sound.pitch}Hz
              </span>
            </span>
            <span className="text-[12px] text-muted-foreground">
              {sound.category}
            </span>
          </button>
        ))}
      </div>
    </DemoFrame>
  )
}

// Real components with <SoundEffects /> listening: nothing in them knows about
// sound. The toggle is the site's own Sound setting.
export function SoundPlayground() {
  const [sound, setSound] = useSiteSetting("sound")

  return (
    <DemoFrame
      className="flex-col gap-6"
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
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button variant="outline">Press me</Button>
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="outline" />}>
            Open menu
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
            Open dialog
          </DialogTrigger>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Sounds</DialogTitle>
              <DialogDescription>
                Opening played two notes a fifth apart; closing falls.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose render={<Button />}>Close</DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-6">
        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>
        </Tabs>
        <ToggleGroup defaultValue={["left"]} variant="outline">
          <ToggleGroupItem value="left">Left</ToggleGroupItem>
          <ToggleGroupItem value="center">Center</ToggleGroupItem>
          <ToggleGroupItem value="right">Right</ToggleGroupItem>
        </ToggleGroup>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-6">
        <div className="flex items-center gap-2">
          <Switch id="sound-playground-switch" defaultChecked />
          <Label htmlFor="sound-playground-switch">Notifications</Label>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox id="sound-playground-checkbox" />
          <Label htmlFor="sound-playground-checkbox">Remember me</Label>
        </div>
        <Slider defaultValue={[40]} max={100} step={5} className="w-40" />
        <Button variant="secondary" data-sound="copy">
          Copy link
        </Button>
      </div>
    </DemoFrame>
  )
}
