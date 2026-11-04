"use client"

import * as React from "react"
import {
  BellIcon,
  CopyIcon,
  HeartIcon,
  SettingsIcon,
  UploadIcon,
  type AnimatedIconHandle,
} from "@fabricator-ui/icons/animated"

import { Button } from "@/styles/base-fabricator/ui/button"

const ICONS = [BellIcon, HeartIcon, SettingsIcon, CopyIcon, UploadIcon]

/** Hover an icon by itself, or a button that plays the icon inside it. */
export function IconsAnimated() {
  const icon = React.useRef<AnimatedIconHandle>(null)
  return (
    <div className="not-prose flex flex-wrap items-center justify-center gap-6 rounded-xl bg-surface-2 p-8 text-foreground shadow-surface-2">
      <div className="flex items-center gap-4">
        {ICONS.map((Icon, index) => (
          <Icon key={index} />
        ))}
      </div>
      <Button
        variant="outline"
        onMouseEnter={() => icon.current?.startAnimation()}
        onMouseLeave={() => icon.current?.stopAnimation()}
      >
        <UploadIcon ref={icon} data-icon="inline-start" />
        Upload
      </Button>
    </div>
  )
}
