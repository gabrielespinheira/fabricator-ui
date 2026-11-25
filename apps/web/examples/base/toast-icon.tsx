"use client"

import { DownloadIcon } from "lucide-react"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/styles/base-nova/ui/avatar"
import { Button } from "@/styles/base-nova/ui/button"
import { toast } from "@/styles/base-nova/ui/toast"

export function ToastIcon() {
  return (
    <div className="flex flex-wrap justify-center gap-2">
      <Button
        variant="outline"
        onClick={() => toast.add({ title: "Link copied" })}
      >
        No Icon
      </Button>
      <Button
        variant="outline"
        onClick={() => toast.add({ type: "success", title: "Profile updated" })}
      >
        Type Icon
      </Button>
      <Button
        variant="outline"
        onClick={() =>
          toast.add({
            title: "Export ready",
            description: "invoices-november.csv, 2.4 MB",
            actionProps: { children: "Download" },
            data: { icon: <DownloadIcon /> },
          })
        }
      >
        Custom Icon
      </Button>
      <Button
        variant="outline"
        onClick={() =>
          toast.add({
            title: "Olivia Martin commented",
            description: "Can we move the launch to Thursday?",
            data: {
              icon: (
                <Avatar size="sm">
                  <AvatarImage src="/avatars/03.png" alt="" />
                  <AvatarFallback>OM</AvatarFallback>
                </Avatar>
              ),
            },
          })
        }
      >
        Avatar
      </Button>
    </div>
  )
}
