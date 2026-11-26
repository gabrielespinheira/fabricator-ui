import {
  Folder,
  FolderCover,
  FolderDescription,
  FolderFile,
  FolderFiles,
  FolderPreview,
  FolderTitle,
} from "@/styles/aria-fabricator/ui/folder"
import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarImage,
} from "@/styles/aria-nova/ui/avatar"
import { Badge } from "@/styles/aria-nova/ui/badge"

export function FolderDemo() {
  return (
    <div className="grid w-full max-w-lg grid-cols-2 gap-2">
      <Folder variant="glass" className="w-full">
        <FolderPreview>
          <FolderFiles>
            <FolderFile />
            <FolderFile />
          </FolderFiles>
          <FolderCover>
            <AvatarGroup>
              <Avatar size="sm">
                <AvatarImage
                  src="https://github.com/gabrielespinheira.png"
                  alt="@gabrielespinheira"
                />
                <AvatarFallback>GE</AvatarFallback>
              </Avatar>
              <Avatar size="sm">
                <AvatarFallback
                  style={{
                    background: "oklch(0.88 0.06 150)",
                    color: "oklch(0.36 0.09 150)",
                  }}
                >
                  MA
                </AvatarFallback>
              </Avatar>
            </AvatarGroup>
            <Badge variant="secondary">Updated 2h</Badge>
          </FolderCover>
        </FolderPreview>
        <FolderTitle>
          <a href="#onboarding">Onboarding</a>
        </FolderTitle>
        <FolderDescription>15 files · 3 folders</FolderDescription>
      </Folder>
      <Folder color="blue" className="w-full">
        <FolderPreview>
          <FolderFiles>
            <FolderFile className="p-[4cqw] text-[11cqw] leading-none font-semibold text-(--folder-paper-ink)">
              Aa
            </FolderFile>
            <FolderFile className="bg-warning" />
            <FolderFile className="bg-destructive" />
          </FolderFiles>
          <FolderCover className="justify-end">
            <Badge variant="secondary">v2.1</Badge>
          </FolderCover>
        </FolderPreview>
        <FolderTitle>
          <a href="#design-system">Design system</a>
        </FolderTitle>
        <FolderDescription>22 files · fonts and colours</FolderDescription>
      </Folder>
    </div>
  )
}
