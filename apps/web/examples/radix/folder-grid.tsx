import { LockIcon, StarIcon } from "@fabricator-ui/icons"

import {
  Folder,
  FolderCover,
  FolderDescription,
  FolderFile,
  FolderFiles,
  FolderPreview,
  FolderTitle,
} from "@/styles/radix-fabricator/ui/folder"

const FOLDERS = [
  {
    name: "Contracts",
    details: "12 files",
    files: 3,
    color: "blue",
    locked: true,
  },
  { name: "Invoices 2026", details: "48 files", files: 3, color: "green" },
  {
    name: "Brand assets",
    details: "31 files",
    files: 2,
    color: "pink",
    starred: true,
  },
  { name: "Meeting notes", details: "1 file", files: 1 },
  {
    name: "Quarterly planning and roadmap reviews",
    details: "7 files",
    files: 3,
    color: "orange",
  },
  { name: "Archive", details: "Empty", files: 0 },
]

export function FolderGrid() {
  return (
    <div className="max-h-60 w-full scroll-fade scrollbar-none overflow-y-auto p-1">
      <div className="grid grid-cols-[repeat(auto-fill,minmax(8rem,1fr))] gap-1">
        {FOLDERS.map((folder) => (
          <Folder key={folder.name} color={folder.color} className="w-full">
            <FolderPreview>
              <FolderFiles>
                {Array.from({ length: folder.files }, (_, index) => (
                  <FolderFile key={index} />
                ))}
              </FolderFiles>
              {(folder.locked || folder.starred) && (
                <FolderCover className="justify-end">
                  {folder.locked && <LockIcon aria-label="Private" />}
                  {folder.starred && <StarIcon aria-label="Starred" />}
                </FolderCover>
              )}
            </FolderPreview>
            <FolderTitle title={folder.name}>
              <a href={`#${folder.name.toLowerCase().replaceAll(" ", "-")}`}>
                {folder.name}
              </a>
            </FolderTitle>
            <FolderDescription>{folder.details}</FolderDescription>
          </Folder>
        ))}
      </div>
    </div>
  )
}
