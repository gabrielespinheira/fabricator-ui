"use client"

import { Button } from "@/styles/base-nova/ui/button"
import { toast } from "@/styles/base-nova/ui/toast"

export function ToastLong() {
  return (
    <div className="flex flex-wrap justify-center gap-2">
      <Button
        variant="outline"
        onClick={() =>
          toast.add({
            type: "warning",
            title: "Three members couldn't be invited",
            description:
              "Their addresses belong to another workspace on your plan. Ask its owner to release them, or invite each person with a different address. Invitations already sent to the other nine people are on their way and expire in seven days.",
          })
        }
      >
        Long Description
      </Button>
      <Button
        variant="outline"
        onClick={() =>
          toast.add({
            type: "success",
            title:
              "Uploaded annual-financial-report-2026-final-approved-by-the-board-v12-signed.pdf to Shared documents",
          })
        }
      >
        Long Title
      </Button>
      <Button
        variant="outline"
        onClick={() =>
          toast.add({
            title: "Link copied",
            description:
              "https://fabricator-ui.vercel.app/docs/components/base/toast#truncation?ref=onboarding-email-november",
          })
        }
      >
        Unbroken Text
      </Button>
    </div>
  )
}
