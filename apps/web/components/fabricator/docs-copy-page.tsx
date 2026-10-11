"use client"

import { CheckIcon, ChevronDownIcon, CopyIcon } from "lucide-react"

import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard"
import { menuItems } from "@/components/docs-copy-page"
import { Button } from "@/styles/base-fabricator/ui/button"
import { ButtonGroup } from "@/styles/base-fabricator/ui/button-group"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/styles/base-fabricator/ui/dropdown-menu"

export function DocsCopyPage({ page, url }: { page: string; url: string }) {
  const { copyToClipboard, isCopied } = useCopyToClipboard()

  return (
    <ButtonGroup aria-label="Page actions">
      <Button
        variant="outline"
        size="sm"
        className="h-8"
        onClick={() => copyToClipboard(page)}
      >
        {isCopied ? (
          <CheckIcon data-icon="inline-start" />
        ) : (
          <CopyIcon data-icon="inline-start" />
        )}
        {isCopied ? "Copied" : "Copy page"}
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="outline"
              size="icon-sm"
              className="size-8"
              aria-label="More page actions"
            />
          }
        >
          <ChevronDownIcon />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-52 [&_svg]:text-muted-foreground"
        >
          <DropdownMenuGroup>
            {Object.entries(menuItems).map(([key, item]) => (
              <DropdownMenuItem key={key} render={item(url)} />
            ))}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </ButtonGroup>
  )
}
