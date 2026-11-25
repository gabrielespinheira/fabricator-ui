"use client"

import { DownloadIcon } from "lucide-react"
import { toast } from "sonner"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/styles/radix-nova/ui/avatar"
import { Button } from "@/styles/radix-nova/ui/button"

export function SonnerIcon() {
  return (
    <div className="flex flex-wrap justify-center gap-2">
      <Button variant="outline" onClick={() => toast("Link copied")}>
        No Icon
      </Button>
      <Button
        variant="outline"
        onClick={() => toast.success("Profile updated")}
      >
        Type Icon
      </Button>
      <Button
        variant="outline"
        onClick={() =>
          toast("Export ready", {
            description: "invoices-november.csv, 2.4 MB",
            icon: <DownloadIcon />,
            action: {
              label: "Download",
              onClick: () => toast.success("Download started"),
            },
          })
        }
      >
        Custom Icon
      </Button>
      <Button
        variant="outline"
        onClick={() =>
          toast("Olivia Martin commented", {
            description: "Can we move the launch to Thursday?",
            icon: (
              <Avatar size="sm">
                <AvatarImage src="/avatars/03.png" alt="" />
                <AvatarFallback>OM</AvatarFallback>
              </Avatar>
            ),
          })
        }
      >
        Avatar
      </Button>
    </div>
  )
}
